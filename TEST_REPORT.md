# Finansal(EB) v0.3.0 Test Raporu

## Otomatik hesap testleri

- Alış tarihi ex-date sonrasındaysa hak edilen pay: 0
- Alış tarihi ex-date öncesindeyse doğru pay ve net temettü
- Tahmini temettü otomatik nakit kaydı oluşturmaz
- Aynı temettü olayı iki kez nakde aktarılamaz
- İki farklı alışın hareketli ağırlıklı ortalaması
- Kısmi satışta gerçekleşen kâr/zarar
- Alış ve satış komisyonlarının doğru etkisi
- Satış + temettü + nakit girişinin nakit bakiyesi
- Ex-date günü yapılan satışın hak edişi geriye dönük değiştirmemesi

## Statik kontroller

- `web/ledger.js`, `web/data.js`, `web/app.js` JavaScript sözdizimi
- PHP API dosyalarının sözdizimi
- Android Manifest ve XML kaynaklarının ayrıştırılması
- Zorunlu proje dosyalarının varlığı
- Web varlıklarının Android assets klasörüne eşitlenmesi

## Gerçek APK testi

GitHub Actions, Android SDK 35 ve Gradle 8.9 ile gerçek `assembleDebug` derlemesi yapar. Derleme veya testlerden biri başarısız olursa APK artefaktı yüklenmez.

## Canlı veri testi sınırı

Dış veri kaynakları ağ durumu, hız sınırı veya kaynak yapısı nedeniyle geçici hata verebilir. Bu durumda uygulama son başarılı fiyatı korur. Temettü nakit kaydı, yalnız kaynak durumundan değil işlem defteri ve doğrulanmış tarihlerden türetilir.
