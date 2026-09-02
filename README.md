# FinansalEB 2 — geliştirme dalı

`finansaleb-2` dalı, mevcut uygulamanın verilerini kaybetmeden profesyonel ve test edilebilir bir FinansalEB 2 sürümüne geçiş içindir. `2.0.0-alpha.2`; güvenli temettü kurallarına ek olarak alış, satış ve çok para birimli nakit hesaplarını aynı işlem defterinde birleştirir.

Mevcut cihaz verileri aynı `finansaleb_state_v1` anahtarından okunur ve açılışta güvenli biçimde v3 şemasına taşınır. Eski işlemlere tahminî nakit hareketi eklenmez; yeni alış/satışlar nakit defterine otomatik bağlanır. `main` dalı ve v0.3.19 kayıtları değiştirilmez.

## Önceki sürümün kullanım bilgileri

Kişisel kullanım için Türkçe Android/PWA yatırım, işlem ve temettü takip uygulaması.

## Bu sürümdeki kritik değişiklik

v0.3.0, varlık adedini elle tutmak yerine **tarihli işlem defterinden** hesaplar.

- Alış: tarih, adet, birim fiyat, komisyon ve nakit etkisi
- Satış: tarih, adet, birim fiyat, komisyon ve gerçekleşen kâr/zarar
- Nakit: para yatırma, çekme ve masraf
- Temettü: hak kullanım tarihindeki pay, brüt, stopaj, net ve nakit kaydı

### Temettü güvenlik kuralı

Bir olay yalnızca aşağıdaki şartların tamamında otomatik nakde aktarılır:

1. Durum `Açıklanmış`, `Doğrulanmış` veya `Ödendi` olmalı.
2. Hak kullanım tarihi bulunmalı.
3. Hak kullanım tarihinden **önce** portföyde pay bulunmalı.
4. Doğrulanmış ödeme tarihi gelmiş olmalı.
5. Aynı olay için daha önce temettü işlemi oluşmamış olmalı.

`Tahmini`, `Şirket teklifi` ve ödeme tarihi bilinmeyen geçmiş kaynak kayıtları **alınmış sayılmaz**.

## Kâr/zarar yöntemi

Satışlarda hareketli ağırlıklı ortalama maliyet kullanılır. Alış komisyonu maliyete eklenir; satış komisyonu satış hasılatından düşülür. Gerçekleşen ve gerçekleşmemiş kâr/zarar ayrı raporlanır.

## Piyasa bölümü

- Portföydeki şirketlere özel haber araması
- Genel piyasa ve makro başlıklar
- Temettü/KAP odaklı başlıklar
- Önemli yatırımcıların yazıları için başlık, kısa özet ve özgün kaynak bağlantısı
- SEC 13F kamu bildirimlerinden gecikmeli örnek portföy görünümü

Tam yazılar uygulama içinde yeniden yayımlanmaz. Kaynak adı, tarih, kısa özet ve bağlantı gösterilir.

## Otomatik veri

APK sürümü fiyat, fon, haber ve SEC sorgularını Android'in ağ katmanından yapar. Web/PWA sürümünde tarayıcı CORS kısıtları nedeniyle `server/` klasörünün kişisel hostinge kurulması önerilir.

Veri kaynağı cevap vermezse mevcut kayıt silinmez; son başarılı fiyat korunur ve kullanıcı manuel işlem girebilir.

## GitHub üzerinden APK

1. Bu paketin içeriğini GitHub deposunun köküne yükleyin.
2. `.github/workflows/build-apk.yml` dosyasının bulunduğunu kontrol edin.
3. `Actions > FinansalEB Android APK` bölümünü açın.
4. Otomatik derlemeyi bekleyin veya `Run workflow` çalıştırın.
5. Yeşil tikten sonra `Artifacts > FinansalEB-v0.3.0-APK` paketini indirin.
6. ZIP içindeki `FinansalEB-v0.3.0-debug.apk` dosyasını kurun.

## Eski verinin taşınması

Uygulama önceki yerel kayıtları bulursa varlıkları açılış alış işlemine dönüştürür. Eski sürümde alış tarihi yoksa geçici tarih atanır ve üstte kontrol uyarısı gösterilir. Bu tarih düzeltilmeden temettü hak ediş raporuna güvenilmemelidir.

Eski sürümün yalnızca ödeme tarihi geçmiş olduğu için otomatik “alındı” saydığı temettü kayıtları taşınmaz.

## Yedekleme

`Ayarlar > JSON yedeği al` ile yedek alın. APK kaldırılırsa Android yerel uygulama verisini silebilir.

## Özel imza anahtarı

`android/signing` klasörü APK güncellemelerinde aynı imzayı korumak için kullanılır. GitHub deposu **Private** kalmalı ve bu klasör paylaşılmamalıdır.

## Yasal not

Uygulama kişisel kayıt ve izleme aracıdır; yatırım, vergi veya hukuk danışmanlığı değildir. Otomatik veriler kaynağından gecikmeli, eksik veya hatalı gelebilir. Emir vermeden önce aracı kurum ve resmî bildirim doğrulanmalıdır.
