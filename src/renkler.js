// Renk paletleri (koyudan aciga) ve malzemeler.
// Renkler gercek RGB; terminal 24-bit desteklemiyorsa 256 renge cevrilir.

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const P = (...h) => h.map(hex);

export const PALETLER = {
  // cicekler
  bordo: P('#1a030b', '#2e0714', '#43091c', '#590d26', '#6f1230', '#86193b', '#9c2347', '#b03053', '#c24262'),
  pembe: P('#3a1020', '#5c1d36', '#80304e', '#a44567', '#c25d81', '#d97898', '#e897b0', '#f3b6c8', '#fad3de'),
  macenta: P('#2a0422', '#47073b', '#690d56', '#8c1372', '#ad1d8b', '#c932a1', '#df52b6', '#ee78ca', '#f7a3dd'),
  acikPembe: P('#4a1c2c', '#6e3047', '#934762', '#b5617e', '#cf7f9a', '#e39db4', '#f0bccd', '#f8d7e1', '#fdeef3'),
  beyaz: P('#4e4c54', '#6e6b74', '#8f8c95', '#afacb4', '#cbc8cf', '#e0dee3', '#efedf1', '#f9f8fa', '#ffffff'),
  gobekYesil: P('#0e1f10', '#1d3a1c', '#2f5a2a', '#4a7d3b', '#6f9d4f', '#9cbc6b'),
  // yesillik ve ambalaj
  yaprak: P('#0b1d11', '#14301b', '#1f4527', '#2c5c34', '#3c7444', '#528d57', '#6fa66f', '#93bf8d'),
  okaliptus: P('#16231f', '#243630', '#344b43', '#476257', '#5d7a6d', '#769385', '#93ad9f', '#b4c9bd'),
  golge: P('#050d07', '#0a170d', '#102214', '#172e1b', '#203b24'),
  sap: P('#14290f', '#22401a', '#335a26', '#497534', '#638f46'),
  kesik: P('#6f8a55', '#94ad78', '#bccfa2', '#dde8c9'),
  kagit: P('#2e271f', '#4a4034', '#685b4b', '#887966', '#a89883', '#c5b6a0', '#ddd0bb', '#eee5d4', '#faf5ea'),
  tul: P('#24161d', '#3b2631', '#553a48', '#70505f', '#8c6878', '#a88293', '#c2a0ae', '#dbc1cb'),
  kurdele: P('#1c0309', '#360812', '#520d1d', '#701629', '#8f2137', '#ad3149', '#c84d63', '#df7a8c', '#f2b0bc'),
  cipsofila: P('#6e6468', '#9a8f93', '#c4b9bd', '#e6dde0', '#fff7fa'),
};

export const KALP_RENKLERI = P('#a3155a', '#c42a72', '#dd4b8c', '#ec6fa6', '#f593bd', '#fbb6d2').map(paketle);
export const YAPRAKCIK_RENKLERI = P('#c7607f', '#de809b', '#ec9fb5', '#f6bccd', '#fbd6e1').map(paketle);
export const MESAJ_RENKLERI = P('#c42a72', '#d94a8a', '#ea72a6', '#f59cc0', '#fbc6da', '#f59cc0', '#ea72a6', '#d94a8a').map(paketle);
export const SOLUK = paketle([110, 92, 100]);
export const BASLIK = paketle([245, 160, 190]);

export function paketle(c) {
  return ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
}

export function karistir(p, q, t) {
  const r1 = (p >> 16) & 255, g1 = (p >> 8) & 255, b1 = p & 255;
  const r2 = (q >> 16) & 255, g2 = (q >> 8) & 255, b2 = q & 255;
  return paketle([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
}

// Bir paleti 0..1 parlaklik icin 33 basamakli tabloya cevirir.
export const SEVIYE = 32;
export function tablo(pal) {
  const out = new Int32Array(SEVIYE + 1);
  for (let i = 0; i <= SEVIYE; i++) {
    const x = (i / SEVIYE) * (pal.length - 1);
    const a = Math.floor(x), b = Math.min(pal.length - 1, a + 1), f = x - a;
    out[i] = paketle([
      Math.round(pal[a][0] + (pal[b][0] - pal[a][0]) * f),
      Math.round(pal[a][1] + (pal[b][1] - pal[a][1]) * f),
      Math.round(pal[a][2] + (pal[b][2] - pal[a][2]) * f),
    ]);
  }
  return out;
}

export const TABLOLAR = Object.fromEntries(Object.entries(PALETLER).map(([k, v]) => [k, tablo(v)]));

// Parlakliga gore karakter rampalari
export const RAMPA = {
  genel: '.:-=+*#%@',
  kagit: ':;=+*#%@',
  yaprak: '.:;=+*#%@',
  cicek: '.:-=+*#%@',
  yumusak: '.,:;~=+*#%',
  sivri: '.\'^*vx#%@',
};

// Nokta bulutu malzemeleri (sira onemli: indeks olarak saklanir)
export const MALZEMELER = [
  { ad: 'kagit', tablo: TABLOLAR.kagit, rampa: RAMPA.kagit, ciftYuz: true, arka: 0.3 },
  { ad: 'tul', tablo: TABLOLAR.tul, rampa: '.:~~', ciftYuz: true, arka: 0.25 },
  { ad: 'yaprak', tablo: TABLOLAR.yaprak, rampa: '.:;==', ciftYuz: true, arka: 0.15 },
  { ad: 'okaliptus', tablo: TABLOLAR.okaliptus, rampa: '.:ooO', ciftYuz: true, arka: 0.1 },
  { ad: 'golge', tablo: TABLOLAR.golge, rampa: '  .,', ciftYuz: true, arka: 0 },
  { ad: 'sap', tablo: TABLOLAR.sap, rampa: RAMPA.genel, ciftYuz: true, arka: 0.1 },
  { ad: 'kesik', tablo: TABLOLAR.kesik, rampa: 'o0O@', ciftYuz: true, arka: 0.1 },
  { ad: 'kurdele', tablo: TABLOLAR.kurdele, rampa: ':=%%@', ciftYuz: true, arka: 0.2 },
];
export const M = Object.fromEntries(MALZEMELER.map((m, i) => [m.ad, i]));
