# FinansalEB 2 mimarisi

## Değişmez kurallar

1. `main` dalı ve v0.3.19 kullanıcı verisi değiştirilmeyecek.
2. Aynı Android `applicationId` ve kalıcı imza korunarak uygulama yerinde güncellenebilecek.
3. Kullanıcı onayı olmadan temettü nakde veya "alındı" toplamına yazılmayacak.
4. Fiyat/veri kaynağı kesildiğinde son doğrulanmış kayıt silinmeyecek.
5. Finansal hesaplar saf, otomatik test edilen çekirdek fonksiyonlarda tutulacak.
6. Web/PWA ve Android aynı `web/` kaynağından üretilecek; Android varlıkları derlemeden önce eşitlenecek.

## Hedef yapı

- `web/finance-core.js`: işlem defteri, maliyet, kâr/zarar, temettü ve veri geçişi kuralları.
- `web/app.js`: ekranlar, formlar ve kullanıcı etkileşimi.
- `server/api.php`: fiyat, fon, haber, takvim ve kaynak bağdaştırıcıları; önbellek ve sağlık kontrolü.
- `android/app/`: WebView kabuğu, arka plan yenileme, bildirimler, widget ve kalıcı APK imzası.
- `tests/`: finansal regresyon, statik proje ve kullanıcı akışı testleri.

## Aşamalı geçiş

### Alpha 1 — veri doğruluğu

- Eski veriyi aynı depolama anahtarından v2 şemasına güvenli taşıma.
- Otomatik "alındı" hatasını kaldırma.
- Onaylı net temettü tutarını sabitleme.
- Finans çekirdeği testlerini APK derlemesine bağlama.

### Alpha 2 — işlem ve performans motoru

- Çoklu alış/satış, komisyon, gerçekleşen ve gerçekleşmemiş kâr/zarar testleri.
- İşlem tarihindeki kur ile TL maliyet, güncel kur etkisi ve yatırım getirisi ayrımı.
- Günlük getiri ile toplam getirinin ayrı ve açıklanabilir gösterimi.
- Hatalı/eksik geçmiş kayıtlar için veri sağlık merkezi.

### Alpha 3 — güvenilir veri katmanı

- Kaynak önceliği, zaman damgası, gecikme ve son başarılı veri görünürlüğü.
- TCMB/TÜİK/KAP/TEFAS içeriklerinde resmî kaynak doğrulaması.
- Haberlerde güncellik, bağlantı, etki yönü ve portföy ilişkisi.

### Beta — profesyonel arayüz ve raporlar

- Basit yatırımcı için sade özet; ayrıntı isteyen kullanıcı için açıklanabilir hesap dökümleri.
- Varlık, sektör, ülke, para birimi ve gelir türü dağılımları.
- Temettü takvimi, hedef, yeniden yatırım ve finansal özgürlük projeksiyonu.
- Android widget/bildirimler ve erişilebilir mobil yerleşim.

### Kararlı sürüm

- Eski veriyle gerçek cihaz yükseltme testi.
- İmzalı APK, geri dönüş planı, yedek/geri yükleme ve sürüm notları.
- Ana kullanıcı akışlarının uçtan uca testi ve hesaplama doğrulama raporu.
