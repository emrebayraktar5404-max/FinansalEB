# Finansal(EB) Kurulum Rehberi

## 1. En hızlı kullanım: PWA

`web/` klasöründeki dosyaları HTTPS çalışan bir alt klasöre yükleyin. Örnek yapı:

```text
public_html/finansaleb/
  index.html
  app.js
  styles.css
  sw.js
  manifest.webmanifest
  icon-192.png
  icon-512.png
```

Android Chrome'da sayfayı açın, menüden **Ana ekrana ekle / Uygulamayı yükle** seçeneğini kullanın. PWA çevrimdışı açılır; ancak gerçek Android widget'ları yalnız APK sürümünde bulunur.

## 2. APK derleme

### GitHub Actions

Depo kökünde bulunan `.github/workflows/build-apk.yml` dosyası şunları otomatik yapar:

- Java 17 kurulumu
- Android SDK 35 kurulumu
- Gradle 8.9 kurulumu
- PWA dosyalarının APK varlıklarına kopyalanması
- Debug APK derleme ve SHA-256 özeti oluşturma

Çıktı adı: `FinansalEB-v0.1.0-debug.apk`.

### Android Studio

- Android Studio güncel kararlı sürüm
- JDK 17
- Android SDK 35
- Build Tools 35.0.0 veya üzeri

`android/` klasörünü proje olarak açın. Gradle senkronizasyonundan sonra `assembleDebug` görevi kurulabilir APK üretir.

## 3. Telefona kurma

1. APK'yı telefona kopyalayın.
2. Android, kullandığınız dosya yöneticisi/tarayıcı için **Bu kaynaktan uygulama yükleme** izni isteyebilir.
3. APK'yı açıp kurulumu tamamlayın.
4. İlk açılışta **Kendi portföyüm** seçeneği gerçek ve boş veri alanı açar; **Örneği incele** yalnız demo verisidir.

## 4. Widget ekleme

1. Uygulamayı en az bir kez açın ve portföyü kaydedin.
2. Telefon ana ekranında boş bir alana basılı tutun.
3. **Widget'lar → Finansal(EB)** yolunu açın.
4. `Portföy Özeti` veya `Sıradaki Temettü` widget'ını ekleyin.
5. Widget üzerindeki yenile simgesi arka plan veri görevini tetikler.

## 5. Sunucu kurulumu

PHP gereksinimleri:

- PHP 8.1+
- cURL
- JSON
- DOM
- mbstring önerilir
- HTTPS

`server/config.sample.php` → `server/config.php` olarak kopyalayın. Token'ı değiştirin; örnek token'ı kullanmayın. `cache/` klasörü web sunucusu tarafından yazılabilir olmalıdır.

Uygulama sunucusuz da çalışır. Kişisel sunucu; önbellek, TEFAS/KAP bağdaştırıcısı ve dış kaynağa daha kontrollü erişim sağlar.

## 6. Yedek ve geri yükleme

**Ayarlar → Verilerimi dışa aktar** ile JSON yedeği alın. Android APK'da dosya `İndirilenler/FinansalEB` klasörüne kaydedilir. Geri yüklemeden önce mevcut verinin ayrıca yedeğini almak güvenlidir.
