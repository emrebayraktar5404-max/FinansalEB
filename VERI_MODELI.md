# Veri Modeli

## Instrument
`id, symbol, dataSymbol, name, type, currency, currentPrice, previousClose, withholdingRate`

## Transaction
`BUY, SELL, DIVIDEND, CASH_IN, CASH_OUT, FEE`

Alış/satış için: `instrumentId, date, quantity, unitPrice, commission, affectsCash`.

Temettü için: `eventId, quantity, grossAmount, taxAmount, netAmount, date, currency`.

## DividendEvent
`instrumentId, exDate, paymentDate, grossPerShare, withholdingRate, status, sourceUrl`.

## Durumlar

- `ANNOUNCED`: açıklanmış ve ödeme tarihi doğrulanmışsa otomatik işlenebilir
- `CONFIRMED`: doğrulanmış
- `PAID`: kaynakta ödendi
- `PROPOSAL`: teklif; otomatik işlenmez
- `ESTIMATED`: tahmin; otomatik işlenmez
- `HISTORICAL_UNCONFIRMED`: geçmiş kaynak kaydı; ödeme tarihi doğrulanana kadar otomatik işlenmez
