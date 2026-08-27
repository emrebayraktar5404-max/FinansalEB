# Veri Kaynakları ve Güvenilirlik Kuralları

Finansal(EB), herhangi bir ücretli veri aboneliğini zorunlu tutmamak için kaynakları varlık türüne göre ayırır.

| Varlık | Birincil yöntem | Uygulama davranışı |
|---|---|---|
| BIST | Gecikmeli piyasa fiyatı; sembol `.IS` ile | Fiyat, önceki kapanış ve geçmiş temettü olayları |
| ABD / ETF | Gecikmeli piyasa fiyatı | Fiyat, geçmiş seri, temettü olayları |
| TEFAS | TEFAS tarihsel fon verisi, tercihen kişisel PHP geçidi | Son fiyat ve kısa geçmiş seri |
| Gram altın | Altın ons × USD/TRY ÷ 31,1034768 | TRY/gram bileşik fiyat |
| Gram gümüş | Gümüş ons × USD/TRY ÷ 31,1034768 | TRY/gram bileşik fiyat |
| Döviz | İlgili döviz/TRY çifti | Baz para dönüşümü |
| Kripto | Desteklenen piyasa sembolü | USD fiyatı ve TRY dönüşümü |
| Tahvil/eurobond/özel | Manuel veya kişisel sunucu | Kullanıcının girdiği fiyat korunur |
| BIST temettü duyurusu | KAP bağdaştırıcısı, best-effort | Açıklanmış/şirket teklifi olarak ayrı etiket |

## Durum etiketleri

- **Açıklanmış:** Tarih ve tutar bir veri akışında geleceğe dönük olarak bulunmuştur.
- **Şirket teklifi:** Yönetim kurulu teklifi görülmüş, genel kurul/ödeme süreci tamamlanmamış olabilir.
- **Tahmini:** Geçmiş ödeme sıklığı ve tutar düzeninden üretilen yaklaşık kayıt.
- **Geçmiş:** Ödeme tarihi geride kalmış piyasa olayı.
- **Son değer:** Kaynak geçici olarak yanıt vermediği için son başarılı kayıt gösterilir.

Tahmini kayıt, açıklanmış kayıtla aynı görünmez ve yaklaşık işaretiyle sunulur. Resmî kayıt geldiğinde yakın tarihli tahmini olayın üzerine yazılmaz; tekrar oluşması engellenir.

## Neden tamamen ücretsiz veri için garanti verilemez?

Kodda ücretli abonelik veya varlık limiti yoktur. Buna rağmen dış veri sağlayıcıları kullanım koşullarını, hız sınırlarını veya uç noktalarını değiştirebilir. Bu nedenle:

- kişisel sunucu önbelleği,
- son başarılı değeri koruma,
- kaynak durumunu ekranda gösterme,
- manuel düzeltme,
- açıklanmış/tahmini ayrımı

birlikte kullanılır.

## Güvenlik

Kişisel sunucuya adet, maliyet, toplam portföy değeri veya kişisel bilgi gönderilmez. Sunucu yalnız fiyat istenen sembolü, varlık türünü ve yetkilendirme token'ını alır.
