# Finansal(EB) v0.2.1 Test Raporu

**Test tarihi:** 27 Ağustos 2026  
**Durum:** Kaynak, PWA ve sunucu katmanında smoke/statik testler başarılı. Android kaynak projesi statik olarak doğrulandı; piyasa istemcisi ayrıca `javac --release 17` ile derlendi. Bu çalışma ortamında Android SDK/Gradle bulunmadığı için APK binary derlemesi yerel olarak çalıştırılmadı.

## Başarılı kontroller

- JavaScript sözdizimi: `app.js`, `sw.js`
- PWA manifest JSON doğrulaması
- PHP sözdizimi: `api.php`, `config.sample.php`
- PHP `health` uç noktası: `ok: true`
- 12 Android XML kaynağının ayrıştırılması
- Java → Android resource (`R.*`) referanslarının karşılığı
- Manifestte bildirilen Activity/Receiver/Service sınıflarının varlığı
- `web/` ile Android `assets/` dosyalarının SHA-256 eşitliği
- Dashboard, Portföy, Temettü, Takvim ve Analiz sayfalarının Chromium smoke testi
- Ayarlar ekranı ve widget yardım ekranı
- `.ics` temettü takvimi indirme testi
- Yeni varlık formundaki alanların varlığı ve **İlk alış tarihi** zorunluluğu
- V0.2.0 yerel verisinin v0.2.1 veri modeline otomatik geçişi
- Otomatik geçmiş temettülerin `received=false` olarak düzeltilmesi
- Hak kullanım tarihinden sonra alınan hisse için temettü tutarının sıfır olması
- 10 gün önce alınan hissenin daha eski temettüsünün “Bu yıl alınan” raporuna girmemesi
- Formun altındaki **Vazgeç** düğmesinin modalı kapatma testi
- BIST `DEVA` sembolünün şirket adı, `.IS` veri sembolü ve fiyatla otomatik doldurma testi
- TEFAS `TMG` kodunun fon adı ve fiyatla otomatik doldurma testi
- Android yerel veri istemcisi Java 17 sözdizimi/tür kontrolü (org.json uyumlu stub ile)
- Tarayıcı konsolu ve çalışma zamanı: hata yok

## Android derleme doğrulaması

`.github/workflows/build-apk.yml` şu sabit bileşenlerle hazırlanmıştır:

- JDK 17
- Android SDK 35
- Android Build Tools 35.0.0
- Gradle 8.9
- Android Gradle Plugin 8.7.3
- Sabit kişisel JKS imzası (`android/signing/`)

İş akışı `:app:assembleDebug` çalıştırır ve kurulabilir `FinansalEB-v0.2.1-debug.apk` artefaktını oluşturur. Binary oluşturulduktan sonra gerçek cihazda şu kontroller ayrıca yapılmalıdır:

1. İlk açılış ve bildirim izni
2. WebView yerel arayüzü
3. Android dosya seçici ile JSON geri yükleme
4. Widget ekleme ve manuel yenileme
5. Arka plan JobScheduler yenilemesi
6. Telefon yeniden başlatıldıktan sonra görevlerin devamı
7. Android 13, 14 ve 15 üzerinde bildirim/widget davranışı
8. Gerçek ağda DEVA/TUPRS gibi BIST sembol araması
9. Gerçek ağda TMG gibi TEFAS fon kodu sorgusu
10. V0.2.0 üzerine uygulama kaldırılmadan güncelleme
11. Gerçek alış tarihiyle geçmiş temettü hak kontrolü

## Bilinen sınırlar

- Ücretsiz dış veri uç noktaları ağsız test ortamında canlı olarak çağrılamadı.
- Yerel PHP test ortamında cURL uzantısı kapalı olduğu için `health` sonucu TEFAS özelliğini pasif gösterdi; gerçek hostingde PHP cURL etkin olmalıdır.
- KAP bağdaştırıcısı HTML yapısına bağlı “best-effort” katmandır; resmî REST erişimi sağlanırsa onunla değiştirilmelidir.
- Gelecek temettü verisi resmî olarak doğrulanmıyorsa uygulama **Tahmini** etiketi kullanır.
