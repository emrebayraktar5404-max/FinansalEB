# Değişiklik Günlüğü

## v0.2.1 — Alış tarihi ve doğru temettü hak edişi

- Varlık ekleme/düzenleme formuna zorunlu **İlk alış tarihi** alanı eklendi.
- Temettü tutarı artık bugünkü adetle değil, hak kullanım tarihinden önce elde bulunan pay adediyle hesaplanır.
- Hak kullanım tarihinde veya sonrasında yapılan alışlar ilgili temettüye hak kazandırmaz.
- Sonraki alış ve satış işlemleri geçmiş temettü miktarını geriye dönük değiştirmez.
- İnternetten çekilen geçmiş şirket temettüleri otomatik olarak “alındı” işaretlenmez.
- V0.2.0’daki yanlış otomatik “alındı” kayıtları ilk açılışta temizlenir; manuel girilmiş gerçek ödemeler korunur.
- Hak kazanılmayan olaylar **Hak kazanılmadı**, hak kazanılmış ancak kullanıcıca doğrulanmamış eski olaylar **Hak kazanıldı · doğrulanmadı** etiketiyle gösterilir.
- “Bu yıl alınan” raporu yalnız kullanıcının gerçekten kaydettiği/doğruladığı ödemeleri toplar.
- Geçmiş, hak kazanılmamış olaylar yıllık tahmini gelir ve yaklaşan ödeme hesaplarına girmez.
- Geçiş ve hak ediş senaryoları Chromium smoke testine eklendi.

## v0.2.0 — Otomatik varlık bulma ve form düzeltmeleri

- BIST, ABD hissesi, ETF ve kripto için APK içinden çalışan gerçek sembol araması eklendi.
- TEFAS fon kodu yazıldığında fon adı, son fiyat ve günlük değişim otomatik doldurulur.
- WebView CORS engeline takılmamak için Android yerel piyasa veri köprüsü eklendi.
- Varlık ekleme ekranında şirket/fon adı, veri sembolü, para birimi ve güncel fiyat otomatik tamamlanır.
- Kullanıcıya gereksiz olan “Veri sembolü” alanı gizlendi; BIST için `.IS` otomatik yönetilir.
- Formun altındaki **Vazgeç** düğmesinin çalışmaması düzeltildi.
- Alt Vazgeç düğmesinin küçük kare görünmesine yol açan stil çakışması giderildi.
- Android geri tuşu, açık formu kapatacak şekilde düzenlendi.
- Arka plan/widget fiyat yenilemesi TEFAS dahil APK içi veri istemcisini kullanır.
- PHP veri geçidine `search` uç noktası eklendi.
- Gelecek APK güncellemeleri için sabit kişisel imza anahtarı eklendi.
- Otomatik arama, Vazgeç ve TEFAS doldurma akışları Chromium smoke testine eklendi.

## v0.1.1 — APK derleme düzeltmesi

- Android Gradle Plugin 8+ için `BuildConfig` üretimi etkinleştirildi.
- `MainActivity` içindeki `BuildConfig.DEBUG` derleme hatası giderildi.

## v0.1.0 — 27 Ağustos 2026

- Özgün Türkçe Finansal(EB) mobil arayüzü
- BIST, ABD, ETF, TEFAS, altın, gümüş, FX, kripto ve özel varlık portföyü
- Temettü merkezi, takvim, hedefler ve finansal özgürlük projeksiyonu
- Açıklanmış / şirket teklifi / tahmini / geçmiş temettü ayrımı
- Otomatik fiyat yenileme, son değer koruma ve kişisel PHP veri geçidi
- JSON yedekleme ve `.ics` takvim aktarımı
- Android WebView kabuğu, bildirimler ve iki ana ekran widget'ı
- GitHub Actions üzerinden otomatik debug APK derleme
- PWA ve çevrimdışı uygulama kabuğu
