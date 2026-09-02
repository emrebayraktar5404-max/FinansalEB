# Değişiklik Günlüğü

## 2.0.0-alpha.1

- `finansaleb-2` geliştirme dalı başlatıldı.
- Mevcut `finansaleb_state_v1` kayıtları korunarak veri şeması v2'ye taşındı.
- Tarihi geçmiş dış kaynak temettülerinin kullanıcı onayı olmadan "alındı" sayılması kaldırıldı.
- Kullanıcının onayladığı net temettü TL tutarı, daha sonraki kur değişimlerinden etkilenmeyecek şekilde sabitlendi.
- Dış kaynak yenilemesinin manuel temettü onayını ezmesi önlendi.
- Finans çekirdeği için Node.js regresyon testleri APK iş akışına eklendi.

## 0.3.0

- Alış tarihi zorunlu işlem modeli eklendi.
- Çoklu alış ve satış işlemleri eklendi.
- Hareketli ağırlıklı ortalama maliyet hesabı eklendi.
- Satış komisyonu ve gerçekleşen kâr/zarar raporu eklendi.
- Nakit giriş/çıkış ve para birimi bazlı nakit hesapları eklendi.
- Temettü hak edişi ex-date öncesindeki pay adedinden hesaplanmaya başladı.
- Ödeme tarihi geçmiş olayı otomatik “alındı” sayan eski davranış kaldırıldı.
- Tahmini ve doğrulanmamış temettülerin otomatik nakde aktarılması engellendi.
- Doğrulanmış, hak edilmiş ve vadesi gelmiş temettü için tekil nakit kaydı eklendi.
- Geçmiş temettü taraması güvenli `HISTORICAL_UNCONFIRMED` statüsüne geçirildi.
- İşlem düzenleme ve silme eklendi.
- Portföy haberleri, piyasa başlıkları, yatırımcı yazıları ve SEC 13F modülü eklendi.
- Android widget özeti yeni hesaplama defterine bağlandı.
- Eski veriler için alış tarihi inceleme akışı eklendi.
- Hesaplama regresyon testleri GitHub Actions derlemesine eklendi.
