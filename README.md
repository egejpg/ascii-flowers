# ascii-flowers

Terminalde donen, 3B bir ASCII cicek buketi. Pembe sakayiklar, koyu bordo ve beyaz guller,
goncalar, lilyumlar, dalya, karanfiller, ranunculuslar; okaliptus, cipsofila, pliseli kagit ve
bordo saten fiyonk. Acilista kagit sarilir, cicekler tek tek acar.

Baslik/mesaj/imza yazilari varsayilan olarak kapali; `ayarlar.js` icinde `yazilar: true`
ya da `node buket.js --yazili` ile acilir.

## Calistirma

Sadece Node.js (18+) yeterli, paket kurulumu yok.

```
node buket.js
```

Terminal penceresi ne kadar buyukse buket o kadar detayli olur (tam ekran + biraz uzaklastirma onerilir).

| tus | ne yapar |
| --- | --- |
| bosluk | donmeyi durdur / devam |
| sol / sag ok | elle cevir |
| yukari / asagi ok | kamera egimi |
| `+` / `-` | hiz |
| `r` | yonu degistir |
| `n` | sonraki mesaj |
| `h` | yardim satirini gizle |
| `q` | cikis |

## Kisisellestirme

Her sey [ayarlar.js](ayarlar.js) icinde: `kime`, `kimden`, `imza`, `mesajlar` ve `buket` (cicek turleri, adetleri, renkleri).

Dosyayi degistirmeden de olur:

```
node buket.js --kime Deniz --mesaj "iyi ki varsin"
```

Diger secenekler: `--kimden`, `--imza`, `--tohum <sayi>` (cicekleri baska yerlere dizer), `--hiz`, `--egim`,
`--uzaklik`, `--fps`, `--girissiz` (acilis animasyonunu atla), `--ascii` (kalp yerine `<3`).
Ayni ayarlar ortam degiskeni olarak da verilebilir: `BUKET_KIME`, `BUKET_MESAJ`, `BUKET_TOHUM`, `BUKET_GIRIS=0` ...

Tek kare almak icin (ekran goruntusu / test): `node buket.js --kare 9 --boyut 160x50`

Renkler 24-bit; terminal desteklemiyorsa `BUKET_RENK=256` ile 256 renge gecer.

## Yapi

```
buket.js            terminal: dongu, tuslar, ayarlar
ayarlar.js          kisisellestirme
src/cicekler.js     cicek turleri (kenar sekli + doku fonksiyonu)
src/sahne.js        3B sahne: ambalaj, kurdele, yesillik, ciceklerin yerlesimi
src/cizici.js       izdusum, derinlik tamponu, isik, karakter secimi
src/suslemeler.js   kalpler, dusen yapraklar, yildizlar, mesaj yazimi
src/renkler.js      paletler ve malzemeler
src/terminal.js     ANSI cikti
```

`src/` terminalden bagimsiz; ayni cizici web surumunde de kullanilacak.

Yeni bir cicek turu eklemek icin `src/cicekler.js` icine `kenar` (yaprak siniri) ve `doku`
(yaprak deseni) fonksiyonlari olan bir tanim eklemek yeterli.
