<?php
declare(strict_types=1);

/**
 * Finansal(EB) kişisel veri uç noktası
 * PHP 8.1+, cURL, DOM ve mbstring önerilir.
 *
 * İşlevler:
 *   ?action=health
 *   ?action=quote&symbol=TUPRS.IS&type=BIST
 *   ?action=tefas&code=TMG
 *   ?action=dividends&symbol=SCHD
 *   ?action=kap_dividends&symbol=TUPRS
 *   ?action=batch&items=[{"symbol":"TUPRS.IS","type":"BIST"}]
 */

const APP_VERSION = '0.1.0';

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
    'USER_AGENT' => 'FinansalEB/0.1 (personal portfolio tracker)',
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
    'USER_AGENT' => 'FinansalEB/0.1 (personal portfolio tracker)',
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
                    'quotes' => true,
                    'tefas' => function_exists('curl_init'),
                    'kap_best_effort' => (bool)$config['ENABLE_KAP_SCRAPER'],
                    'cache' => is_writable((string)$config['CACHE_DIR']),
                ],
            ]);
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
        $temp = $file . '.' . getmypid() . '.tmp';
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
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 20,
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
    curl_close($ch);
    if ($status < 200 || $status >= 300) throw new RuntimeException('Kaynak HTTP ' . $status . ' döndürdü');
    return ['status' => $status, 'body' => $body, 'contentType' => $contentType];
}

function getJson(string $url, array $config): array
{
    $res = httpRequest($url, [], $config);
    $json = json_decode($res['body'], true, flags: JSON_THROW_ON_ERROR);
    if (!is_array($json)) throw new RuntimeException('JSON yanıtı geçersiz');
    return $json;
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

function fetchTefas(string $code, array $config): array
{
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
    ], $config);
    $json = json_decode($res['body'], true, flags: JSON_THROW_ON_ERROR);
    $rows = $json['data'] ?? [];
    if (!is_array($rows) || !$rows) throw new RuntimeException($code . ' için TEFAS kaydı bulunamadı');

    usort($rows, static function(array $a, array $b): int {
        return tefasTimestamp($a['TARIH'] ?? null) <=> tefasTimestamp($b['TARIH'] ?? null);
    });
    $history = [];
    $dates = [];
    foreach ($rows as $row) {
        $value = parseLocaleNumber($row['FIYAT'] ?? null);
        if ($value === null) continue;
        $history[] = $value;
        $ts = tefasTimestamp($row['TARIH'] ?? null);
        $dates[] = $ts ? date('Y-m-d', $ts) : null;
    }
    if (!$history) throw new RuntimeException('TEFAS fiyatları ayrıştırılamadı');
    $price = (float)$history[array_key_last($history)];
    $prev = count($history) > 1 ? (float)$history[count($history)-2] : $price;
    $lastRow = $rows[array_key_last($rows)];
    return [
        'symbol' => $code,
        'name' => $lastRow['FONUNVAN'] ?? $code,
        'price' => $price,
        'prevClose' => $prev,
        'changePct' => $prev > 0 ? (($price-$prev)/$prev)*100 : 0,
        'currency' => 'TRY',
        'history' => $history,
        'dates' => $dates,
        'dividends' => [],
        'source' => 'TEFAS tarihsel veri',
        'updatedAt' => date(DATE_ATOM),
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
