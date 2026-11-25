// Cicek turleri. Her tur veriyle tanimlanir:
//   kenar(th, faz) -> 0..1   yapraklarin dis siniri (aciya gore)
//   doku(u, th, fl, o)       u: merkezden kenara 0..1, th: aci (radyan)
//        okur:  o.px        bir karakter hucresinin u cinsinden boyu (cizgi kalinligi icin)
//        yazar: o.ton       parlaklik ekler/cikarir
//               o.cizgi     1: cember yonunde cizgi, 2: merkezden disa cizgi
//                           (karakter ekrandaki yone gore - / | \ secilir)
//               o.karisim   iki renkli cicekte ikinci renge gecis (0..1)
//               o.tablo     ozel renk tablosu (gobek, organ vb.)
//               o.ch        ozel karakter
//   kupa                      ne kadar canak seklinde (0 = duz)
//   renk                      varsayilan palet adi ya da [ic, dis]
//   dolgu                     parlaklik -> karakter (cizgi olmayan yerler)

import { TAU, frac, smooth, gurultu, hash2 } from './matematik.js';
import { TABLOLAR } from './renkler.js';

const yakin = (x) => Math.abs(x - Math.round(x)); // en yakin tam sayiya uzaklik

export const TURLER = {
  // Pembe sakayik: buyuk, firfirli, gevsek katmanlar ve kabarik orta
  sakayik: {
    renk: 'pembe',
    kupa: 0.34,
    dolgu: '~&&',
    ust: '~', alt: '~',
    kenar: (th, f) =>
      0.84 + 0.07 * Math.sin(7 * th + f * 9) + 0.05 * Math.sin(11 * th + f * 17) + 0.04 * Math.sin(17 * th + f * 5),
    doku(u, th, fl, o) {
      const K = Math.max(1.2, Math.min(2, 0.3 / o.px));
      const w = 0.07 * Math.sin(5 * th + fl.faz * 7) + 0.04 * Math.sin(9 * th + fl.faz * 3);
      const L = u * K + w * K;
      const kat = Math.floor(L);
      let t = 0.14 * smooth(0.35, 0.95, L - kat) - 0.04;
      if (u < 0.2) {
        const n = gurultu(th * 3 + fl.faz * 10, u * 22);
        t += 0.08 + 0.3 * (n - 0.5);
        if (Math.abs(n - 0.5) < 0.06) o.cizgi = 1;
      } else if (yakin(L) / K < 0.5 * o.px) {
        o.cizgi = 1; t -= 0.12;
      } else if (o.px < 0.07) {
        const np = 4 + kat * 2;
        const q = (th * np) / TAU + kat * 0.37 + fl.faz;
        if ((yakin(q) * TAU / np) * u < 0.45 * o.px && L - kat > 0.3) { o.cizgi = 2; t -= 0.1; }
      }
      o.ton = t;
    },
  },

  // Koyu bordo gul: sarmal
  gul: {
    renk: 'bordo',
    kupa: 0.5,
    dolgu: '%@@',
    kenar: (th, f) => 0.86 + 0.14 * Math.sqrt(Math.abs(Math.cos(2.5 * th + f * 7))),
    doku(u, th, fl, o) {
      const N = Math.max(1.2, Math.min(1.8, 0.3 / o.px));
      const s = u * N + th / TAU + fl.faz;
      let t = 0.16 * smooth(0.5, 0.95, frac(s)) - 0.02;
      t -= 0.4 * (1 - smooth(0, 0.3, u));
      if (yakin(s) / N < 0.5 * o.px && u > 0.06) { o.cizgi = 1; t -= 0.12; }
      o.ton = t;
    },
  },

  // Bordo gul goncasi: kucuk, derin, sikica sarili
  gonca: {
    renk: 'bordo',
    kupa: 1.2,
    dolgu: '%@@',
    kenar: (th, f) => 0.9 + 0.1 * Math.cos(3 * th + f * 7),
    doku(u, th, fl, o) {
      const N = 1.5;
      const s = u * N + th / TAU + fl.faz;
      let t = 0.1 - 0.25 * (1 - smooth(0, 0.35, u));
      if (yakin(s) / N < 0.5 * o.px && u > 0.1) { o.cizgi = 1; t -= 0.12; }
      o.ton = t;
    },
  },

  // Dalya: halka halka sivri yapraklar, ortasi macenta uclari pembe
  dalya: {
    renk: ['macenta', 'pembe'],
    kupa: 0.26,
    dolgu: 'vvV',
    kenar: (th, f) => {
      const p = frac((th * 16) / TAU + f);
      return 0.74 + 0.26 * (1 - Math.abs(p - 0.5) * 2) ** 1.3;
    },
    doku(u, th, fl, o) {
      o.karisim = smooth(0.15, 0.95, u);
      if (u < 0.12) {
        o.ton = -0.12 + 0.25 * (gurultu(th * 5, u * 30) - 0.5);
        return;
      }
      const K = Math.max(1.5, Math.min(3.5, 0.36 / o.px));
      const L = u * K, halka = Math.floor(L), sr = L - halka;
      const np = 7 + halka * 3;
      const q = (th * np) / TAU + halka * 0.5 + fl.faz;
      const d = Math.abs(frac(q) - 0.5) * 2; // 0 yaprak ortasi, 1 yaprak arasi
      const w = 1 - 0.75 * sr ** 1.6; // yaprak uca dogru daralir
      const disari = (d - w) * 0.5 * (TAU / np) * u; // yaprak sinirina uzaklik (u cinsinden)
      let t;
      if (o.px < 0.07 && Math.abs(disari) < 0.45 * o.px) { o.cizgi = 2; t = -0.1; }
      else if (disari > 0) t = -0.28; // alttaki halka gorunuyor
      else t = 0.12 * (1 - d) + 0.06 * sr;
      o.ton = t;
    },
  },

  // Karanfil: pembe, firfirli, tirtikli kenarlari macenta
  karanfil: {
    renk: ['pembe', 'macenta'],
    kupa: 0.3,
    dolgu: '***',
    ust: '~', alt: '~',
    kenar: (th, f) => {
      const p = frac((th * 28) / TAU + 0.15 * Math.sin(3 * th + f * 7));
      return 0.85 + 0.05 * Math.sin(5 * th + f * 7) + 0.1 * (p < 0.5 ? p * 2 : (1 - p) * 2);
    },
    doku(u, th, fl, o) {
      o.karisim = smooth(0.7, 0.95, u);
      const n = gurultu(th * 4 + fl.faz * 9, u * 5);
      const K = Math.max(1.2, Math.min(2, 0.3 / o.px));
      const L = u * K + 0.8 * n;
      let t = 0.12 * smooth(0.4, 0.95, frac(L)) - 0.04;
      if (u < 0.1) t -= 0.25;
      if (yakin(L) / K < 0.5 * o.px && u > 0.1) { o.cizgi = 1; t -= 0.12; }
      else if (o.px < 0.07 && u > 0.8 && (yakin((th * 30) / TAU) * TAU / 30) * u < 0.35 * o.px) { o.cizgi = 2; t -= 0.12; }
      o.ton = t;
    },
  },

  // Ranunculus: sik, kusursuz halkalar; ortasi macenta disi acik pembe, minik yesil gobek
  ranunkulus: {
    renk: ['acikPembe', 'macenta'],
    kupa: 0.4,
    dolgu: 'ooO',
    kenar: (th, f) => 0.95 + 0.05 * Math.cos(6 * th + f * 7),
    doku(u, th, fl, o) {
      if (u < 0.1) {
        o.tablo = TABLOLAR.gobekYesil;
        o.ton = 0.1 * (gurultu(th * 3, u * 40) - 0.5);
        return;
      }
      const K = Math.max(1.5, Math.min(3.5, 0.3 / o.px));
      const L = u * K + 0.25 * Math.sin(2 * th + fl.faz * TAU);
      let t = 0.14 * smooth(0.3, 0.95, frac(L)) - 0.04;
      if (yakin(L) / K < 0.5 * o.px) { o.cizgi = 1; t -= 0.12; }
      o.ton = t;
      o.karisim = 1 - smooth(0.05, 0.8, u);
    },
  },

  // Lilyum (stargazer): 6 sivri yaprak, ortasi macenta kenari acik pembe,
  // koyu benekler, ortada basli erkek organlar
  lilyum: {
    renk: ['acikPembe', 'macenta'],
    kupa: 0.16,
    dolgu: '+++',
    kenar: (th, f) => {
      const q = (th * 6) / TAU + f;
      const d = Math.abs(frac(q) - 0.5) * 2; // 0: yaprak ortasi, 1: iki yaprak arasi
      const uzun = Math.floor(q) % 2 === 0 ? 1 : 0.9;
      return Math.max(0.16, uzun * (1 - d) ** 0.8);
    },
    doku(u, th, fl, o) {
      const q = (th * 6) / TAU + fl.faz;
      const d = Math.abs(frac(q) - 0.5) * 2;
      const dilim = (0.5 * TAU) / 6;
      if (u < 0.07) { o.tablo = TABLOLAR.gobekYesil; o.ton = 0.05; return; }
      // erkek organlar: ince acik yesil sap + koyu bas
      const da = Math.abs(frac(q + 0.25) - 0.5) * 2 * dilim * u;
      if (u < 0.62 && u > 0.07) {
        if (u > 0.5 && da < 1.0 * o.px) { o.tablo = TABLOLAR.bordo; o.ton = 0.05; o.ch = '@'; return; }
        if (da < 0.4 * o.px) { o.tablo = TABLOLAR.kesik; o.ton = 0.2; o.cizgi = 2; return; }
      }
      let t = 0.06 + 0.14 * smooth(0.6, 0.95, u);
      if (d * dilim * u < 0.4 * o.px && u > 0.1) { o.cizgi = 2; t -= 0.08; } // orta damar
      else if (u > 0.18 && u < 0.6 && hash2(Math.floor(q * 10) + fl.tohum * 31, Math.floor(u * 16)) > 0.8) {
        t -= 0.35; o.ch = '\''; // benek
      }
      o.ton = t;
      o.karisim = 1 - smooth(0.1, 0.75, u + 0.15 * d);
    },
  },
};

export const TUR_ADLARI = Object.keys(TURLER);
