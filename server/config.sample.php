<?php
/**
 * Bu dosyayı config.php adıyla kopyalayın.
 * API_TOKEN değerini uzun ve tahmin edilemez bir metin yapın.
 */
return [
    'API_TOKEN' => 'BURAYA_UZUN_KISISEL_ANAHTAR_YAZIN',
    'ALLOWED_ORIGINS' => ['*'], // APK/PWA kişisel kullanım. İsterseniz kendi alan adınızla sınırlandırın.
    'CACHE_DIR' => __DIR__ . '/cache',
    'QUOTE_CACHE_SECONDS' => 900,
    'TEFAS_CACHE_SECONDS' => 1800,
    'DIVIDEND_CACHE_SECONDS' => 21600,
    'ENABLE_KAP_SCRAPER' => true,
    'TIMEZONE' => 'Europe/Istanbul',
    'USER_AGENT' => 'FinansalEB/0.3 (personal portfolio tracker)',
    'SEC_USER_AGENT' => 'FinansalEB/0.3 (add your contact email here)',
];
