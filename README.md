# Finansal(EB) v0.1.0

**Finansal(EB)**, Emre Bayraktar için hazırlanmış; BIST, ABD hisseleri, ETF, TEFAS fonu, altın, gümüş, döviz, kripto, tahvil/eurobond, nakit ve özel varlıkları aynı portföyde takip eden Türkçe kişisel yatırım uygulamasıdır.

Arayüz; Stock Events'in hızlı temettü akışı ile Snowball Analytics'in portföy röntgeni yaklaşımından esinlenir. Tasarım ve kaynak kod özgündür; iki uygulamanın marka, ekran veya kodunun birebir kopyası değildir.

## Bu sürümde çalışan özellikler

- Toplam portföy değeri, maliyet, kâr/zarar, günlük değişim ve kur dönüşümü
- Alış, satış ve temettü işlemleri; adet, ortalama maliyet, komisyon ve stopaj kaydı
- BIST, ABD hissesi, ETF, TEFAS, altın, gümüş, döviz, kripto, tahvil/eurobond, nakit ve özel varlık
- Önümüzdeki 12 ay brüt/net temettü, aylık ortalama, temettü verimi ve maliyete göre verim
- **Açıklanmış**, **şirket teklifi**, **tahmini** ve **geçmiş** ödeme ayrımı
- Aylık temettü nakit akışı, ödeme/hak kullanım takvimi ve yaklaşan ödemeler
- Varlık türü ve para birimi dağılımı, hedef ağırlık ve yeniden dengeleme farkı
- Aylık gider karşılama, yıllık gelir hedefi ve finansal özgürlük projeksiyonu
- Otomatik fiyat yenileme, son başarılı değeri koruma ve veri kaynağı durumu
- Yerel JSON yedekleme/geri yükleme; portföy verileri varsayılan olarak cihazda kalır
- Temettü bildirimleri
- Android için **Portföy Özeti** ve **Sıradaki Temettü** ana ekran widget'ları
- Google Calendar, Apple Calendar ve Outlook ile açılabilen `.ics` temettü takvimi dışa aktarımı
- İnternet kesildiğinde uygulama kabuğunu çevrimdışı açan PWA desteği
- Kişisel PHP veri geçidi: önbellek, token, TEFAS ve KAP bağdaştırıcıları

## Proje yapısı

```text
FinansalEB/
├── web/                    # Telefon uyumlu PWA arayüzü
├── android/                # Android Studio / APK projesi
├── server/                 # İsteğe bağlı kişisel PHP veri geçidi
├── scripts/                # Eşitleme ve derleme yardımcıları
├── docs/                   # Kurulum, veri ve özellik belgeleri
└── .github/workflows/      # Tek tıkla APK derleyen GitHub Actions
```

## APK oluşturma

### GitHub Actions ile

1. Bu klasörün tamamını özel bir GitHub deposuna yükleyin.
2. Depoda **Actions → FinansalEB Android APK → Run workflow** yolunu açın.
3. İş tamamlanınca **FinansalEB-v0.1.0-APK** artefaktını indirin.
4. Zip içindeki `FinansalEB-v0.1.0-debug.apk` dosyasını telefona kurun.

Bu debug APK Android tarafından geliştirme anahtarıyla imzalanır ve doğrudan kurulabilir. Kalıcı dağıtım anahtarıyla release imzası sonraki sürümde eklenebilir.

### Android Studio ile

1. Android Studio'da `android/` klasörünü açın.
2. Gradle senkronizasyonunun tamamlanmasını bekleyin.
3. **Build → Build APK(s)** seçeneğini çalıştırın.
4. Çıktı: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Kişisel sunucu kurulumu

1. `server/` içeriğini örneğin `https://alanadiniz.com/finansaleb-api/` klasörüne yükleyin.
2. `config.sample.php` dosyasını `config.php` olarak kopyalayın.
3. `API_TOKEN` alanına uzun, rastgele bir anahtar yazın.
4. `cache/` klasörüne PHP yazma izni verin.
5. Tarayıcıda `api.php?action=health&token=ANAHTAR` çağrısının `ok: true` döndürdüğünü kontrol edin.
6. Uygulamada **Ayarlar → Kişisel veri sunucusu** alanına `.../api.php` adresini ve token'ı girin.

Sunucu zorunlu değildir. Ancak TEFAS/KAP isteklerini önbelleğe almak, ücretsiz kaynakların hız sınırına daha az takılmak ve veri kurallarını kendi kontrolünüzde tutmak için önerilir.

## Veri doğruluğu

- Uygulama işlem emri vermez ve yatırım tavsiyesi üretmez.
- Ücretsiz kaynaklar gecikmeli olabilir, erişimi sınırlandırabilir veya uç noktalarını değiştirebilir.
- Gelecek ödeme tarihi resmî bir bildirimle doğrulanmadıysa açıkça **Tahmini** gösterilir.
- Vergi/stopaj alanı kullanıcı tarafından ayarlanır; uygulama vergi danışmanlığı yapmaz.
- Son başarılı fiyat ve kur, geçici veri hatasında silinmez.

## Gizlilik

- Portföy, işlem ve hedefler varsayılan olarak cihazın yerel depolamasındadır.
- Uygulamada hesap veya abonelik sistemi yoktur.
- Kişisel sunucu kullanılırsa yalnızca ayarladığınız sunucuya piyasa sembolleri gönderilir; adet ve maliyet bilgisi gönderilmez.
- Yedek dosyası kullanıcının kendi cihazına kaydedilir.

Ayrıntılar için `docs/INSTALL.md`, `docs/DATA_SOURCES.md`, `docs/FEATURES.md` ve `docs/TEST_REPORT.md` dosyalarına bakın.
