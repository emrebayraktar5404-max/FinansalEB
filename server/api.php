<?php
declare(strict_types=1);

/**
 * Finansal(EB) kişisel veri uç noktası
 * PHP 8.1+, cURL, DOM ve mbstring önerilir.
 *
 * İşlevler:
 *   ?action=health
 *   ?action=search&query=DEVA&type=BIST
 *   ?action=quote&symbol=TUPRS.IS&type=BIST
 *   ?action=tefas&code=TMG
 *   ?action=dividends&symbol=SCHD
 *   ?action=kap_dividends&symbol=TUPRS
 *   ?action=batch&items=[{"symbol":"TUPRS.IS","type":"BIST"}]
 */

const APP_VERSION = '0.3.9';

$configFile = __DIR__ . '/config.php';
$config = is_file($configFile) ? require $configFile : [
    'API_TOKEN' => '',
    'ALLOWED_ORIGINS' => ['*'],
    'CACHE_DIR' => __DIR__ . '/cache',
    'QUOTE_CACHE_SECONDS' => 900,
    'TEFAS_CACHE_SECONDS' => 1800,
    'DIVIDEND_CACHE_SECONDS' => 21600,
    'ENABLE_KAP_SCRAPER' => true,
    'TIMEZONE' => 'Europe/Istanbul',
    'USER_AGENT' => 'FinansalEB/0.3.9 (personal portfolio tracker)',
    'SEC_USER_AGENT' => '',
];

$config = array_merge([
    'API_TOKEN' => '',
    'ALLOWED_ORIGINS' => ['*'],
    'CACHE_DIR' => __DIR__ . '/cache',
    'QUOTE_CACHE_SECONDS' => 900,
    'TEFAS_CACHE_SECONDS' => 1800,
    'DIVIDEND_CACHE_SECONDS' => 21600,
    'ENABLE_KAP_SCRAPER' => true,
    'TIMEZONE' => 'Europe/Istanbul',
    'USER_AGENT' => 'FinansalEB/0.3.9 (personal portfolio tracker)',
    'SEC_USER_AGENT' => '',
], $config);

date_default_timezone_set((string)$config['TIMEZONE']);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

applyCors((array)$config['ALLOWED_ORIGINS']);
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

verifyToken((string)$config['API_TOKEN']);
ensureCacheDir((string)$config['CACHE_DIR']);

$action = strtolower(trim((string)($_GET['action'] ?? 'health')));

try {
    switch ($action) {
        case 'health':
            respond([
                'ok' => true,
                'service' => 'Finansal(EB) API',
                'version' => APP_VERSION,
                'time' => date(DATE_ATOM),
                'php' => PHP_VERSION,
                'capabilities' => [
                    'search' => true,
                    'quotes' => true,
                    'tefas' => function_exists('curl_init'),
                    'kap_best_effort' => (bool)$config['ENABLE_KAP_SCRAPER'],
                    'cache' => is_writable((string)$config['CACHE_DIR']),
                ],
            ]);
            break;

        case 'search':
            $query = trim((string)($_GET['query'] ?? ''));
            $type = strtoupper(trim((string)($_GET['type'] ?? 'BIST')));
            if (mb_strlen($query) < 2) fail('query en az 2 karakter olmalıdır', 422);
            $data = cached(
                'search_' . $type . '_' . $query,
                1800,
                fn() => searchAssets($query, $type, $config)
            );
            respond(['ok' => true, 'data' => $data]);
            break;

        case 'quote':
            $symbol = cleanSymbol((string)($_GET['symbol'] ?? ''));
            $type = strtoupper(trim((string)($_GET['type'] ?? '')));
            if ($symbol === '') fail('symbol zorunludur', 422);
            $data = cached(
                'quote_' . $type . '_' . $symbol,
                (int)$config['QUOTE_CACHE_SECONDS'],
                fn() => quoteByType($symbol, $type, $config)
            );
            respond(['ok' => true, 'data' => $data]);
            break;

        case 'tefas':
            $code = strtoupper(preg_replace('/[^A-Z0-9]/', '', (string)($_GET['code'] ?? '')));
            if ($code === '') fail('code zorunludur', 422);
            $data = cached(
                'tefas_' . $code,
                (int)$config['TEFAS_CACHE_SECONDS'],
                fn() => fetchTefas($code, $config)
            );
            respond(['ok' => true, 'data' => $data]);
            break;

        case 'fund_fees':
            $code = strtoupper(preg_replace('/[^A-Z0-9]/', '', (string)($_GET['code'] ?? '')));
            $name = trim((string)($_GET['name'] ?? ''));
            if ($code === '') fail('code zorunludur', 422);
            $data = cached(
                'fund_fees_' . $code,
                86400,
                fn() => fetchKapFundFees($code, $name, $config)
            );
            respond(['ok' => true, 'data' => $data]);
            break;

        case 'dividends':
            $symbol = cleanSymbol((string)($_GET['symbol'] ?? ''));
            if ($symbol === '') fail('symbol zorunludur', 422);
            $data = cached(
                'dividends_' . $symbol,
                (int)$config['DIVIDEND_CACHE_SECONDS'],
                fn() => fetchYahooDividends($symbol, $config)
            );
            respond(['ok' => true, 'data' => $data]);
            break;

        case 'kap_dividends':
            if (!(bool)$config['ENABLE_KAP_SCRAPER']) fail('KAP bağdaştırıcısı kapalı', 403);
            $symbol = strtoupper(preg_replace('/[^A-Z0-9]/', '', (string)($_GET['symbol'] ?? '')));
            if ($symbol === '') fail('symbol zorunludur', 422);
            $data = cached(
                'kap_dividends_' . $symbol,
                (int)$config['DIVIDEND_CACHE_SECONDS'],
                fn() => fetchKapDividends($symbol, $config)
            );
            respond(['ok' => true, 'data' => $data]);
            break;

        case 'content':
            $data = cached('content_v11', 900, fn() => fetchContentBundle($config));
            respond(['ok' => true, 'data' => $data]);
            break;

        case 'batch':
            $raw = (string)($_GET['items'] ?? '');
            $items = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
            if (!is_array($items) || count($items) > 30) fail('items 1-30 kayıt içermelidir', 422);
            $results = [];
            foreach ($items as $item) {
                $symbol = cleanSymbol((string)($item['symbol'] ?? ''));
                $type = strtoupper(trim((string)($item['type'] ?? '')));
                if ($symbol === '') continue;
                try {
                    $results[] = [
                        'symbol' => $symbol,
                        'ok' => true,
                        'data' => cached(
                            'quote_' . $type . '_' . $symbol,
                            (int)$config['QUOTE_CACHE_SECONDS'],
                            fn() => quoteByType($symbol, $type, $config)
                        ),
                    ];
                } catch (Throwable $e) {
                    $results[] = ['symbol' => $symbol, 'ok' => false, 'error' => $e->getMessage()];
                }
            }
            respond(['ok' => true, 'data' => $results]);
            break;

        default:
            fail('Bilinmeyen action', 404);
    }
} catch (JsonException $e) {
    fail('Geçersiz JSON: ' . $e->getMessage(), 422);
} catch (Throwable $e) {
    error_log('[FinansalEB] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    fail($e->getMessage(), 502);
}

function applyCors(array $origins): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array('*', $origins, true)) {
        header('Access-Control-Allow-Origin: *');
    } elseif ($origin !== '' && in_array($origin, $origins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Api-Token');
}

function verifyToken(string $expected): void
{
    if ($expected === '' || str_starts_with($expected, 'BURAYA_')) return;
    $provided = (string)($_GET['token'] ?? ($_SERVER['HTTP_X_API_TOKEN'] ?? ''));
    if (!hash_equals($expected, $provided)) fail('Yetkisiz erişim', 401);
}

function ensureCacheDir(string $dir): void
{
    if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
        throw new RuntimeException('Cache klasörü oluşturulamadı');
    }
}

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fail(string $message, int $status = 400): never
{
    respond(['ok' => false, 'error' => $message], $status);
}

function cleanSymbol(string $symbol): string
{
    $symbol = strtoupper(trim($symbol));
    return preg_replace('/[^A-Z0-9.=_\-]/', '', $symbol) ?? '';
}

function cached(string $key, int $ttl, callable $factory): mixed
{
    global $config;
    $file = rtrim((string)$config['CACHE_DIR'], DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . hash('sha256', $key) . '.json';
    if (is_file($file) && (time() - filemtime($file)) < max(1, $ttl)) {
        $payload = json_decode((string)file_get_contents($file), true);
        if (is_array($payload) && array_key_exists('value', $payload)) return $payload['value'];
    }
    try {
        $value = $factory();
        $temp = $file . '.' . uniqid('', true) . '.tmp';
        @file_put_contents($temp, json_encode(['savedAt' => time(), 'value' => $value], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
        @rename($temp, $file);
        return $value;
    } catch (Throwable $e) {
        // Kaynak geçici olarak kapalıysa süresi dolmuş son değeri döndür.
        if (is_file($file)) {
            $payload = json_decode((string)file_get_contents($file), true);
            if (is_array($payload) && array_key_exists('value', $payload)) {
                $value = $payload['value'];
                if (is_array($value)) {
                    $value['stale'] = true;
                    $value['warning'] = 'Kaynağa erişilemedi; son başarılı kayıt gösteriliyor.';
                }
                return $value;
            }
        }
        throw $e;
    }
}

function httpRequest(string $url, array $options, array $config): array
{
    if (!function_exists('curl_init')) throw new RuntimeException('cURL uzantısı etkin değil');
    $method = strtoupper((string)($options['method'] ?? 'GET'));
    $headers = array_merge([
        'Accept: application/json,text/html;q=0.9,*/*;q=0.8',
        'Accept-Language: tr-TR,tr;q=0.9,en;q=0.7',
        'Cache-Control: no-cache',
    ], $options['headers'] ?? []);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 5,
        CURLOPT_CONNECTTIMEOUT => (int)($options['connectTimeout'] ?? 4),
        CURLOPT_TIMEOUT => (int)($options['timeout'] ?? 7),
        CURLOPT_ENCODING => '',
        CURLOPT_USERAGENT => (string)$config['USER_AGENT'],
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_HEADER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $options['body'] ?? '');
    }
    $raw = curl_exec($ch);
    if ($raw === false) {
        $message = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('HTTP isteği başarısız: ' . $message);
    }
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $headerSize = (int)curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $body = substr($raw, $headerSize);
    $contentType = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $effectiveUrl = (string)curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    curl_close($ch);
    if ($status < 200 || $status >= 300) throw new RuntimeException('Kaynak HTTP ' . $status . ' döndürdü');
    return ['status' => $status, 'body' => $body, 'contentType' => $contentType, 'effectiveUrl' => $effectiveUrl];
}

function getJson(string $url, array $config): array
{
    $res = httpRequest($url, [], $config);
    $json = json_decode($res['body'], true, flags: JSON_THROW_ON_ERROR);
    if (!is_array($json)) throw new RuntimeException('JSON yanıtı geçersiz');
    return $json;
}

function searchAssets(string $query, string $type, array $config): array
{
    $type = strtoupper(trim($type));
    if ($type === 'TEFAS') {
        $code = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $query) ?? '');
        if (strlen($code) < 3) throw new RuntimeException('TEFAS fon kodunu en az 3 karakter yazın');
        $quote = fetchTefas($code, $config);
        return ['query' => $query, 'type' => $type, 'results' => [[
            'symbol' => $code,
            'sourceSymbol' => $code,
            'name' => $quote['name'] ?? $code,
            'type' => 'TEFAS',
            'currency' => 'TRY',
            'price' => $quote['price'] ?? 0,
            'prevClose' => $quote['prevClose'] ?? 0,
            'changePct' => $quote['changePct'] ?? 0,
            'source' => $quote['source'] ?? 'TEFAS',
        ]]];
    }

    $json = getJson(
        'https://query1.finance.yahoo.com/v1/finance/search?q=' . rawurlencode($query)
        . '&quotesCount=15&newsCount=0&listsCount=0&enableFuzzyQuery=true',
        $config
    );
    $results = [];
    foreach (($json['quotes'] ?? []) as $item) {
        if (!is_array($item)) continue;
        $source = strtoupper((string)($item['symbol'] ?? ''));
        $quoteType = strtoupper((string)($item['quoteType'] ?? ''));
        $exchange = strtoupper((string)($item['exchange'] ?? $item['exchDisp'] ?? ''));
        $currency = strtoupper((string)($item['currency'] ?? ''));
        if ($source === '') continue;
        $match = match ($type) {
            'BIST' => str_ends_with($source, '.IS') || str_contains($exchange, 'IST') || str_contains($exchange, 'BIST'),
            'ETF' => $quoteType === 'ETF',
            'US' => $quoteType === 'EQUITY' && !str_ends_with($source, '.IS') && ($currency === '' || $currency === 'USD'),
            'CRYPTO' => str_contains($quoteType, 'CRYPTO') || str_ends_with($source, '-USD'),
            'FX' => $quoteType === 'CURRENCY',
            default => true,
        };
        if (!$match) continue;
        $display = $type === 'BIST' && str_ends_with($source, '.IS') ? substr($source, 0, -3) : $source;
        $results[] = [
            'symbol' => $display,
            'sourceSymbol' => $source,
            'name' => $item['longname'] ?? $item['shortname'] ?? $display,
            'type' => $type,
            'currency' => $currency ?: ($type === 'BIST' ? 'TRY' : 'USD'),
            'exchange' => $item['exchange'] ?? $item['exchDisp'] ?? null,
            'price' => (float)($item['regularMarketPrice'] ?? 0),
            'prevClose' => (float)($item['regularMarketPreviousClose'] ?? 0),
            'changePct' => (float)($item['regularMarketChangePercent'] ?? 0),
            'source' => 'Piyasa sembol araması',
        ];
        if (count($results) >= 10) break;
    }
    return ['query' => $query, 'type' => $type, 'results' => $results];
}

function quoteByType(string $symbol, string $type, array $config): array
{
    if ($type === 'TEFAS') return fetchTefas(preg_replace('/[^A-Z0-9]/', '', $symbol) ?: $symbol, $config);
    if ($type === 'CUSTOM' || $type === 'CASH' || $type === 'BOND') {
        throw new RuntimeException('Bu varlık türü manuel fiyat gerektirir');
    }
    if ($symbol === 'GRAM_ALTIN' || $type === 'GOLD') {
        $gold = fetchYahooQuote('GC=F', $config);
        $try = fetchYahooQuote('TRY=X', $config);
        return compositeMetal($gold, $try, 'Altın ons + USD/TRY');
    }
    if ($symbol === 'GRAM_GUMUS' || $type === 'SILVER') {
        $silver = fetchYahooQuote('SI=F', $config);
        $try = fetchYahooQuote('TRY=X', $config);
        return compositeMetal($silver, $try, 'Gümüş ons + USD/TRY');
    }
    return fetchYahooQuote($symbol, $config);
}

function fetchYahooQuote(string $symbol, array $config): array
{
    $url = 'https://query1.finance.yahoo.com/v8/finance/chart/' . rawurlencode($symbol)
        . '?interval=1d&range=1mo&events=div%2Csplits&includeAdjustedClose=true';
    $json = getJson($url, $config);
    $result = $json['chart']['result'][0] ?? null;
    if (!is_array($result)) {
        $message = $json['chart']['error']['description'] ?? 'Piyasa verisi bulunamadı';
        throw new RuntimeException((string)$message);
    }
    $meta = $result['meta'] ?? [];
    $rawCloses = $result['indicators']['quote'][0]['close'] ?? [];
    $closes = array_values(array_filter(array_map(
        static fn($v) => is_numeric($v) ? (float)$v : null,
        is_array($rawCloses) ? $rawCloses : []
    ), static fn($v) => $v !== null));
    $price = (float)($meta['regularMarketPrice'] ?? (count($closes) ? $closes[array_key_last($closes)] : 0));
    if ($price <= 0) throw new RuntimeException('Geçerli fiyat alınamadı');
    $previous = (float)($meta['chartPreviousClose'] ?? $meta['previousClose'] ?? (count($closes) > 1 ? $closes[count($closes)-2] : $price));
    $dividends = [];
    foreach (($result['events']['dividends'] ?? []) as $event) {
        if (!is_array($event) || !isset($event['date'], $event['amount'])) continue;
        $dividends[] = [
            'date' => date('Y-m-d', (int)$event['date']),
            'amount' => (float)$event['amount'],
            'status' => (int)$event['date'] * 1000 > (int)(microtime(true) * 1000) ? 'confirmed' : 'historical',
            'source' => 'Piyasa veri akışı',
        ];
    }
    usort($dividends, static fn($a,$b) => strcmp($a['date'],$b['date']));
    return [
        'symbol' => $symbol,
        'price' => $price,
        'prevClose' => $previous ?: $price,
        'changePct' => $previous > 0 ? (($price - $previous) / $previous) * 100 : 0,
        'currency' => $meta['currency'] ?? null,
        'exchange' => $meta['exchangeName'] ?? null,
        'name' => $meta['shortName'] ?? $meta['longName'] ?? $symbol,
        'history' => array_slice($closes, -120),
        'timestamps' => $result['timestamp'] ?? [],
        'dividends' => $dividends,
        'source' => 'Gecikmeli piyasa verisi',
        'updatedAt' => date(DATE_ATOM),
    ];
}

function compositeMetal(array $metal, array $try, string $source): array
{
    $ounce = 31.1034768;
    $price = ((float)$metal['price'] * (float)$try['price']) / $ounce;
    $previous = ((float)$metal['prevClose'] * (float)$try['prevClose']) / $ounce;
    $metalHistory = $metal['history'] ?? [];
    $fxHistory = $try['history'] ?? [];
    $history = [];
    foreach ($metalHistory as $i => $v) {
        $fx = (float)($fxHistory[$i] ?? $try['price']);
        $history[] = ((float)$v * $fx) / $ounce;
    }
    return [
        'price' => $price,
        'prevClose' => $previous,
        'changePct' => $previous > 0 ? (($price-$previous)/$previous)*100 : 0,
        'currency' => 'TRY',
        'history' => $history,
        'dividends' => [],
        'source' => $source,
        'updatedAt' => date(DATE_ATOM),
    ];
}


function fetchContentBundle(array $config): array
{
    $queries = [
        ['q' => 'site:bloomberght.com Borsa İstanbul ekonomi piyasa', 'source' => 'Bloomberg HT'],
        ['q' => 'site:ekonomim.com Borsa İstanbul ekonomi piyasalar', 'source' => 'Ekonomim'],
        ['q' => 'site:foreks.com Borsa İstanbul piyasa haberleri', 'source' => 'Foreks'],
        ['q' => 'site:tr.investing.com Borsa İstanbul ekonomi', 'source' => 'Investing.com'],
        ['q' => 'site:kap.org.tr BIST şirket açıklama', 'source' => 'KAP'],
        ['q' => 'TCMB TÜİK enflasyon faiz Türkiye ekonomi', 'source' => 'Makro ekonomi'],
    ];
    // Tek bir yayıncı akışı kaplamasın: her sorgudan sınırlı sayıda kayıt alıp sıra sıra birleştiriyoruz.
    $newsBuckets = [];
    foreach ($queries as $q) {
        try { $newsBuckets[] = array_slice(fetchGoogleNewsRss($q['q'], $q['source'], $config), 0, 8); }
        catch (Throwable $e) { error_log('[content/news] '.$e->getMessage()); $newsBuckets[]=[]; }
    }
    $news=[];
    for($i=0;$i<8;$i++) foreach($newsBuckets as $bucket) if(isset($bucket[$i])) $news[]=$bucket[$i];
    $news = dedupeNews($news);
    // İlk ekranda tek yayıncı görünmesin: gerçek yayıncıya göre grupları tarih içinde sıralayıp sıra sıra birleştir.
    $news = balanceNewsByPublisher($news, 30);

    $macro = [];
    try { $macro = array_merge($macro, fetchTcmbCalendar($config)); } catch (Throwable $e) { error_log('[content/tcmb] '.$e->getMessage()); }
    try { $macro = array_merge($macro, fetchTuikCalendar($config)); } catch (Throwable $e) { error_log('[content/tuik] '.$e->getMessage()); }
    // TCMB sayfasının HTML yapısı değişse bile resmi 2026-2027 PPK/rapor takvimi boş kalmasın.
    $macro = array_merge($macro, getOfficialTcmbScheduleFallback());
    $macro = dedupeMacroEvents($macro);
    $today = date('Y-m-d'); $limitDate = date('Y-m-d', strtotime('+365 days'));
    $macro = array_values(array_filter($macro, static function($e) use ($today,$limitDate){
        $d=(string)($e['date']??''); return $d!=='' && $d >= $today && $d <= $limitDate;
    }));
    usort($macro, static fn($a,$b) => strcmp((string)($a['date']??''),(string)($b['date']??'')));

    $investors = [];
    try { $investors = fetchInvestorPortfolios($config); } catch (Throwable $e) { error_log('[content/sec] '.$e->getMessage()); }

    $expertViews = [];
    $expertQueries = [
        ['q'=>'Gedik Yatırım araştırma model portföy piyasa', 'source'=>'Gedik Araştırma'],
        ['q'=>'İş Yatırım araştırma piyasa strateji', 'source'=>'İş Yatırım Araştırma'],
        ['q'=>'Ahlatcı Yatırım araştırma piyasa', 'source'=>'Ahlatcı Yatırım'],
        ['q'=>'Yapı Kredi Yatırım araştırma piyasa', 'source'=>'Yapı Kredi Yatırım'],
    ];    foreach ($expertQueries as $q) {
        try { $expertViews = array_merge($expertViews, fetchGoogleNewsRss($q['q'], $q['source'], $config)); }
        catch (Throwable $e) { error_log('[content/expert] '.$e->getMessage()); }
    }
    $expertViews = dedupeNews($expertViews);
    usort($expertViews, static fn($a,$b) => strcmp((string)($b['publishedAt']??''),(string)($a['publishedAt']??'')));

    $domestic = fetchDomesticModelPortfolios($config);
    $fundSources = getFundSourceCatalog();
    $comparison = buildPortfolioComparison($domestic);

    return [
        'news' => array_slice($news, 0, 30),
        'macroEvents' => array_slice($macro, 0, 60),
        'expertViews' => array_slice($expertViews, 0, 24),
        'investorPortfolios' => $investors,
        'domesticPortfolios' => $domestic,
        'fundSources' => $fundSources,
        'portfolioComparison' => $comparison,
        'updatedAt' => date(DATE_ATOM),
        'sources' => getSourceCatalog(),
    ];
}

function getSourceCatalog(): array
{
    return [
        ['name'=>'KAP','role'=>'Şirket ve fon bildirimleri','url'=>'https://www.kap.org.tr/tr'],
        ['name'=>'TEFAS','role'=>'Fon fiyatı ve karşılaştırma','url'=>'https://www.tefas.gov.tr/FonKarsilastirma.aspx'],
        ['name'=>'TCMB','role'=>'Faiz ve resmi takvim','url'=>'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim'],
        ['name'=>'TÜİK','role'=>'Enflasyon ve ekonomik veriler','url'=>'https://www.tuik.gov.tr/Kurumsal/Veri_Takvimi'],
        ['name'=>'Investing.com','role'=>'Ek haber ve analiz akışı','url'=>'https://tr.investing.com/webmaster-tools/rss'],
        ['name'=>'Gedik Yatırım','role'=>'Hisse/fon model portföyleri','url'=>'https://gedik.com/analiz/model-portfoy'],
        ['name'=>'Deniz Yatırım','role'=>'Hisse model portföyü','url'=>'https://www.denizyatirim.com/ModelPortfolio'],
        ['name'=>'İş Portföy','role'=>'Fon fiyat ve getirileri','url'=>'https://www.isportfoy.com.tr/getiri-ve-fiyatlar'],
        ['name'=>'Garanti BBVA Portföy','role'=>'Yatırım fonları','url'=>'https://www.garantibbvaportfoy.com.tr/'],
        ['name'=>'Ak Portföy','role'=>'Fon fiyat ve karşılaştırma','url'=>'https://www.akportfoy.com.tr/tr/fon/yatirim-fonlari/getiri?type=compare'],
        ['name'=>'Yapı Kredi Portföy','role'=>'Yatırım fonları','url'=>'https://www.ykportfoy.com.tr/'],
        ['name'=>'Ahlatcı Portföy','role'=>'Yatırım fonları','url'=>'https://www.ahlatciportfoy.com.tr/fonlar'],
        ['name'=>'SEC EDGAR','role'=>'ABD kurumsal portföyleri','url'=>'https://www.sec.gov/edgar/search/'],
    ];
}

function getFundSourceCatalog(): array
{
    return [
        [
            'manager'=>'İş Portföy','url'=>'https://www.isportfoy.com.tr/getiri-ve-fiyatlar',
            'funds'=>[
                ['code'=>'IML','name'=>'Model Portföy Hisse'],
                ['code'=>'TI2','name'=>'Hisse Senedi'],
                ['code'=>'KPH','name'=>'Kâr Payı Ödeyen Hisse'],
                ['code'=>'TIE','name'=>'BIST 30 Endeksi'],
            ],
            'note'=>'Hisse, temettü ve endeks fonları için resmi kurum sayfası + TEFAS.'
        ],
        [
            'manager'=>'Garanti BBVA Portföy','url'=>'https://www.garantibbvaportfoy.com.tr/',
            'funds'=>[
                ['code'=>'GHS','name'=>'Hisse Senedi'],
                ['code'=>'GZG','name'=>'Sağlık ve Genetik Teknolojileri'],
                ['code'=>'GTL','name'=>'Para Piyasası'],
            ],
            'note'=>'Hisse, tematik ve para piyasası fonları.'
        ],
        [
            'manager'=>'Ak Portföy','url'=>'https://www.akportfoy.com.tr/tr/fon/yatirim-fonlari/getiri?type=compare',
            'funds'=>[
                ['code'=>'AK3','name'=>'Hisse Senedi'],
                ['code'=>'ALC','name'=>'Kâr Payı Ödeyen Şirketler'],
                ['code'=>'ALE','name'=>'Para Piyasası'],
            ],
            'note'=>'Resmi sayfada risk, önerilen vade ve dönemsel getiriler bulunuyor.'
        ],
        [
            'manager'=>'Yapı Kredi Portföy','url'=>'https://www.ykportfoy.com.tr/',
            'funds'=>[
                ['code'=>'YHS','name'=>'Birinci Hisse Senedi'],
                ['code'=>'YKT','name'=>'Altın'],
                ['code'=>'YOT','name'=>'Borçlanma Araçları'],
            ],
            'note'=>'Hisse, altın ve borçlanma araçları fonları için resmi kaynak.'
        ],
        [
            'manager'=>'Ahlatcı Portföy','url'=>'https://www.ahlatciportfoy.com.tr/fonlar',
            'funds'=>[
                ['code'=>'LTL','name'=>'Hisse Senedi Yoğun'],
                ['code'=>'HFO','name'=>'Katılım Hisse Senedi'],
                ['code'=>'HAI','name'=>'Altın'],
                ['code'=>'PTP','name'=>'Para Piyasası'],
            ],
            'note'=>'Hisse, katılım, altın ve para piyasası fonları.'
        ],
        [
            'manager'=>'Gedik Yatırım / çoklu fon seçkisi','url'=>'https://gedik.com/analiz/model-portfoy/yatirim-fonlari-model-portfoyleri',
            'funds'=>[
                ['code'=>'IRY','name'=>'Para Piyasası'],
                ['code'=>'NJR','name'=>'Borçlanma Araçları'],
                ['code'=>'BHI','name'=>'Mutlak Getiri Hedefli Hisse'],
                ['code'=>'YOT','name'=>'Borçlanma Araçları'],
            ],
            'note'=>'Temkinli, Dengeli, Atak ve Faizsiz model fon portföyleri.'
        ],
    ];
}

function fetchDomesticModelPortfolios(array $config): array
{
    $sources = [
        ['manager'=>'Gedik Yatırım','url'=>'https://gedik.com/analiz/model-portfoy/hisse-model-portfoy','typeLabel'=>'Hisse model portföyü','parser'=>'gedik'],
        ['manager'=>'Deniz Yatırım','url'=>'https://www.denizyatirim.com/ModelPortfoyPerformans','typeLabel'=>'Hisse model portföyü','parser'=>'deniz'],
    ];
    // Resmi sayfa geçici olarak yavaş/engelli olduğunda boş kart göstermek yerine
    // son doğrulanmış seçkiyi göster. Canlı okuma başarılı olduğunda bunun üzerine yazılır.
    $fallback = [
        'Gedik Yatırım' => ['AKSA','DOHOL','GARAN','MPARK','RGYAS','SAHOL','TABGD','TUPRS','THYAO','YKBNK'],
        'Deniz Yatırım' => ['TAVHL','HTTBT','BIMAS','CCOLA','YKBNK','TABGD','GARAN','AGESA','MPARK','THYAO'],
    ];
    $out=[];
    foreach($sources as $src){
        try{
            $cacheKey='domestic_'.preg_replace('/[^a-z0-9]+/i','_',strtolower($src['manager']));
            $row=cached($cacheKey, 21600, function() use($src,$config){
                return $src['parser']==='gedik'
                    ? fetchGedikModelPortfolio($src['url'],$config)
                    : fetchDenizModelPortfolio($src['url'],$config);
            });
            $row['manager']=$src['manager']; $row['url']=$src['url']; $row['typeLabel']=$src['typeLabel'];
            $out[]=$row;
        }catch(Throwable $e){
            error_log('[domestic '.$src['manager'].'] '.$e->getMessage());
            $holdings=[];
            foreach($fallback[$src['manager']]??[] as $ticker) $holdings[]=['ticker'=>$ticker,'name'=>$ticker,'targetPrice'=>'','potential'=>''];
            $out[]=['manager'=>$src['manager'],'url'=>$src['url'],'typeLabel'=>$src['typeLabel'],'holdings'=>$holdings,'updatedAt'=>'2026-08-29','status'=>'last_verified','source'=>'Son doğrulanmış resmi seçki'];
        }
    }
    return $out;
}

function fetchGedikModelPortfolio(string $url,array $config): array
{
    $res=httpRequest($url,[], $config);
    if($res['status']>=400) throw new RuntimeException('Gedik HTTP '.$res['status']);
    $text=cleanText($res['body']);
    $hold=[];
    // Resmi sayfadaki model portföy tablosunda koddan sonra hedef fiyat ve potansiyel gelir.
    if(preg_match_all('/\b([A-Z]{4,6})\b\s+([0-9.,]+)\s*₺?\s+%?([0-9.,-]+)/u',$text,$m,PREG_SET_ORDER)){
        foreach($m as $r){
            $ticker=$r[1];
            if(in_array($ticker,['BIST','TEFAS','DIBS'],true)) continue;
            if(isset($seen[$ticker])) continue; $seen[$ticker]=1;
            $hold[]=['ticker'=>$ticker,'name'=>$ticker,'targetPrice'=>$r[2]??'','potential'=>$r[3]??''];
            if(count($hold)>=20) break;
        }
    }
    // HTML tablo ayrıştırması daha güvenilir olduğunda onu tercih et.
    if(preg_match_all('/<tr\b[^>]*>(.*?)<\/tr>/isu',$res['body'],$rows)){
        $table=[];
        foreach($rows[1] as $rh){
            preg_match_all('/<t[dh]\b[^>]*>(.*?)<\/t[dh]>/isu',$rh,$cells);
            $parts=array_map(static fn($x)=>cleanText($x),$cells[1]??[]);
            if(count($parts)<2) continue;
            $ticker='';
            foreach($parts as $p){ if(preg_match('/^[A-Z]{4,6}$/',$p)){ $ticker=$p; break; } }
            if($ticker!=='' && !isset($table[$ticker])){
                $table[$ticker]=['ticker'=>$ticker,'name'=>$parts[0]!==$ticker?$parts[0]:$ticker,'targetPrice'=>$parts[2]??'','potential'=>$parts[3]??''];
            }
        }
        if(count($table)>=3) $hold=array_values($table);
    }
    if(!$hold) throw new RuntimeException('Gedik model portföyü ayrıştırılamadı');
    return ['holdings'=>$hold,'updatedAt'=>date('Y-m-d'),'status'=>'ok','source'=>'Gedik resmi sayfası'];
}

function fetchDenizModelPortfolio(string $url,array $config): array
{
    $res=httpRequest($url,[], $config);
    if($res['status']>=400) throw new RuntimeException('Deniz HTTP '.$res['status']);
    $hold=[];
    preg_match_all('/<tr\b[^>]*>(.*?)<\/tr>/isu',$res['body'],$rows);
    foreach($rows[1]??[] as $rh){
        preg_match_all('/<t[dh]\b[^>]*>(.*?)<\/t[dh]>/isu',$rh,$cells);
        $parts=array_values(array_map(static fn($x)=>cleanText($x),$cells[1]??[]));
        if(!$parts) continue;
        $ticker='';
        foreach($parts as $p){ if(preg_match('/^[A-Z]{4,6}$/',$p)){ $ticker=$p; break; } }
        if($ticker==='') continue;
        $hold[]=['ticker'=>$ticker,'name'=>$ticker,'targetPrice'=>$parts[1]??'','potential'=>$parts[2]??''];
    }
    if(!$hold){
        $text=cleanText($res['body']);
        if(preg_match_all('/\b([A-Z]{4,6})\b\s+([0-9.,]+)\s+([0-9.,-]+)%/u',$text,$m,PREG_SET_ORDER)){
            foreach($m as $r){
                if(isset($seen[$r[1]])) continue; $seen[$r[1]]=1;
                $hold[]=['ticker'=>$r[1],'name'=>$r[1],'targetPrice'=>$r[2],'potential'=>$r[3].'%'];
            }
        }
    }
    if(!$hold) throw new RuntimeException('Deniz model portföyü ayrıştırılamadı');
    return ['holdings'=>$hold,'updatedAt'=>date('Y-m-d'),'status'=>'ok','source'=>'Deniz Yatırım resmi sayfası'];
}

function fetchGenericModelPortfolio(string $url,array $config): array
{
    $res=httpRequest($url,[], $config);
    if($res['status']>=400) throw new RuntimeException('Model portföy HTTP '.$res['status']);
    $hold=[]; $seen=[];
    preg_match_all('/<tr\b[^>]*>(.*?)<\/tr>/isu',$res['body'],$rows);
    foreach($rows[1]??[] as $rh){
        preg_match_all('/<t[dh]\b[^>]*>(.*?)<\/t[dh]>/isu',$rh,$cells);
        $parts=array_values(array_filter(array_map(static fn($x)=>cleanText($x),$cells[1]??[]),static fn($x)=>$x!==''));
        if(!$parts) continue;
        $ticker='';
        foreach($parts as $part){ if(preg_match('/\b([A-Z]{4,6})\b/',$part,$m)){ $ticker=$m[1]; break; } }
        if($ticker==='' || isset($seen[$ticker]) || in_array($ticker,['BIST','XU100','VIOP','USDTRY','TEFAS'],true)) continue;
        $seen[$ticker]=1;
        $hold[]=['ticker'=>$ticker,'name'=>$ticker,'targetPrice'=>'','potential'=>''];
        if(count($hold)>=25) break;
    }
    if(!$hold){
        $text=cleanText($res['body']);
        if(preg_match_all('/\b([A-Z]{4,6})\b/u',$text,$m)){
            foreach($m[1] as $ticker){
                if(isset($seen[$ticker]) || in_array($ticker,['BIST','XU100','VIOP','TEFAS','TCMB','TUIK'],true)) continue;
                $seen[$ticker]=1; $hold[]=['ticker'=>$ticker,'name'=>$ticker,'targetPrice'=>'','potential'=>''];
                if(count($hold)>=20) break;
            }
        }
    }
    if(count($hold)<2) throw new RuntimeException('Model portföy ayrıştırılamadı');
    return ['holdings'=>$hold,'updatedAt'=>date('Y-m-d'),'status'=>'ok','source'=>'Kurumun resmi sayfası'];
}

function buildPortfolioComparison(array $portfolios): array
{
    $counts=[]; $institutions=[];
    foreach($portfolios as $p){
        $hold=$p['holdings']??[];
        if(!$hold) continue;
        $institutions[]=['manager'=>$p['manager']??'','count'=>count($hold)];
        $local=[];
        foreach($hold as $h){
            $t=strtoupper(trim((string)($h['ticker']??'')));
            if($t===''||isset($local[$t])) continue;
            $local[$t]=1; $counts[$t]=($counts[$t]??0)+1;
        }
    }
    arsort($counts);
    $common=[];
    foreach($counts as $ticker=>$count) if($count>=2) $common[]=['ticker'=>$ticker,'count'=>$count];
    return ['commonStocks'=>$common,'institutions'=>$institutions];
}

function fetchGoogleNewsRss(string $query, string $source, array $config): array
{
    $url = 'https://news.google.com/rss/search?q='.rawurlencode($query).'&hl=tr&gl=TR&ceid=TR:tr';
    $res = httpRequest($url, ['headers'=>['Accept: application/rss+xml,application/xml,text/xml;q=0.9']], $config);
    if ($res['status'] >= 400) throw new RuntimeException('Google Haberler HTTP '.$res['status']);
    preg_match_all('/<item>(.*?)<\/item>/is', $res['body'], $items);
    $out=[];
    foreach ($items[1] ?? [] as $item) {
        $title = cleanText(xmlTag($item,'title'));
        $link = cleanText(xmlTag($item,'link'));
        if ($link==='') $link='https://news.google.com/search?q='.rawurlencode($title).'&hl=tr&gl=TR&ceid=TR:tr';
        $pub = cleanText(xmlTag($item,'pubDate'));
        $desc = cleanText(xmlTag($item,'description'));
        $publisher = cleanText(xmlTag($item,'source'));
        if ($title==='') continue;
        // Google News description is commonly an encoded HTML link rather than an article excerpt.
        // Never send that markup to the app. Keep a short, readable source note instead.
        $summary = summarizeNewsDescription($desc, $title, $publisher);
        $out[]=['title'=>$title,'url'=>$link,'publishedAt'=>date(DATE_ATOM, strtotime($pub) ?: time()),'summary'=>$summary,'publisher'=>$publisher,'source'=>$source];
    }
    return $out;
}

function fetchArticleMetaSummary(string $url, string $fallback, array $config): string
{
    $res = httpRequest($url, ['headers'=>['Accept: text/html,application/xhtml+xml']], $config);
    $html = $res['body'];
    $candidate='';
    if (preg_match('/<meta\s+[^>]*(?:name|property)=["\'](?:description|og:description)["\'][^>]*content=["\']([^"\']{30,600})["\'][^>]*>/isu',$html,$m)) $candidate=$m[1];
    elseif (preg_match('/<meta\s+[^>]*content=["\']([^"\']{30,600})["\'][^>]*(?:name|property)=["\'](?:description|og:description)["\'][^>]*>/isu',$html,$m)) $candidate=$m[1];
    $candidate=cleanText($candidate);
    if ($candidate==='' || mb_strlen($candidate)<35) return $fallback;
    if (mb_strlen($candidate)>220) $candidate=rtrim(mb_substr($candidate,0,217)).'…';
    return $candidate;
}

function xmlTag(string $xml,string $tag): string
{
    $q = preg_quote($tag,'/');
    if (preg_match('/<(?:[A-Za-z0-9_]+:)?'.$q.'(?:\\s[^>]*)?>(.*?)<\\/(?:[A-Za-z0-9_]+:)?'.$q.'>/is',$xml,$m)) return trim($m[1]);
    return '';
}
function cleanText(string $value): string
{
    $value = preg_replace('/^\s*<!\[CDATA\[|\]\]>\s*$/u', '', $value) ?? $value;
    for ($i = 0; $i < 3; $i++) {
        $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        if ($decoded === $value) break;
        $value = $decoded;
    }
    $value = preg_replace('/<script\b[^>]*>.*?<\/script>/is', ' ', $value) ?? $value;
    $value = preg_replace('/<style\b[^>]*>.*?<\/style>/is', ' ', $value) ?? $value;
    $value = strip_tags($value);
    $value = preg_replace('/\bhttps?:\/\/\S+/iu', ' ', $value) ?? $value;
    $value = preg_replace('/\s+/u', ' ', $value) ?? $value;
    return trim($value);
}
function summarizeNewsDescription(string $desc, string $title, string $publisher): string
{
    $desc = cleanText($desc);
    $titleClean = cleanText($title);
    $publisherClean = cleanText($publisher);
    if ($desc === '' || preg_match('/(?:href\s*=|target\s*=|<\/?[a-z][^>]*>)/iu', $desc)) {
        $core = preg_replace('/\s+-\s+[^-]{2,60}$/u', '', $titleClean) ?? $titleClean;
        if (mb_strlen($core) > 135) $core = rtrim(mb_substr($core,0,132)).'…';
        return ($core !== '' ? $core.' hakkında kısa piyasa haberi.' : 'Piyasa haberi.').' Ayrıntılar için karta dokunun.';
    }
    $normalizedTitle = mb_strtolower(trim($titleClean));
    $normalizedDesc = mb_strtolower(trim($desc));
    if ($normalizedDesc === $normalizedTitle || ($normalizedTitle !== '' && str_starts_with($normalizedDesc, $normalizedTitle))) {
        return ($titleClean !== '' ? preg_replace('/\s+-\s+[^-]{2,60}$/u','',$titleClean).' hakkında kısa piyasa haberi.' : 'Piyasa haberi.').' Ayrıntılar için karta dokunun.';
    }
    if ($titleClean !== '') $desc = trim(str_ireplace($titleClean, '', $desc));
    $desc = trim(preg_replace('/\s+/u', ' ', $desc) ?? $desc);
    if ($desc === '' || mb_strlen($desc) < 18) {
        return ($titleClean !== '' ? preg_replace('/\s+-\s+[^-]{2,60}$/u','',$titleClean).' hakkında kısa piyasa haberi.' : 'Piyasa haberi.').' Ayrıntılar için karta dokunun.';
    }
    if (mb_strlen($desc) > 170) $desc = rtrim(mb_substr($desc, 0, 167)).'…';
    return $desc;
}
function balanceNewsByPublisher(array $items, int $limit = 30): array
{
    $groups=[];
    foreach($items as $item){
        $publisher=trim((string)($item['publisher']??$item['source']??'Diğer'));
        if($publisher==='') $publisher='Diğer';
        $groups[$publisher][]=$item;
    }
    foreach($groups as &$group){
        usort($group, static fn($a,$b)=>strcmp((string)($b['publishedAt']??''),(string)($a['publishedAt']??'')));
    }
    unset($group);
    uasort($groups, static fn($a,$b)=>strcmp((string)($b[0]['publishedAt']??''),(string)($a[0]['publishedAt']??'')));
    $out=[]; $index=0;
    while(count($out)<$limit){
        $added=false;
        foreach($groups as $group){
            if(isset($group[$index])){ $out[]=$group[$index]; $added=true; if(count($out)>=$limit) break; }
        }
        if(!$added) break;
        $index++;
    }
    return $out;
}

function dedupeNews(array $items): array { $seen=[];$out=[]; foreach($items as $n){$k=mb_strtolower(preg_replace('/\W+/u',' ',(string)($n['title']??''))); if($k===''||isset($seen[$k])) continue; $seen[$k]=1;$out[]=$n;} return $out; }
function dedupeMacroEvents(array $items): array
{
    $seen=[];$out=[];
    foreach($items as $e){
        $key=mb_strtolower(trim((string)($e['source']??'')).'|'.trim((string)($e['date']??'')).'|'.preg_replace('/\s+/u',' ',trim((string)($e['title']??''))));
        if($key==='||'||isset($seen[$key])) continue;
        $seen[$key]=1;$out[]=$e;
    }
    return $out;
}

function getOfficialTcmbScheduleFallback(): array
{
    $url='https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim';
    $rows=[
        ['2026-09-10','Para Politikası Kurulu faiz kararı'],
        ['2026-09-17','Para Politikası Kurulu toplantı özeti'],
        ['2026-10-22','Para Politikası Kurulu faiz kararı'],
        ['2026-10-30','Para Politikası Kurulu toplantı özeti'],
        ['2026-11-12','Enflasyon Raporu 2026-IV'],
        ['2026-11-27','Finansal İstikrar Raporu'],
        ['2026-12-10','Para Politikası Kurulu faiz kararı'],
        ['2026-12-17','Para Politikası Kurulu toplantı özeti'],
        ['2027-01-21','Para Politikası Kurulu faiz kararı'],
        ['2027-01-28','Para Politikası Kurulu toplantı özeti'],
        ['2027-02-11','Enflasyon Raporu 2027-I'],
        ['2027-03-18','Para Politikası Kurulu faiz kararı'],
        ['2027-03-25','Para Politikası Kurulu toplantı özeti'],
        ['2027-04-22','Para Politikası Kurulu faiz kararı'],
        ['2027-04-29','Para Politikası Kurulu toplantı özeti'],
        ['2027-05-13','Enflasyon Raporu 2027-II'],
        ['2027-05-28','Finansal İstikrar Raporu'],
        ['2027-06-10','Para Politikası Kurulu faiz kararı'],
        ['2027-06-17','Para Politikası Kurulu toplantı özeti'],
    ];
    $out=[];
    foreach($rows as [$date,$title]) $out[]=['date'=>$date,'time'=>'','title'=>$title,'period'=>'TCMB resmi takvimi','source'=>'TCMB','url'=>$url];
    return $out;
}

function parseTrCalendarDate(string $text): string
{
    $text=trim(preg_replace('/\s+/u',' ',$text)??$text);
    if(preg_match('/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})\b/u',$text,$m))
        return sprintf('%04d-%02d-%02d',(int)$m[3],(int)$m[2],(int)$m[1]);
    if(!preg_match('/\b(\d{1,2})\s+(Ocak|Şubat|Subat|Mart|Nisan|Mayıs|Mayis|Haziran|Temmuz|Ağustos|Agustos|Eylül|Eylul|Ekim|Kasım|Kasim|Aralık|Aralik)\s+(20\d{2})\b/iu',$text,$m)) return '';
    $months=['ocak'=>1,'şubat'=>2,'subat'=>2,'mart'=>3,'nisan'=>4,'mayıs'=>5,'mayis'=>5,'haziran'=>6,'temmuz'=>7,'ağustos'=>8,'agustos'=>8,'eylül'=>9,'eylul'=>9,'ekim'=>10,'kasım'=>11,'kasim'=>11,'aralık'=>12,'aralik'=>12];
    $key=mb_strtolower($m[2],'UTF-8'); $month=$months[$key]??0;
    return $month ? sprintf('%04d-%02d-%02d',(int)$m[3],$month,(int)$m[1]) : '';
}

function fetchTcmbCalendar(array $config): array
{
    $url='https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim';
    $res=httpRequest($url,[], $config); $body=$res['body']; $out=[];
    preg_match_all('/<tr\b[^>]*>(.*?)<\/tr>/isu',$body,$rows);
    foreach($rows[1]??[] as $rowHtml){
        preg_match_all('/<t[dh]\b[^>]*>(.*?)<\/t[dh]>/isu',$rowHtml,$cells);
        $parts=array_values(array_filter(array_map(static fn($v)=>cleanText($v),$cells[1]??[]),static fn($v)=>$v!==''));
        if(!$parts) continue;
        $date=''; $dateIndex=-1;
        foreach($parts as $i=>$part){
            $date=parseTrCalendarDate($part);
            if($date!==''){$dateIndex=$i;break;}
        }
        if($date==='') continue;
        $labels=[];
        foreach($parts as $i=>$part){ if($i===$dateIndex) continue; $clean=trim(preg_replace('/\s+/u',' ',$part)??$part); if(mb_strlen($clean)>=4)$labels[]=$clean; }
        $title=$labels[0]??'TCMB duyurusu';
        if(mb_strlen($title)>150)$title=rtrim(mb_substr($title,0,147)).'…';
        $period=implode(' · ',array_slice($labels,1,2));
        $out[]=['date'=>$date,'time'=>'','title'=>$title,'period'=>$period,'source'=>'TCMB','url'=>$url];
    }
    return $out;
}

function fetchTuikCalendar(array $config): array
{
    $url='https://www.tuik.gov.tr/Kurumsal/Veri_Takvimi';
    $res=httpRequest($url,[], $config); $body=strip_tags($res['body']); $out=[];
    preg_match_all('/(\d{1,2})\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+)\s+(\d{4})[^\n]{0,500}?([A-ZÇĞİÖŞÜa-zçğıöşü0-9][^\n]{5,180})/u',$body,$m,PREG_SET_ORDER);
    foreach($m as $row){$date=parseTrCalendarDate($row[1].' '.$row[2].' '.$row[3]); if($date==='')continue; $out[]=['date'=>$date,'time'=>'','title'=>trim(preg_replace('/\s+/u',' ',$row[4])),'period'=>'Resmi veri yayımlama takvimi','source'=>'TÜİK','url'=>$url];}
    return $out;
}

function fetchInvestorPortfolios(array $config): array
{
    $managers=[
        ['name'=>'Berkshire Hathaway','cik'=>'0001067983'],
        ['name'=>'Pershing Square Capital Management','cik'=>'0001336528'],
        ['name'=>'Scion Asset Management','cik'=>'0001649339'],
        ['name'=>'Bridgewater Associates','cik'=>'0001350694'],
    ];
    $out=[];
    $secEnabled = trim((string)($config['SEC_USER_AGENT'] ?? '')) !== '';
    foreach($managers as $m){
        if ($secEnabled) {
            try {
                $key='sec13f_'.preg_replace('/[^a-z0-9]+/i','_',strtolower($m['name']));
                $row=cached($key, 43200, fn()=>fetchLatest13F($m['name'],$m['cik'],$config));
                if($row) { $out[]=$row; continue; }
            } catch(Throwable $e){ error_log('[13F '.$m['name'].'] '.$e->getMessage()); }
        }
        // Keep the section useful even when SEC temporarily throttles shared hosting.
        $out[] = [
            'manager'=>$m['name'],
            'filingDate'=>'',
            'source'=>'SEC 13F',
            'url'=>'https://www.sec.gov/edgar/browse/?CIK='.ltrim($m['cik'],'0').'&owner=exclude',
            'holdings'=>[],
            'status'=>'temporarily_unavailable'
        ];
    }
    return $out;
}
function secHeaders(array $config): array { $ua=trim((string)($config['SEC_USER_AGENT']??'')); if($ua==='') $ua=(string)$config['USER_AGENT']; return ['User-Agent: '.$ua,'Accept: application/json,application/xml,text/xml;q=0.9,*/*;q=0.8']; }
function fetchLatest13F(string $manager,string $cik,array $config): ?array
{
    $sub='https://data.sec.gov/submissions/CIK'.str_pad($cik,10,'0',STR_PAD_LEFT).'.json';
    $res=httpRequest($sub,['headers'=>secHeaders($config)],$config); $json=json_decode($res['body'],true,flags:JSON_THROW_ON_ERROR); $r=$json['filings']['recent']??[];
    $idx=array_search('13F-HR',$r['form']??[],true); if($idx===false) return null;
    $acc=$r['accessionNumber'][$idx]??''; $doc=$r['primaryDocument'][$idx]??''; $date=$r['filingDate'][$idx]??''; if($acc==='')return null;
    $accNo=str_replace('-','',$acc); $indexUrl='https://www.sec.gov/Archives/edgar/data/'.ltrim($cik,'0').'/'.$accNo.'/index.json';
    $ir=httpRequest($indexUrl,['headers'=>secHeaders($config)],$config); $ij=json_decode($ir['body'],true); $files=$ij['directory']['item']??[]; $xml='';
    foreach($files as $f){$name=$f['name']??''; if(preg_match('/(informationtable|infotable).*\.xml$/i',$name)){$xml=$name;break;}}
    if($xml==='') foreach($files as $f){$name=$f['name']??''; if(preg_match('/\.xml$/i',$name)){$xml=$name;}}
    if($xml==='') return null;
    $xr=httpRequest('https://www.sec.gov/Archives/edgar/data/'.ltrim($cik,'0').'/'.$accNo.'/'.$xml,['headers'=>secHeaders($config)],$config); $x=$xr['body'];
    preg_match_all('/<(?:[A-Za-z0-9_]+:)?infoTable\b[^>]*>(.*?)<\/(?:[A-Za-z0-9_]+:)?infoTable>/is',$x,$rows); $hold=[];
    foreach(array_slice($rows[1]??[],0,20) as $row){$ticker=xmlTag($row,'nameOfIssuer');$sym=xmlTag($row,'titleOfClass');$value=(float)preg_replace('/[^0-9.\-]/','',xmlTag($row,'value'));$cusip=xmlTag($row,'cusip'); if($ticker!=='')$hold[]=['name'=>$ticker,'ticker'=>$sym,'value'=>$value,'cusip'=>$cusip];}
    return ['manager'=>$manager,'filingDate'=>$date,'source'=>'SEC 13F','url'=>'https://www.sec.gov/Archives/edgar/data/'.ltrim($cik,'0').'/'.$accNo.'/'.$doc,'holdings'=>$hold];
}

function fetchTefas(string $code, array $config): array
{
    $code = strtoupper(preg_replace('/[^A-Z0-9]/', '', $code) ?? '');
    if (strlen($code) < 3) throw new RuntimeException('TEFAS fon kodu geçersiz');

    // 2026 TEFAS JSON uç noktası. Eski BindHistoryInfo, F5/WAF nedeniyle sunucudan 502 verebildiği için
    // önce yeni uç nokta denenir. Eski uç nokta yalnızca geriye dönük yedektir.
    try {
        $payload = json_encode(['fonKodu'=>$code,'dil'=>'TR','periyod'=>1], JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        $res = httpRequest('https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir', [
            'method'=>'POST',
            'headers'=>[
                'Content-Type: application/json',
                'Accept: application/json',
                'Referer: https://www.tefas.gov.tr/',
                'Origin: https://www.tefas.gov.tr',
            ],
            'body'=>$payload,
            'connectTimeout'=>5,
            'timeout'=>12,
        ], $config);
        $json = json_decode($res['body'], true, flags: JSON_THROW_ON_ERROR);
        $rows = $json['resultList'] ?? [];
        if (is_array($rows) && $rows) {
            $history=[]; $dates=[];
            foreach ($rows as $row) {
                $value = parseLocaleNumber($row['fiyat'] ?? null);
                if ($value === null) continue;
                $history[]=$value;
                $date=(string)($row['tarih'] ?? '');
                $ts=$date!==''?strtotime($date):0;
                $dates[]=$ts?date('Y-m-d',$ts):null;
            }
            if ($history) {
                $price=(float)$history[array_key_last($history)];
                $prev=count($history)>1?(float)$history[count($history)-2]:$price;
                $last=$rows[array_key_last($rows)];
                return [
                    'symbol'=>$code,
                    'name'=>(string)($last['fonUnvan'] ?? $code),
                    'price'=>$price,
                    'prevClose'=>$prev,
                    'changePct'=>$prev ? (($price-$prev)/$prev*100) : 0,
                    'currency'=>'TRY',
                    'history'=>$history,
                    'dates'=>$dates,
                    'dividends'=>[],
                    'source'=>'TEFAS yeni JSON API',
                    'updatedAt'=>date(DATE_ATOM),
                ];
            }
        }
    } catch (Throwable $primary) {
        error_log('[FinansalEB] TEFAS yeni API: '.$primary->getMessage());
    }

    $end = new DateTimeImmutable('today');
    $start = $end->modify('-20 days');
    $body = http_build_query([
        'fontip' => 'YAT',
        'bastarih' => $start->format('d.m.Y'),
        'bittarih' => $end->format('d.m.Y'),
        'fonkod' => $code,
    ]);
    $res = httpRequest('https://www.tefas.gov.tr/api/DB/BindHistoryInfo', [
        'method' => 'POST',
        'headers' => [
            'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With: XMLHttpRequest',
            'Referer: https://www.tefas.gov.tr/TarihselVeriler.aspx',
            'Origin: https://www.tefas.gov.tr',
        ],
        'body' => $body,
        'connectTimeout'=>5,
        'timeout'=>12,
    ], $config);
    $json = json_decode($res['body'], true, flags: JSON_THROW_ON_ERROR);
    $rows = $json['data'] ?? [];
    if (!is_array($rows) || !$rows) throw new RuntimeException($code . ' için TEFAS kaydı bulunamadı');
    usort($rows, static function(array $a, array $b): int { return tefasTimestamp($a['TARIH'] ?? null) <=> tefasTimestamp($b['TARIH'] ?? null); });
    $history=[];$dates=[];
    foreach($rows as $row){$value=parseLocaleNumber($row['FIYAT']??null);if($value===null)continue;$history[]=$value;$ts=tefasTimestamp($row['TARIH']??null);$dates[]=$ts?date('Y-m-d',$ts):null;}
    if(!$history)throw new RuntimeException('TEFAS fiyatları ayrıştırılamadı');
    $price=(float)$history[array_key_last($history)];$prev=count($history)>1?(float)$history[count($history)-2]:$price;$lastRow=$rows[array_key_last($rows)];
    return ['symbol'=>$code,'name'=>(string)($lastRow['FONUNVAN']??$lastRow['FONUNVANI']??$code),'price'=>$price,'prevClose'=>$prev,'changePct'=>$prev?(($price-$prev)/$prev*100):0,'currency'=>'TRY','history'=>$history,'dates'=>$dates,'dividends'=>[],'source'=>'TEFAS eski API yedeği','updatedAt'=>date(DATE_ATOM)];
}

function kapSlug(string $value): string
{
    $map=['Ç'=>'c','Ğ'=>'g','İ'=>'i','I'=>'i','Ö'=>'o','Ş'=>'s','Ü'=>'u','ç'=>'c','ğ'=>'g','ı'=>'i','ö'=>'o','ş'=>'s','ü'=>'u'];
    $value=strtr($value,$map);
    $value=strtolower($value);
    $value=preg_replace('/[^a-z0-9]+/','-',$value)??'';
    return trim($value,'-');
}

function extractPercentAfterLabel(string $text, string $label): ?float
{
    $pos=mb_stripos($text,$label);
    if($pos===false)return null;
    $slice=mb_substr($text,$pos,650);
    if(preg_match('/([0-9]{1,3}(?:[.,][0-9]{1,8})?)/u',$slice,$m))return parseLocaleNumber($m[1]);
    return null;
}

function fetchKapFundFees(string $code, string $name, array $config): array
{
    $quoteName=$name;
    if($quoteName===''){
        try{$q=fetchTefas($code,$config);$quoteName=(string)($q['name']??'');}catch(Throwable $e){}
    }
    $slug=strtolower($code).($quoteName!==''?'-'.kapSlug($quoteName):'');
    $url='https://www.kap.org.tr/tr/fon-bilgileri/genel/'.$slug;
    $res=httpRequest($url,['headers'=>['Accept: text/html,application/xhtml+xml'],'connectTimeout'=>5,'timeout'=>12],$config);
    $html=$res['body'];
    $text=html_entity_decode(strip_tags(preg_replace('/<script\b[^>]*>.*?<\/script>/is',' ',$html)??$html),ENT_QUOTES|ENT_HTML5,'UTF-8');
    $text=preg_replace('/\s+/u',' ',trim($text))??$text;

    $annual=null;$daily=null;$entry=null;$exit=null;$performance=null;$expense=null;
    if(preg_match('/Yönetim Ücreti Oranı \(Günlük\).*?Yönetim Ücreti Oranı \(Yıllık\).*?([0-9]+(?:[.,][0-9]+)?).*?([0-9]+(?:[.,][0-9]+)?)/ui',$text,$m)){
        $daily=parseLocaleNumber($m[1]);$annual=parseLocaleNumber($m[2]);
    }
    if($annual===null && preg_match('/Yönetim Ücreti Oranı \(Yıllık\) \(%\).*?([0-9]+(?:[.,][0-9]+)?)/ui',$text,$m))$annual=parseLocaleNumber($m[1]);
    if($daily===null && preg_match('/Yönetim Ücreti Oranı \(Günlük\) \(%\).*?([0-9]+(?:[.,][0-9]+)?)/ui',$text,$m))$daily=parseLocaleNumber($m[1]);
    if(preg_match('/Giriş Komisyonu \(%\).*?([0-9]+(?:[.,][0-9]+)?)/ui',$text,$m))$entry=parseLocaleNumber($m[1]);
    if(preg_match('/Çıkış Komisyonu \(%\).*?([0-9]+(?:[.,][0-9]+)?)/ui',$text,$m))$exit=parseLocaleNumber($m[1]);
    if(preg_match('/Performans Ücreti Oranı \(%\).*?([0-9]+(?:[.,][0-9]+)?)/ui',$text,$m))$performance=parseLocaleNumber($m[1]);
    // Fon toplam gider oranı bazı KAP sayfalarında ayrı açılır içerikte olduğundan bulunamayabilir.
    if(preg_match('/Fon Toplam Gider Oranı[^%]{0,160}%\s*([0-9]+(?:[.,][0-9]+)?)/ui',$text,$m))$expense=parseLocaleNumber($m[1]);

    return [
        'code'=>$code,'name'=>$quoteName,
        'managementFeeAnnual'=>$annual,'managementFeeDaily'=>$daily,
        'entryFee'=>$entry,'exitFee'=>$exit,'performanceFee'=>$performance,'expenseRatio'=>$expense,
        'source'=>'KAP','sourceUrl'=>$url,'updatedAt'=>date(DATE_ATOM),
        'note'=>($annual===null&&$daily===null)?'KAP sayfası bulundu; ücret tablosu otomatik ayrıştırılamadı. Manuel giriş kullanılabilir.':'KAP resmi fon sayfasından otomatik okundu.'
    ];
}

function tefasTimestamp(mixed $value): int
{
    if (is_numeric($value)) {
        $n = (int)$value;
        if ($n > 10_000_000_000) $n = (int)($n/1000);
        return $n;
    }
    if (is_string($value) && preg_match('/Date\((\d+)/', $value, $m)) {
        return (int)(((int)$m[1]) / 1000);
    }
    if (is_string($value)) {
        $ts = strtotime($value);
        return $ts ?: 0;
    }
    return 0;
}

function parseLocaleNumber(mixed $value): ?float
{
    if (is_int($value) || is_float($value)) return (float)$value;
    if (!is_string($value)) return null;
    $value = trim($value);
    if ($value === '') return null;
    if (str_contains($value, ',') && str_contains($value, '.')) {
        $value = str_replace('.', '', $value);
        $value = str_replace(',', '.', $value);
    } elseif (str_contains($value, ',')) {
        $value = str_replace(',', '.', $value);
    }
    $value = preg_replace('/[^0-9.\-]/', '', $value) ?? '';
    return is_numeric($value) ? (float)$value : null;
}

function fetchYahooDividends(string $symbol, array $config): array
{
    $url = 'https://query1.finance.yahoo.com/v8/finance/chart/' . rawurlencode($symbol)
        . '?period1=' . strtotime('-8 years') . '&period2=' . strtotime('+400 days')
        . '&interval=1d&events=div%2Csplits';
    $json = getJson($url, $config);
    $result = $json['chart']['result'][0] ?? null;
    if (!is_array($result)) throw new RuntimeException('Temettü geçmişi bulunamadı');
    $events = [];
    foreach (($result['events']['dividends'] ?? []) as $event) {
        if (!isset($event['date'], $event['amount'])) continue;
        $events[] = [
            'exDate' => date('Y-m-d', (int)$event['date']),
            'payDate' => null,
            'amountPerShare' => (float)$event['amount'],
            'status' => (int)$event['date'] > time() ? 'confirmed' : 'historical',
            'source' => 'Piyasa veri akışı',
        ];
    }
    usort($events, static fn($a,$b) => strcmp($a['exDate'],$b['exDate']));
    $estimated = inferDividendSchedule($events);
    return [
        'symbol' => $symbol,
        'events' => array_merge($events, $estimated),
        'source' => 'Geçmiş ödeme düzeni',
        'note' => 'Tahmini kayıtlar açıklanmış olay değildir.',
        'updatedAt' => date(DATE_ATOM),
    ];
}

function inferDividendSchedule(array $events): array
{
    $recent = array_values(array_filter($events, static fn($e) => strtotime($e['exDate']) >= strtotime('-2 years')));
    if (count($recent) < 2) return [];
    $intervals = [];
    for ($i=1; $i<count($recent); $i++) {
        $intervals[] = (strtotime($recent[$i]['exDate']) - strtotime($recent[$i-1]['exDate'])) / 86400;
    }
    sort($intervals);
    $median = $intervals[(int)floor(count($intervals)/2)] ?? 90;
    $days = $median < 50 ? 30 : ($median < 140 ? 91 : ($median < 270 ? 182 : 365));
    $amounts = array_map(static fn($e)=>(float)$e['amountPerShare'], array_slice($recent,-4));
    sort($amounts);
    $amount = $amounts[(int)floor(count($amounts)/2)] ?? 0;
    $last = strtotime($recent[array_key_last($recent)]['exDate']);
    while ($last < strtotime('-1 day')) $last += $days*86400;
    $out = [];
    $limit = strtotime('+370 days');
    while ($last <= $limit) {
        $date = date('Y-m-d',$last);
        $nearExisting = false;
        foreach ($events as $event) {
            if (abs(strtotime($event['exDate'])-$last) < 10*86400) { $nearExisting=true; break; }
        }
        if (!$nearExisting) {
            $out[] = [
                'exDate' => $date,
                'payDate' => date('Y-m-d', $last + 14*86400),
                'amountPerShare' => $amount,
                'status' => 'estimated',
                'source' => 'Geçmiş ödeme düzeni tahmini',
            ];
        }
        $last += $days*86400;
    }
    return $out;
}

/**
 * KAP resmi sayfalarını yalnızca kişisel kullanım için, önbellekli ve düşük sıklıkta tarayan bağdaştırıcı.
 * KAP HTML yapısı değişirse boş sonuç dönebilir. “confirmed” yalnızca tarih metni ve ödeme
 * tablosu resmi bildirim sayfasında birlikte bulunduğunda kullanılır.
 */
function fetchKapDividends(string $symbol, array $config): array
{
    $query = rawurlencode($symbol . ' Kar Payı Dağıtım İşlemlerine İlişkin Bildirim');
    $searchUrl = 'https://www.kap.org.tr/tr/search/' . $query . '/1';
    $search = httpRequest($searchUrl, [], $config)['body'];
    preg_match_all('~(?:https://www\.kap\.org\.tr)?/tr/Bildirim/(\d+)~i', $search, $matches);
    $ids = array_values(array_unique($matches[1] ?? []));
    $ids = array_slice($ids, 0, 8);
    $events = [];
    $sources = [];

    foreach ($ids as $id) {
        $url = 'https://www.kap.org.tr/tr/Bildirim/' . $id;
        try {
            $html = httpRequest($url, [], $config)['body'];
        } catch (Throwable) {
            continue;
        }
        $text = htmlToText($html);
        if (mb_stripos($text, $symbol) === false || mb_stripos($text, 'Kar Payı Dağıtım') === false) continue;
        $blockPos = mb_stripos($text, 'Kar Payı Ödeme Tarihleri');
        if ($blockPos === false) continue;
        $block = mb_substr($text, $blockPos, 2500);
        preg_match_all('/\b([0-3]?\d[.\/]?[01]?\d[.\/]20\d{2})\b/u', $block, $dateMatches);
        $dates = [];
        foreach (($dateMatches[1] ?? []) as $rawDate) {
            $normalized = normalizeTurkishDate($rawDate);
            if ($normalized && !in_array($normalized,$dates,true)) $dates[]=$normalized;
        }
        if (!$dates) continue;

        $amounts = [];
        $symbolPattern = preg_quote($symbol, '/');
        if (preg_match_all('/\b' . $symbolPattern . '\b.{0,500}?(?:Peşin|\d+\.\s*Taksit).{0,180}?([0-9]+,[0-9]{4,})/su', $text, $amountMatches)) {
            foreach ($amountMatches[1] as $raw) {
                $n = parseLocaleNumber($raw);
                if ($n !== null && $n > 0) $amounts[]=$n;
            }
        }
        $amounts = array_values(array_unique($amounts, SORT_REGULAR));
        $isApproved = mb_stripos($text,'Genel Kurul') !== false && (
            mb_stripos($text,'onaylan') !== false || mb_stripos($text,'Kesinleşen') !== false
        );
        $paymentDates = array_slice($dates, -max(1, count($amounts) ?: 1));
        foreach ($paymentDates as $index => $payDate) {
            $events[] = [
                'exDate' => $payDate,
                'payDate' => $payDate,
                'amountPerShare' => (float)($amounts[$index] ?? $amounts[0] ?? 0),
                'currency' => 'TRY',
                'status' => $isApproved ? 'confirmed' : 'proposed',
                'source' => 'KAP Bildirim ' . $id,
                'sourceUrl' => $url,
            ];
        }
        $sources[]=$url;
    }
    usort($events, static fn($a,$b) => strcmp($a['payDate'],$b['payDate']));
    // Aynı tarih/tutar tekrarlarını temizle.
    $dedup = [];
    foreach ($events as $event) {
        $key = $event['payDate'] . '|' . number_format((float)$event['amountPerShare'],6,'.','');
        $dedup[$key] = $event;
    }
    return [
        'symbol' => $symbol,
        'events' => array_values($dedup),
        'sources' => array_values(array_unique($sources)),
        'source' => 'KAP resmi bildirim sayfaları',
        'bestEffort' => true,
        'updatedAt' => date(DATE_ATOM),
    ];
}

function htmlToText(string $html): string
{
    $html = preg_replace('~<(script|style)[^>]*>.*?</\1>~is', ' ', $html) ?? $html;
    $html = preg_replace('~</(div|p|tr|td|th|li|h[1-6])>~i', "\n", $html) ?? $html;
    $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = preg_replace('/[\t ]+/u', ' ', $text) ?? $text;
    $text = preg_replace('/\n{2,}/u', "\n", $text) ?? $text;
    return trim($text);
}

function normalizeTurkishDate(string $value): ?string
{
    $value = str_replace('/','.',trim($value));
    $parts = explode('.',$value);
    if (count($parts)!==3) return null;
    [$d,$m,$y]=array_map('intval',$parts);
    if (!checkdate($m,$d,$y)) return null;
    return sprintf('%04d-%02d-%02d',$y,$m,$d);
}
