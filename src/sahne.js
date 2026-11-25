// Buketin 3B sahnesi: ambalaj, kurdele, yesillik (nokta bulutu) ve cicekler.

import { TAU, norm, cross, add, sub, basis, rastgele, clamp, smooth, gauss, hash2 } from './matematik.js';
import { M, TABLOLAR } from './renkler.js';
import { TURLER } from './cicekler.js';

export const PIVOT_Y = 0.06;
export const CEN = [0, 0.12, 0];
export const DOME = 0.66;
export const NTAB = 256;
const Y_ALT = -0.7;
export const koni = (y) => 0.05 + (y - Y_ALT) * 0.58;

const VARSAYILAN_BOYUT = {
  sakayik: 0.34, gul: 0.26, gonca: 0.105, dalya: 0.27, karanfil: 0.22, ranunkulus: 0.21, lilyum: 0.31,
};
const RADYAL = { gonca: 1.2, lilyum: 1.06 };

// x y z | nx ny nz | malzeme isik_payi gorunme | cizgi yonu (0 ise dolgu)
export const STRIDE = 12;
const SIFIR = [0, 0, 0];

class Bulut {
  constructor() { this.d = []; }
  ekle(p, n, mal, bias, gorun, yon = SIFIR) {
    this.d.push(p[0], p[1], p[2], n[0], n[1], n[2], mal, bias, gorun, yon[0], yon[1], yon[2]);
  }
  bitir() { return { v: Float32Array.from(this.d), n: this.d.length / STRIDE }; }
}

function uzunluk(g) {
  let L = 0, onceki = g(0);
  for (let i = 1; i <= 8; i++) {
    const p = g(i / 8);
    L += Math.hypot(p[0] - onceki[0], p[1] - onceki[1], p[2] - onceki[2]);
    onceki = p;
  }
  return L;
}

// Parametrik yuzeyi ekran cozunurlugune uygun siklikta ornekler. f(s,t) -> [x,y,z]
// o.cizgi(s, t, ps, pt) -> 0 dolgu | 1 s yonunde cizgi | 2 t yonunde cizgi
// (ps, pt: bir karakter hucresinin parametre cinsinden yaklasik boyu)
function yuzey(b, h, rj, f, o) {
  const ls = Math.max(uzunluk((s) => f(s, 0.15)), uzunluk((s) => f(s, 0.5)), uzunluk((s) => f(s, 0.9)));
  const lt = Math.max(uzunluk((t) => f(0.15, t)), uzunluk((t) => f(0.5, t)), uzunluk((t) => f(0.9, t)));
  const ns = Math.max(2, Math.ceil(ls / h)), nt = Math.max(2, Math.ceil(lt / h));
  const ps = 1.6 / ns, pt = 1.6 / nt;
  const e = 1e-3;
  for (let i = 0; i < ns; i++) {
    for (let j = 0; j < nt; j++) {
      const s = clamp((i + 0.2 + rj() * 0.6) / ns, 0, 1);
      const t = clamp((j + 0.2 + rj() * 0.6) / nt, 0, 1);
      if (o.maske && !o.maske(s, t)) continue;
      const p = f(s, t);
      const ds = sub(f(Math.min(1, s + e), t), f(Math.max(0, s - e), t));
      const dt = sub(f(s, Math.min(1, t + e)), f(s, Math.max(0, t - e)));
      let n = cross(ds, dt);
      n = Math.hypot(n[0], n[1], n[2]) < 1e-12 ? o.normal || [0, 1, 0] : norm(n);
      if (o.disari) {
        const r = o.disari(p);
        if (n[0] * r[0] + n[1] * r[1] + n[2] * r[2] < 0) n = [-n[0], -n[1], -n[2]];
      }
      let bias = o.bias ? o.bias(s, t, p) : 0;
      let yon = SIFIR;
      const c = o.cizgi ? o.cizgi(s, t, ps, pt) : 0;
      if (c) {
        yon = c === 1 ? ds : dt;
        if (Math.hypot(yon[0], yon[1], yon[2]) < 1e-12) yon = SIFIR;
        bias += o.cizgiTon ?? -0.2;
      }
      b.ekle(p, n, o.mal, bias, o.gorun ? o.gorun(s, t, p) : 0, yon);
    }
  }
}

const radyalDisari = (p) => [p[0], 0, p[2]];

// ---------- ambalaj ----------

function ambalaj(b, h, rnd, rj, giris) {
  // dis kagit: fildisi, sivri uclu paneller
  const N = 6;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU + (rnd() - 0.5) * 0.3;
    const hw = (TAU / N) * 0.68;
    const taban = 0.02 + rnd() * 0.12, tepe = 0.18 + rnd() * 0.2;
    const off = 0.006 + 0.005 * (i % 2);
    const tane = rnd() * 1000;
    yuzey(b, h, rj, (s, t) => {
      const az = a0 + (s - 0.5) * 2 * hw;
      const uc = (1 - Math.abs(2 * s - 1)) ** 1.4;
      const y = Y_ALT + t * (taban + tepe * uc - Y_ALT);
      const fl = Math.max(0, (y + 0.1) / 0.5);
      const r = koni(y) + off + 0.02 * Math.sin(Math.PI * s) * (0.3 + t) + 0.09 * fl * fl;
      return [r * Math.cos(az), y, r * Math.sin(az)];
    }, {
      mal: M.kagit,
      disari: radyalDisari,
      bias: (s, t) => 0.08 + 0.06 * smooth(0.9, 1, t) - 0.2 * smooth(0.8, 1, Math.abs(2 * s - 1)) - 0.12 * gauss(s - 0.5, 0.03)
        + 0.05 * (hash2((s * 90) | 0, (t * 70 + tane) | 0) - 0.5),
      // panel kenarlari ve ust kenar cizgi
      // pliseli kagit: her yer koni ucuna dogru cizgi, ust kenar yatay
      cizgi: (s, t, ps, pt) => (t > 1 - pt ? 1 : 2),
      cizgiTon: 0,
      gorun: (s, t) => (giris ? 0.1 + t * 0.7 + i * 0.04 : 0),
    });
  }
  // ic tul: toz mor, firfirli ust kenar
  const N2 = 7;
  for (let i = 0; i < N2; i++) {
    const a0 = ((i + 0.5) / N2) * TAU + (rnd() - 0.5) * 0.2;
    const hw = (TAU / N2) * 0.72;
    yuzey(b, h, rj, (s, t) => {
      const az = a0 + (s - 0.5) * 2 * hw;
      const uc = (1 - Math.abs(2 * s - 1)) ** 1.2;
      const ust = 0.26 + 0.14 * uc + 0.035 * Math.sin(s * TAU * 3 + i * 1.7);
      const y = -0.45 + t * (ust + 0.45);
      const fl = Math.max(0, (y + 0.1) / 0.5);
      const r = koni(y) - 0.012 + 0.13 * fl * fl + 0.015 * Math.sin(s * TAU * 4 + i);
      return [r * Math.cos(az), y, r * Math.sin(az)];
    }, {
      mal: M.tul,
      disari: radyalDisari,
      bias: (s) => -0.06 * gauss(Math.sin(s * TAU * 4 + i), 0.3),
      cizgi: (s, t, ps, pt) => (t > 1 - pt ? 1 : 0),
      gorun: (s, t) => (giris ? 0.5 + t * 0.5 : 0),
    });
  }
}

// ---------- kurdele ve fiyonk ----------

const KURDELE_Y = -0.33;

function kurdele(b, h, rj, giris) {
  const g = giris ? 1.0 : 0;
  yuzey(b, h, rj, (s, t) => {
    const az = s * TAU, y = KURDELE_Y - 0.032 + t * 0.064;
    const r = koni(y) + 0.036;
    return [r * Math.cos(az), y, r * Math.sin(az)];
  }, {
    mal: M.kurdele, disari: radyalDisari, bias: (s, t) => 0.12 * gauss(t - 0.4, 0.2), gorun: () => g,
    cizgi: (s, t, ps, pt) => (t < pt || t > 1 - pt ? 1 : 0),
  });

  const { K, T, U, N } = dugumCercevesi();
  const nokta = (x, y, n) => add(add(add(K, T, x), U, y), N, n);
  // iki ilmek: dugumde daralan, dista genisleyen gozyasi seklinde
  for (const yan of [-1, 1]) {
    const Lx = 0.27, Ly = 0.17, egim = 0.35;
    const c = Math.cos(egim), sn = Math.sin(egim) * yan;
    yuzey(b, h * 0.8, rj, (s, t) => {
      const ang = s * TAU, rr = 0.5 + 0.5 * t;
      const lx = yan * (Lx / 2) * (1 - Math.cos(ang)) * rr;
      const ly = (Ly / 2) * Math.sin(ang) * rr;
      return nokta(lx * c - ly * sn, lx * sn + ly * c, 0.045 * (1 - Math.cos(ang)) / 2 + 0.01 * t);
    }, {
      mal: M.kurdele,
      disari: () => N,
      bias: (s, t) => 0.15 * gauss(t - 0.75, 0.2) - 0.2 * gauss(t, 0.15),
      cizgi: (s, t, ps, pt) => (t > 1 - pt || t < pt ? 1 : 0),
      gorun: () => g,
    });
  }
  // dugum
  yuzey(b, h * 0.7, rj, (s, t) => {
    const a = s * TAU, e = (t - 0.5) * Math.PI;
    return nokta(0.03 * Math.cos(e) * Math.cos(a), 0.035 * Math.sin(e), 0.03 + 0.022 * Math.cos(e) * Math.sin(a));
  }, { mal: M.kurdele, disari: (p) => sub(p, nokta(0, 0, 0.03)), bias: () => 0.05, gorun: () => g });
}

function dugumCercevesi() {
  const az = Math.PI / 2;
  const r = koni(KURDELE_Y) + 0.045;
  return {
    K: [r * Math.cos(az), KURDELE_Y, r * Math.sin(az)],
    T: [-Math.sin(az), 0, Math.cos(az)],
    U: [0, 1, 0],
    N: [Math.cos(az), 0, Math.sin(az)],
  };
}

// Sallanan kurdele kuyruklari her karede yeniden hesaplanir.
function kuyrukHazirla(h) {
  const params = [];
  const Lt = 0.32, W = 0.056;
  const ns = Math.ceil(Lt / (h * 0.8)) + 1, nw = Math.max(2, Math.ceil(W / (h * 0.8)) + 1);
  for (const yan of [-1, 1])
    for (let i = 0; i <= ns; i++)
      for (let j = 0; j <= nw; j++) {
        const s = i / ns, w = (j / nw) * 2 - 1;
        if (s > 0.88 && Math.abs(w) < (s - 0.88) / 0.12) continue; // V kesik uc
        params.push(yan, s, w, j === 0 || j === nw ? 1 : 0);
      }
  return { params: Float32Array.from(params), ...dugumCercevesi() };
}

export function kuyrukNoktalari(kuyruk, t, out) {
  const { params, K, T, U, N } = kuyruk;
  let k = 0;
  for (let i = 0; i < params.length; i += 4) {
    const yan = params[i], s = params[i + 1], w = params[i + 2], kenar = params[i + 3];
    const faz = t * 1.6 + yan * 1.3 + s * 2.2;
    const salin = Math.sin(faz) * 0.035 * s;
    const x = yan * (0.02 + s * 0.08) + salin + w * 0.028 * (1 - 0.25 * s);
    const y = -s * 0.32, n = 0.025 + s * 0.06;
    out[k++] = K[0] + T[0] * x + U[0] * y + N[0] * n;
    out[k++] = K[1] + T[1] * x + U[1] * y + N[1] * n;
    out[k++] = K[2] + T[2] * x + U[2] * y + N[2] * n;
    const eg = -yan * 0.35 + Math.cos(faz) * 0.3 * s;
    const nn = norm([N[0] + T[0] * eg, N[1] + 0.15, N[2] + T[2] * eg]);
    out[k++] = nn[0]; out[k++] = nn[1]; out[k++] = nn[2];
    out[k++] = M.kurdele;
    out[k++] = 0.1 * gauss(w, 0.5) - 0.12 * s - (kenar ? 0.2 : 0);
    out[k++] = 1.0;
    // kenarlarda asagi dogru cizgi
    const dx = yan * 0.08 + Math.cos(faz) * 0.035 * 2.2 * s;
    out[k++] = kenar ? T[0] * dx : 0;
    out[k++] = kenar ? -0.32 : 0;
    out[k++] = kenar ? T[2] * dx + N[2] * 0.06 : 0;
  }
  return k / STRIDE;
}

// ---------- yesillik ----------

function yesillik(b, h, rnd, rj, giris) {
  const gor = () => (giris ? 0.9 + rnd() * 0.6 : 0);

  // ciceklerin arkasindaki koyu yesil kutle (bosluklardan derinlik gorunsun)
  yuzey(b, h * 1.2, rj, (s, t) => {
    const a = s * TAU, e = 0.05 + t * (Math.PI / 2 - 0.05);
    const r = DOME * 0.8;
    return [CEN[0] + r * Math.cos(e) * Math.cos(a), CEN[1] + r * Math.sin(e), CEN[2] + r * Math.cos(e) * Math.sin(a)];
  }, { mal: M.golge, disari: (p) => sub(p, CEN), gorun: () => (giris ? 0.6 : 0) });

  // okaliptus dallari: yuvarlak yapraklar
  const NE = 8;
  for (let i = 0; i < NE; i++) {
    const az = (i / NE) * TAU + (rnd() - 0.5) * 0.5;
    const el = 0.12 + rnd() * 0.42;
    const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
    const p0 = add(CEN, d, 0.34), p2 = add(add(CEN, d, 1.02 + rnd() * 0.1), [0, -1, 0], 0.1);
    const p1 = add(CEN, d, 0.74);
    const egri = (s) => {
      const a = (1 - s) * (1 - s), bb = 2 * s * (1 - s), c = s * s;
      return [a * p0[0] + bb * p1[0] + c * p2[0], a * p0[1] + bb * p1[1] + c * p2[1], a * p0[2] + bb * p1[2] + c * p2[2]];
    };
    const g0 = gor();
    // dal
    const L = uzunluk(egri);
    for (let k = 0, nk = Math.ceil(L / (h * 0.6)); k <= nk; k++) {
      const s = k / nk;
      b.ekle(egri(s), d, M.sap, -0.05, g0, sub(egri(Math.min(1, s + 0.01)), egri(Math.max(0, s - 0.01))));
    }
    const yanv = norm(cross(d, [0, 1, 0]));
    for (let s = 0.3; s <= 1.001; s += 0.12) {
      for (const yan of [-1, 1]) {
        const rr = 0.052 - s * 0.018;
        const mer = add(egri(s), yanv, yan * (rr + 0.006));
        const nrm = norm(add(add(d, [0, 1, 0], 0.6), yanv, yan * 0.3 + (rnd() - 0.5) * 0.4));
        const [bu, bv] = basis(nrm);
        yuzey(b, h, rj, (q, w) => {
          const a = w * TAU, r = q * rr;
          return add(add(mer, bu, r * Math.cos(a)), bv, r * Math.sin(a) * 0.85);
        }, {
          mal: M.okaliptus, normal: nrm, disari: () => nrm,
          bias: (q) => 0.04 - 0.1 * smooth(0.6, 1, q),
          cizgi: (q, w, pq) => (q > 1 - pq * 0.8 ? 2 : 0),
          cizgiTon: -0.1,
          gorun: () => g0,
        });
      }
    }
  }

  // sivri yapraklar
  const NY = 9;
  for (let i = 0; i < NY; i++) {
    const az = ((i + 0.5) / NY) * TAU + (rnd() - 0.5) * 0.4;
    const el = 0.25 + rnd() * 0.45;
    const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
    const kok = add(CEN, d, 0.5);
    const yon = norm(add(d, [0, 1, 0], 0.25));
    const yanv = norm(cross(yon, [0, 1, 0]));
    const nrm = norm(cross(yanv, yon));
    const len = 0.36 + rnd() * 0.12, gen = 0.055 + rnd() * 0.02, kivrim = (rnd() - 0.3) * 0.12;
    const g0 = gor();
    yuzey(b, h, rj, (s, w) => {
      const gw = gen * Math.sin(Math.PI * s) ** 0.8 * (1 - 0.3 * s);
      const p = add(add(kok, yon, s * len), yanv, (w * 2 - 1) * gw);
      return add(add(p, nrm, kivrim * s * s), [0, -1, 0], 0.06 * s * s);
    }, {
      mal: M.yaprak, normal: nrm, disari: () => nrm,
      bias: (s, w) => 0.06 * (w - 0.5),
      cizgi: (s, w, ps, pw) => (Math.abs(w - 0.5) < pw * 0.5 && s < 0.92 ? 1 : 0),
      cizgiTon: -0.25,
      gorun: () => g0,
    });
  }

  // alttan cikan saplar ve kesik uclari
  for (let i = 0; i < 11; i++) {
    const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.045;
    const x0 = r * Math.cos(a), z0 = r * Math.sin(a);
    const top = [x0, -0.6, z0], alt = [x0 * 1.5, -0.9 - rnd() * 0.04, z0 * 1.5];
    const ekseni = norm(sub(alt, top));
    const [bu, bv] = basis(ekseni);
    const sr = 0.011;
    yuzey(b, h * 0.6, rj, (s, t) => {
      const ang = t * TAU;
      const c = add(top, sub(alt, top), s);
      return add(add(c, bu, sr * Math.cos(ang)), bv, sr * Math.sin(ang));
    }, {
      mal: M.sap, disari: (p) => sub(p, top), cizgi: () => 1, cizgiTon: 0,
      gorun: () => (giris ? 0.1 : 0),
    });
    b.ekle(alt, [0, -1, 0], M.kesik, 0.25, giris ? 0.1 : 0);
  }
}

// ---------- cipsofila (beyaz minik ciceklercikler) ----------

function cipsofila(rnd, giris) {
  const out = [];
  for (let i = 0; i < 34; i++) {
    const az = rnd() * TAU, el = 0.15 + rnd() * 1.2;
    const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
    const mer = add(CEN, d, DOME * (1.12 + rnd() * 0.18));
    const n = 5 + Math.floor(rnd() * 6);
    const g0 = giris ? 1.2 + rnd() * 3.5 : 0;
    for (let k = 0; k < n; k++) {
      const p = add(mer, norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]), rnd() * 0.05);
      out.push(p[0], p[1], p[2], rnd() * TAU, g0);
    }
  }
  return Float32Array.from(out);
}

// ---------- cicekler ----------

function cicekleriYerlestir(buket, rnd, giris) {
  const istek = [];
  for (const g of buket) {
    const tur = TURLER[g.tur];
    if (!tur) throw new Error(`bilinmeyen cicek turu: ${g.tur} (secenekler: ${Object.keys(TURLER).join(', ')})`);
    for (let k = 0; k < (g.adet ?? 1); k++)
      istek.push({ turAd: g.tur, tur, renk: g.renk ?? tur.renk, R: g.boyut ?? VARSAYILAN_BOYUT[g.tur] ?? 0.16 });
  }
  istek.sort((a, b) => b.R - a.R);

  const yer = [];
  for (const c of istek) {
    const radyal = RADYAL[c.turAd] ?? 1;
    const minS = Math.sin((c.turAd === 'gonca' ? 22 : 14) * Math.PI / 180), maxS = Math.sin(88 * Math.PI / 180);
    let faktor = 0.8, pos, d;
    for (let deneme = 0; deneme < 600; deneme++) {
      if (deneme && deneme % 100 === 0) faktor *= 0.92;
      const s = minS + rnd() * (maxS - minS), c2 = Math.sqrt(1 - s * s), az = rnd() * TAU;
      d = [c2 * Math.cos(az), s, c2 * Math.sin(az)];
      pos = add(CEN, d, DOME * radyal * (0.97 + rnd() * 0.07));
      if (yer.every((q) => Math.hypot(pos[0] - q.pos[0], pos[1] - q.pos[1], pos[2] - q.pos[2]) >= faktor * (c.R + q.R))) break;
    }
    yer.push({ ...c, pos, d });
  }

  // alttakiler once acar, tepe en son
  yer.sort((a, b) => a.d[1] - b.d[1]);
  return yer.map((c, i) => {
    const eksen = norm([c.d[0] + (rnd() - 0.5) * 0.36, c.d[1] + (rnd() - 0.4) * 0.28, c.d[2] + (rnd() - 0.5) * 0.36]);
    const [u, v] = basis(eksen);
    const faz = rnd();
    const kenar = new Float32Array(NTAB);
    for (let k = 0; k < NTAB; k++) kenar[k] = c.tur.kenar(((k + 0.5) / NTAB) * TAU, faz);
    const [a, b] = Array.isArray(c.renk) ? c.renk : [c.renk, null];
    if (!TABLOLAR[a] || (b && !TABLOLAR[b])) throw new Error(`bilinmeyen renk: ${c.renk}`);
    return {
      turAd: c.turAd, tur: c.tur, pos: c.pos, eksen, u, v, R: c.R, faz,
      tohum: Math.floor(rnd() * 1e6),
      gecikme: giris ? 1.5 + (i / yer.length) * 2.6 + rnd() * 0.2 : -10,
      tabloA: TABLOLAR[a], tabloB: b ? TABLOLAR[b] : null,
      kenar,
    };
  });
}

// Goncalar havada durmasin diye kisa sap
function goncaSaplari(b, h, cicekler, giris) {
  for (const c of cicekler) {
    if (c.turAd !== 'gonca') continue;
    const bas = add(c.pos, c.eksen, -c.R * 0.5), son = add(CEN, sub(c.pos, CEN), 0.78);
    const yon = sub(son, bas);
    const L = Math.hypot(...yon);
    for (let k = 0, n = Math.ceil(L / (h * 0.5)); k <= n; k++)
      b.ekle(add(bas, yon, k / n), c.eksen, M.sap, 0, giris ? c.gecikme : 0, yon);
  }
}

// h: ornekleme araligi (dunya biriminde). Ekran buyudukce kuculur.
export function sahneKur(ayar, h) {
  const giris = ayar.giris !== false;
  const rCicek = rastgele(ayar.tohum);
  const rYesil = rastgele(ayar.tohum * 7 + 3);
  const rKagit = rastgele(ayar.tohum * 13 + 5);
  const rj = rastgele(99);
  const b = new Bulut();
  const cicekler = cicekleriYerlestir(ayar.buket, rCicek, giris);
  ambalaj(b, h, rKagit, rj, giris);
  kurdele(b, h, rj, giris);
  yesillik(b, h, rYesil, rj, giris);
  goncaSaplari(b, h, cicekler, giris);
  const kuyruk = kuyrukHazirla(h);
  return {
    bulut: b.bitir(),
    cicekler,
    cipsofila: cipsofila(rastgele(ayar.tohum * 17 + 11), giris),
    kuyruk,
    kuyrukTampon: new Float32Array((kuyruk.params.length / 4) * STRIDE),
  };
}
