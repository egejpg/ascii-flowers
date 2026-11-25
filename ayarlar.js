// =====================================================================
//  BUKETI KISIYE OZEL YAPMAK ICIN SADECE BU DOSYAYI DUZENLE
//  (Turkce karakter yerine ingilizce harf kullan: i, s, g, u, o, c)
// =====================================================================

export const AYARLAR = {
  // Baslik, mesajlar ve imza gorunsun mu (simdilik kapali)
  yazilar: false,

  // Ustte "~ <isim> icin ~" yazar. Bos birakirsan "~ senin icin ~" yazar.
  kime: '',
  kimden: 'Ege',
  // En alttaki imza. null ise "sevgiyle, <kimden>" olur.
  imza: null,

  // Sirayla yazilip silinen mesajlar
  mesajlar: [
    'bu buketteki her cicek, seni dusundugum bir an icin',
    'pembeler gulusune, bordolar kalbime ait',
    'bu buket hic solmayacak, cunku satir satir yazildi',
    'bazen kelimeler yetmiyor, o yuzden cicek getirdim',
    'iyi ki varsin',
  ],

  // Buketteki cicekler.
  //   tur:   sakayik | gul | gonca | dalya | karanfil | ranunkulus | lilyum
  //   renk:  bordo | pembe | macenta | acikPembe | beyaz   ya da iki renk
  //          (yazmazsan turun kendi rengi kullanilir)
  //   boyut: istege bagli, 0.08 - 0.36 arasi
  buket: [
    { tur: 'sakayik', adet: 2 },                        // pembe
    { tur: 'gul', adet: 3 },                            // koyu bordo
    { tur: 'gul', adet: 1, renk: 'beyaz' },             // beyaz gul
    { tur: 'lilyum', adet: 2 },                         // ortasi macenta, kenari acik pembe
    { tur: 'dalya', adet: 1 },                          // macenta -> pembe
    { tur: 'karanfil', adet: 2 },                       // pembe, kenari macenta
    { tur: 'ranunkulus', adet: 1 },                     // macenta -> acik pembe
    { tur: 'ranunkulus', adet: 1, renk: ['beyaz', 'acikPembe'] }, // beyaz, ortasi pembe
    { tur: 'gonca', adet: 3 },                          // bordo gul goncasi
  ],

  tohum: 7,            // degistirirsen cicekler baska yerlere dizilir
  fps: 30,
  donmeHizi: 0.45,     // radyan / saniye
  egim: 0.42,          // kamera ne kadar yukaridan baksin
  kameraUzaklik: 4.2,  // kucuk = daha dramatik perspektif
  giris: true,         // acilis animasyonu
  ascii: false,        // true: kalp yerine * ve <3 kullanir (font sorunu olursa)
};
