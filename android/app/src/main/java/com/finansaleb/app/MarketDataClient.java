package com.finansaleb.app;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * APK içindeki piyasa veri istemcisi.
 *
 * WebView'in CORS kısıtlarına takılmaması için arama, fiyat, TEFAS ve temettü
 * istekleri Android'in yerel ağ katmanında gerçekleştirilir. Sonuçlar AppBridge
 * üzerinden JavaScript arayüzüne iletilir.
 */
final class MarketDataClient {
    private static final int CONNECT_TIMEOUT_MS = 10_000;
    private static final int READ_TIMEOUT_MS = 25_000;
    private static final double TROY_OUNCE = 31.1034768;
    private static final String USER_AGENT =
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 " +
            "Chrome/126.0 Mobile Safari/537.36 FinansalEB/0.2";

    private MarketDataClient() {}

    static JSONObject execute(String action, JSONObject params) throws Exception {
        String normalized = action == null ? "" : action.trim().toLowerCase(Locale.ROOT);
        JSONObject data;
        switch (normalized) {
            case "search" -> data = searchAssets(
                    params.optString("query", ""),
                    params.optString("type", "BIST")
            );
            case "quote" -> data = quoteByType(
                    params.optString("symbol", ""),
                    params.optString("type", "BIST")
            );
            case "tefas" -> data = tefasQuote(params.optString("code", params.optString("symbol", "")));
            case "dividends" -> data = yahooDividends(params.optString("symbol", ""));
            case "backendcontent" -> data = backendContent(
                    params.optString("backendUrl", ""),
                    params.optString("backendToken", "")
            );
            default -> throw new IllegalArgumentException("Bilinmeyen piyasa işlemi: " + normalized);
        }
        return new JSONObject().put("ok", true).put("data", data);
    }

    private static JSONObject searchAssets(String rawQuery, String rawType) throws Exception {
        String query = rawQuery == null ? "" : rawQuery.trim();
        String type = rawType == null ? "BIST" : rawType.trim().toUpperCase(Locale.ROOT);
        if (query.length() < 2) throw new IllegalArgumentException("Arama için en az 2 karakter yazın");

        if ("TEFAS".equals(type)) {
            String code = query.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
            if (code.length() < 3) throw new IllegalArgumentException("TEFAS fon kodunu en az 3 karakter yazın");
            JSONObject quote = tefasQuote(code);
            JSONArray results = new JSONArray().put(new JSONObject()
                    .put("symbol", code)
                    .put("sourceSymbol", code)
                    .put("name", quote.optString("name", code))
                    .put("type", "TEFAS")
                    .put("currency", "TRY")
                    .put("price", quote.optDouble("price", 0))
                    .put("prevClose", quote.optDouble("prevClose", 0))
                    .put("changePct", quote.optDouble("changePct", 0))
                    .put("source", quote.optString("source", "TEFAS")));
            return new JSONObject().put("results", results).put("query", query).put("type", type);
        }

        if ("GOLD".equals(type)) {
            JSONObject q = quoteByType("GRAM_ALTIN", "GOLD");
            return singleResult("GRAM ALTIN", "GRAM_ALTIN", "Gram Altın", "GOLD", "TRY", q);
        }
        if ("SILVER".equals(type)) {
            JSONObject q = quoteByType("GRAM_GUMUS", "SILVER");
            return singleResult("GRAM GÜMÜŞ", "GRAM_GUMUS", "Gram Gümüş", "SILVER", "TRY", q);
        }
        if ("FX".equals(type)) {
            String compact = query.toUpperCase(Locale.ROOT).replace("/", "").replace(" ", "");
            String source = switch (compact) {
                case "USD", "USDTRY" -> "TRY=X";
                case "EUR", "EURTRY" -> "EURTRY=X";
                case "GBP", "GBPTRY" -> "GBPTRY=X";
                default -> compact.endsWith("=X") ? compact : compact + "=X";
            };
            JSONObject q = yahooQuote(source);
            String symbol = source.equals("TRY=X") ? "USD/TRY" : source.replace("TRY=X", "/TRY");
            return singleResult(symbol, source, symbol + " Kuru", "FX", "TRY", q);
        }

        JSONObject root = yahooJson("/v1/finance/search?q=" + enc(query)
                + "&quotesCount=15&newsCount=0&listsCount=0&enableFuzzyQuery=true");
        JSONArray quotes = root.optJSONArray("quotes");
        JSONArray results = new JSONArray();
        if (quotes != null) {
            for (int i = 0; i < quotes.length() && results.length() < 10; i++) {
                JSONObject item = quotes.optJSONObject(i);
                if (item == null) continue;
                String sourceSymbol = item.optString("symbol", "").trim().toUpperCase(Locale.ROOT);
                String quoteType = item.optString("quoteType", "").toUpperCase(Locale.ROOT);
                String exchange = item.optString("exchange", item.optString("exchDisp", ""));
                String currency = item.optString("currency", "");
                if (sourceSymbol.isEmpty() || !matchesType(type, sourceSymbol, quoteType, exchange, currency)) continue;

                String displaySymbol = "BIST".equals(type) && sourceSymbol.endsWith(".IS")
                        ? sourceSymbol.substring(0, sourceSymbol.length() - 3)
                        : sourceSymbol;
                String name = firstNonBlank(
                        item.optString("longname", ""),
                        item.optString("shortname", ""),
                        displaySymbol
                );
                JSONObject result = new JSONObject()
                        .put("symbol", displaySymbol)
                        .put("sourceSymbol", sourceSymbol)
                        .put("name", name)
                        .put("type", type)
                        .put("currency", currency.isEmpty() ? defaultCurrency(type) : currency)
                        .put("exchange", exchange)
                        .put("price", item.optDouble("regularMarketPrice", 0))
                        .put("prevClose", item.optDouble("regularMarketPreviousClose", 0))
                        .put("changePct", item.optDouble("regularMarketChangePercent", 0))
                        .put("source", "Piyasa sembol araması");
                results.put(result);
            }
        }

        // Arama uç noktası sonuç vermese bile girilen kesin sembolü fiyatla doğrula.
        if (results.length() == 0) {
            String display = query.toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
            String source = inferSourceSymbol(display, type);
            try {
                JSONObject q = quoteByType(source, type);
                results.put(new JSONObject()
                        .put("symbol", "BIST".equals(type) && source.endsWith(".IS")
                                ? source.substring(0, source.length() - 3) : display)
                        .put("sourceSymbol", source)
                        .put("name", q.optString("name", display))
                        .put("type", type)
                        .put("currency", q.optString("currency", defaultCurrency(type)))
                        .put("price", q.optDouble("price", 0))
                        .put("prevClose", q.optDouble("prevClose", 0))
                        .put("changePct", q.optDouble("changePct", 0))
                        .put("source", q.optString("source", "Piyasa verisi")));
            } catch (Exception ignored) {
                // Kullanıcıya boş sonuç dönülür; hatalı sembol otomatik kaydedilmez.
            }
        }

        return new JSONObject().put("results", results).put("query", query).put("type", type);
    }

    private static JSONObject singleResult(String symbol, String sourceSymbol, String name,
                                           String type, String currency, JSONObject quote) throws Exception {
        JSONObject item = new JSONObject()
                .put("symbol", symbol)
                .put("sourceSymbol", sourceSymbol)
                .put("name", name)
                .put("type", type)
                .put("currency", currency)
                .put("price", quote.optDouble("price", 0))
                .put("prevClose", quote.optDouble("prevClose", 0))
                .put("changePct", quote.optDouble("changePct", 0))
                .put("source", quote.optString("source", "Otomatik veri"));
        return new JSONObject().put("results", new JSONArray().put(item)).put("type", type);
    }

    private static boolean matchesType(String type, String symbol, String quoteType,
                                       String exchange, String currency) {
        String ex = exchange == null ? "" : exchange.toUpperCase(Locale.ROOT);
        return switch (type) {
            case "BIST" -> symbol.endsWith(".IS") || ex.contains("IST") || ex.contains("BIST");
            case "ETF" -> quoteType.equals("ETF");
            case "US" -> quoteType.equals("EQUITY") && !symbol.endsWith(".IS")
                    && (currency.isEmpty() || currency.equalsIgnoreCase("USD"));
            case "CRYPTO" -> quoteType.contains("CRYPTO") || symbol.endsWith("-USD");
            default -> true;
        };
    }

    private static String defaultCurrency(String type) {
        return switch (type) {
            case "BIST", "TEFAS", "GOLD", "SILVER", "FX", "CASH", "CUSTOM" -> "TRY";
            default -> "USD";
        };
    }

    private static JSONObject quoteByType(String rawSymbol, String rawType) throws Exception {
        String type = rawType == null ? "" : rawType.trim().toUpperCase(Locale.ROOT);
        String symbol = rawSymbol == null ? "" : rawSymbol.trim().toUpperCase(Locale.ROOT);
        if (symbol.isEmpty()) throw new IllegalArgumentException("Sembol boş olamaz");
        if ("TEFAS".equals(type)) return tefasQuote(symbol.replaceAll("[^A-Z0-9]", ""));
        if ("CUSTOM".equals(type) || "CASH".equals(type) || "BOND".equals(type)) {
            throw new IllegalArgumentException("Bu varlık türü manuel fiyat gerektirir");
        }
        if ("GOLD".equals(type) || "GRAM_ALTIN".equals(symbol)) {
            return compositeMetal(yahooQuote("GC=F"), yahooQuote("TRY=X"), "Altın ons + USD/TRY");
        }
        if ("SILVER".equals(type) || "GRAM_GUMUS".equals(symbol)) {
            return compositeMetal(yahooQuote("SI=F"), yahooQuote("TRY=X"), "Gümüş ons + USD/TRY");
        }
        return yahooQuote(inferSourceSymbol(symbol, type));
    }

    private static JSONObject yahooQuote(String symbol) throws Exception {
        JSONObject json = yahooJson("/v8/finance/chart/" + enc(symbol)
                + "?interval=1d&range=1mo&events=div%2Csplits&includeAdjustedClose=true");
        JSONObject chart = json.optJSONObject("chart");
        JSONArray resultArray = chart == null ? null : chart.optJSONArray("result");
        if (resultArray == null || resultArray.length() == 0) {
            JSONObject error = chart == null ? null : chart.optJSONObject("error");
            throw new IllegalStateException(error == null ? "Piyasa verisi bulunamadı"
                    : error.optString("description", "Piyasa verisi bulunamadı"));
        }
        JSONObject result = resultArray.getJSONObject(0);
        JSONObject meta = result.optJSONObject("meta");
        if (meta == null) throw new IllegalStateException("Fiyat metası bulunamadı");

        JSONObject indicators = result.optJSONObject("indicators");
        JSONArray quoteArrays = indicators == null ? null : indicators.optJSONArray("quote");
        JSONObject quoteBlock = quoteArrays == null ? null : quoteArrays.optJSONObject(0);
        JSONArray closesJson = quoteBlock == null ? null : quoteBlock.optJSONArray("close");
        List<Double> closes = new ArrayList<>();
        if (closesJson != null) {
            for (int i = 0; i < closesJson.length(); i++) {
                double value = closesJson.optDouble(i, Double.NaN);
                if (Double.isFinite(value)) closes.add(value);
            }
        }
        double fallback = closes.isEmpty() ? 0 : closes.get(closes.size() - 1);
        double price = meta.optDouble("regularMarketPrice", fallback);
        double previous = meta.optDouble("chartPreviousClose",
                meta.optDouble("previousClose", closes.size() > 1 ? closes.get(closes.size() - 2) : price));
        if (!(price > 0)) throw new IllegalStateException("Geçerli fiyat alınamadı");

        JSONArray history = new JSONArray();
        for (Double close : closes) history.put(close);
        JSONArray dividends = chartDividendArray(result);
        return new JSONObject()
                .put("symbol", symbol)
                .put("name", firstNonBlank(meta.optString("shortName", ""), meta.optString("longName", ""), symbol))
                .put("price", price)
                .put("prevClose", previous > 0 ? previous : price)
                .put("changePct", previous > 0 ? ((price - previous) / previous) * 100 : 0)
                .put("currency", meta.optString("currency", ""))
                .put("exchange", meta.optString("exchangeName", ""))
                .put("history", history)
                .put("dividends", dividends)
                .put("source", "Gecikmeli piyasa verisi")
                .put("updatedAt", System.currentTimeMillis());
    }

    private static JSONObject yahooDividends(String rawSymbol) throws Exception {
        String symbol = rawSymbol == null ? "" : rawSymbol.trim().toUpperCase(Locale.ROOT);
        if (symbol.isEmpty()) throw new IllegalArgumentException("Sembol boş olamaz");
        long now = System.currentTimeMillis() / 1000L;
        long period1 = now - (long) (8 * 365.25 * 24 * 60 * 60);
        long period2 = now + 400L * 24 * 60 * 60;
        JSONObject json = yahooJson("/v8/finance/chart/" + enc(symbol)
                + "?period1=" + period1 + "&period2=" + period2
                + "&interval=1d&events=div%2Csplits");
        JSONObject chart = json.optJSONObject("chart");
        JSONArray resultArray = chart == null ? null : chart.optJSONArray("result");
        if (resultArray == null || resultArray.length() == 0) {
            throw new IllegalStateException("Temettü verisi bulunamadı");
        }
        JSONObject result = resultArray.getJSONObject(0);
        JSONArray raw = chartDividendArray(result);
        JSONArray events = new JSONArray();
        long today = System.currentTimeMillis();
        for (int i = 0; i < raw.length(); i++) {
            JSONObject item = raw.getJSONObject(i);
            long time = item.optLong("timestamp", 0) * 1000L;
            events.put(new JSONObject()
                    .put("exDate", item.optString("date", ""))
                    .put("payDate", JSONObject.NULL)
                    .put("amountPerShare", item.optDouble("amount", 0))
                    .put("status", time > today ? "confirmed" : "historical")
                    .put("source", "Piyasa veri akışı"));
        }
        JSONObject meta = result.optJSONObject("meta");
        return new JSONObject()
                .put("symbol", symbol)
                .put("currency", meta == null ? "" : meta.optString("currency", ""))
                .put("events", events)
                .put("source", "Piyasa veri akışı");
    }

    private static JSONArray chartDividendArray(JSONObject result) throws Exception {
        List<JSONObject> items = new ArrayList<>();
        JSONObject events = result.optJSONObject("events");
        JSONObject dividends = events == null ? null : events.optJSONObject("dividends");
        if (dividends != null) {
            JSONArray names = dividends.names();
            if (names != null) {
                for (int i = 0; i < names.length(); i++) {
                    JSONObject event = dividends.optJSONObject(names.optString(i));
                    if (event == null) continue;
                    long timestamp = event.optLong("date", 0);
                    double amount = event.optDouble("amount", 0);
                    if (timestamp <= 0 || amount <= 0) continue;
                    items.add(new JSONObject()
                            .put("date", isoDate(timestamp * 1000L))
                            .put("timestamp", timestamp)
                            .put("amount", amount));
                }
            }
        }
        Collections.sort(items, Comparator.comparingLong(o -> o.optLong("timestamp", 0)));
        JSONArray out = new JSONArray();
        for (JSONObject item : items) out.put(item);
        return out;
    }

    private static JSONObject tefasQuote(String rawCode) throws Exception {
        String code = rawCode == null ? "" : rawCode.replaceAll("[^A-Za-z0-9]", "")
                .toUpperCase(Locale.ROOT);
        if (code.length() < 2) throw new IllegalArgumentException("Geçerli fon kodu yazın");

        Calendar end = Calendar.getInstance();
        Calendar start = (Calendar) end.clone();
        start.add(Calendar.DAY_OF_YEAR, -30);
        SimpleDateFormat format = new SimpleDateFormat("dd.MM.yyyy", Locale.US);
        String body = "fontip=YAT&bastarih=" + enc(format.format(start.getTime()))
                + "&bittarih=" + enc(format.format(end.getTime()))
                + "&fonkod=" + enc(code);
        JSONObject root = postFormJson("https://www.tefas.gov.tr/api/DB/BindHistoryInfo", body,
                new String[][]{
                        {"X-Requested-With", "XMLHttpRequest"},
                        {"Referer", "https://www.tefas.gov.tr/TarihselVeriler.aspx"},
                        {"Origin", "https://www.tefas.gov.tr"}
                });
        JSONArray rows = root.optJSONArray("data");
        if (rows == null || rows.length() == 0) {
            throw new IllegalStateException(code + " için TEFAS kaydı bulunamadı");
        }

        List<TefasPoint> points = new ArrayList<>();
        String name = code;
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row == null) continue;
            double price = localeDouble(row.opt("FIYAT"));
            if (!Double.isFinite(price) || price <= 0) continue;
            long timestamp = tefasTimestamp(row.opt("TARIH"));
            String rowName = firstNonBlank(row.optString("FONUNVAN", ""), row.optString("FONUNVANI", ""));
            if (!rowName.isEmpty()) name = rowName;
            points.add(new TefasPoint(timestamp, price));
        }
        if (points.isEmpty()) throw new IllegalStateException("TEFAS fiyatları ayrıştırılamadı");
        points.sort(Comparator.comparingLong(point -> point.timestamp));
        TefasPoint last = points.get(points.size() - 1);
        TefasPoint previous = points.size() > 1 ? points.get(points.size() - 2) : last;
        JSONArray history = new JSONArray();
        JSONArray dates = new JSONArray();
        for (TefasPoint point : points) {
            history.put(point.price);
            dates.put(point.timestamp > 0 ? isoDate(point.timestamp) : JSONObject.NULL);
        }
        return new JSONObject()
                .put("symbol", code)
                .put("name", name)
                .put("price", last.price)
                .put("prevClose", previous.price)
                .put("changePct", previous.price > 0 ? ((last.price - previous.price) / previous.price) * 100 : 0)
                .put("currency", "TRY")
                .put("history", history)
                .put("dates", dates)
                .put("dividends", new JSONArray())
                .put("source", "TEFAS tarihsel veri")
                .put("updatedAt", System.currentTimeMillis());
    }

    private static JSONObject compositeMetal(JSONObject metal, JSONObject tryFx, String source) throws Exception {
        double price = metal.optDouble("price", 0) * tryFx.optDouble("price", 0) / TROY_OUNCE;
        double previous = metal.optDouble("prevClose", 0) * tryFx.optDouble("prevClose", 0) / TROY_OUNCE;
        JSONArray metalHistory = metal.optJSONArray("history");
        JSONArray fxHistory = tryFx.optJSONArray("history");
        JSONArray history = new JSONArray();
        if (metalHistory != null) {
            for (int i = 0; i < metalHistory.length(); i++) {
                double fx = fxHistory != null && i < fxHistory.length()
                        ? fxHistory.optDouble(i, tryFx.optDouble("price", 1))
                        : tryFx.optDouble("price", 1);
                history.put(metalHistory.optDouble(i, 0) * fx / TROY_OUNCE);
            }
        }
        return new JSONObject()
                .put("price", price)
                .put("prevClose", previous)
                .put("changePct", previous > 0 ? ((price - previous) / previous) * 100 : 0)
                .put("currency", "TRY")
                .put("history", history)
                .put("dividends", new JSONArray())
                .put("source", source)
                .put("updatedAt", System.currentTimeMillis());
    }

    private static JSONObject yahooJson(String path) throws Exception {
        Exception first = null;
        for (String host : new String[]{"https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"}) {
            try {
                return getJson(host + path, null);
            } catch (Exception error) {
                if (first == null) first = error;
            }
        }
        throw first == null ? new IllegalStateException("Piyasa servisine erişilemedi") : first;
    }

    private static JSONObject backendContent(String backendUrl, String backendToken) throws Exception {
        String base = backendUrl == null ? "" : backendUrl.trim();
        if (!(base.startsWith("https://") || base.startsWith("http://"))) {
            throw new IllegalArgumentException("Geçerli sunucu adresi bulunamadı");
        }
        String separator = base.contains("?") ? "&" : "?";
        String url = base + separator + "action=content";
        String[][] headers = (backendToken == null || backendToken.trim().isEmpty())
                ? null : new String[][]{{"X-Api-Token", backendToken.trim()}};
        JSONObject root = getJson(url, headers);
        if (!root.optBoolean("ok", false)) {
            throw new IllegalStateException(root.optString("error", "İçerik alınamadı"));
        }
        JSONObject data = root.optJSONObject("data");
        if (data == null) throw new IllegalStateException("Sunucu içerik verisi döndürmedi");
        return data;
    }

    private static JSONObject getJson(String url, String[][] extraHeaders) throws Exception {
        HttpURLConnection connection = open(url, "GET", extraHeaders);
        return readJson(connection);
    }

    private static JSONObject postFormJson(String url, String body, String[][] extraHeaders) throws Exception {
        HttpURLConnection connection = open(url, "POST", extraHeaders);
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        connection.setDoOutput(true);
        try (OutputStream output = connection.getOutputStream()) {
            output.write(body.getBytes(StandardCharsets.UTF_8));
        }
        return readJson(connection);
    }

    private static HttpURLConnection open(String urlText, String method, String[][] extraHeaders) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlText).openConnection();
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setRequestMethod(method);
        connection.setRequestProperty("Accept", "application/json,text/plain,*/*");
        connection.setRequestProperty("Accept-Language", "tr-TR,tr;q=0.9,en;q=0.7");
        connection.setRequestProperty("User-Agent", USER_AGENT);
        connection.setUseCaches(false);
        if (extraHeaders != null) {
            for (String[] header : extraHeaders) {
                if (header != null && header.length == 2) connection.setRequestProperty(header[0], header[1]);
            }
        }
        return connection;
    }

    private static JSONObject readJson(HttpURLConnection connection) throws Exception {
        int code = connection.getResponseCode();
        InputStream stream = code >= 200 && code < 300
                ? connection.getInputStream() : connection.getErrorStream();
        String text = readAll(stream);
        connection.disconnect();
        if (code < 200 || code >= 300) {
            throw new IllegalStateException("Veri kaynağı HTTP " + code);
        }
        return new JSONObject(text);
    }

    private static String readAll(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder text = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) text.append(line);
        }
        return text.toString();
    }

    private static String inferSourceSymbol(String raw, String type) {
        String symbol = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        if ("BIST".equals(type)) return symbol.endsWith(".IS") ? symbol : symbol + ".IS";
        if ("CRYPTO".equals(type)) return symbol.contains("-") ? symbol : symbol + "-USD";
        return symbol;
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) return value.trim();
        }
        return "";
    }

    private static double localeDouble(Object value) {
        if (value == null || value == JSONObject.NULL) return Double.NaN;
        if (value instanceof Number number) return number.doubleValue();
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) return Double.NaN;
        if (text.contains(",")) text = text.replace(".", "").replace(',', '.');
        try { return Double.parseDouble(text); }
        catch (NumberFormatException ignored) { return Double.NaN; }
    }

    private static long tefasTimestamp(Object value) {
        if (value == null || value == JSONObject.NULL) return 0;
        if (value instanceof Number number) {
            long timestamp = number.longValue();
            return timestamp < 10_000_000_000L ? timestamp * 1000L : timestamp;
        }
        String text = String.valueOf(value);
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("Date\\((\\d+)").matcher(text);
        if (matcher.find()) {
            try { return Long.parseLong(matcher.group(1)); }
            catch (NumberFormatException ignored) { return 0; }
        }
        for (String pattern : new String[]{"yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd", "dd.MM.yyyy"}) {
            try { return new SimpleDateFormat(pattern, Locale.US).parse(text).getTime(); }
            catch (Exception ignored) { }
        }
        return 0;
    }

    private static String isoDate(long millis) {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(millis));
    }

    private static String enc(String value) {
        try { return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8.name()); }
        catch (Exception ignored) { return value == null ? "" : value; }
    }

    private static final class TefasPoint {
        final long timestamp;
        final double price;
        TefasPoint(long timestamp, double price) {
            this.timestamp = timestamp;
            this.price = price;
        }
    }
}
