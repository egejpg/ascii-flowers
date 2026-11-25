// Cizici: sahneyi karakter + renk tamponuna cizer. Terminal ve web ayni ciziciyi kullanir.

import { TAU, norm, clamp, smooth, easeOutBack } from './matematik.js';
import { MALZEMELER, TABLOLAR, SEVIYE, karistir } from './renkler.js';
import { PIVOT_Y, NTAB, STRIDE, kuyrukNoktalari } from './sahne.js';

const ISIK = norm([-0.45, 0.62, 0.65]);
const L0 = ISIK[0], L1 = ISIK[1], L2 = ISIK[2];
const ORTAM = 0.3;
const YUZ = 0.85; // cicekleri izleyiciye ne kadar cevirelim (okunurluk icin)
const ACILMA = 1.2; // saniye

export function yerlesim(cols, rows, yazilar = true, enBoy = 2.0) {
  const ust = yazilar ? 2 : 0, alt = yazilar ? 3 : 0;
  const gorusSatir = Math.max(8, rows - ust - alt);
  const sy = Math.min(gorusSatir / 2.2, cols / (2.4 * enBoy));
  const sx = sy * enBoy;
  return { cols, rows, ust, gorusSatir, sx, sy, cx: cols / 2, cy: ust + gorusSatir * 0.5 };
}

export function kamera(aci, egim, yer, uzaklik) {
  return {
    ca: Math.cos(aci), sa: Math.sin(aci), ct: Math.cos(egim), st: Math.sin(egim),
    cx: yer.cx, cy: yer.cy, sx: yer.sx, sy: yer.sy, D: uzaklik,
  };
}

// Derindeki seyler biraz karanlik
const derinlik = (zt) => -0.32 * (1 - smooth(-0.8, 0.45, zt));

// Ekrandaki yone gore cizgi karakteri (dy yukari pozitif; karakter en/boy orani kamera olceginde dengelenmis)
function yonKar(dx, dy) {
  if (dx < 0) { dx = -dx; dy = -dy; }
  const m = dy / (dx || 1e-9);
  if (m > 2.4 || m < -2.4) return '|';
  if (m > 0.42) return '/';
  if (m < -0.42) return '\\';
  return '-';
}

// Cember yonundeki cizgiler icin kavisli karakter: yanlarda ( ), ustte - altta _
// (tx,ty: teget, rx,ry: merkezden disa)
function kavisKar(tx, ty, rx, ry, tur) {
  const ax = Math.abs(tx), ay = Math.abs(ty);
  if (ay > 2.4 * ax) return rx < 0 ? '(' : ')';
  if (ay < 0.42 * ax) return ry > 0 ? tur.ust || '-' : tur.alt || '_';
  return (tx > 0) === (ty > 0) ? '/' : '\\';
}

export class Cizici {
  constructor(yer) {
    this.yer = yer;
    const n = yer.cols * yer.rows;
    this.ch = new Array(n).fill(' ');
    this.renk = new Int32Array(n);
    this.z = new Float32Array(n);
    this.y0 = yer.ust;
    this.y1 = yer.ust + yer.gorusSatir;
    this.o = { ton: 0, karisim: 0, tablo: null, ch: null, cizgi: 0, px: 0.1 };
  }

  temizle() {
    this.ch.fill(' ');
    this.renk.fill(0);
    this.z.fill(-Infinity);
  }

  // stride'li nokta dizisini ciz
  noktalar(v, n, kam, t) {
    const { ca, sa, ct, st, cx, cy, sx, sy, D } = kam;
    const cols = this.yer.cols, y0 = this.y0, y1 = this.y1;
    const zb = this.z;
    for (let i = 0, o = 0; i < n; i++, o += STRIDE) {
      const gor = v[o + 8];
      if (t < gor) continue;
      const X = v[o], Y = v[o + 1] - PIVOT_Y, Z = v[o + 2];
      const xr = X * ca + Z * sa, zr = -X * sa + Z * ca;
      const yt = Y * ct - zr * st;
      let zt = Y * st + zr * ct;
      const f = D / (D - zt);
      const px = Math.floor(cx + xr * f * sx + 0.5);
      const py = Math.floor(cy - yt * f * sy + 0.5);
      if (px < 0 || px >= cols || py < y0 || py >= y1) continue;
      const DX = v[o + 9], DY = v[o + 10], DZ = v[o + 11];
      const cizgi = DX !== 0 || DY !== 0 || DZ !== 0;
      if (cizgi) zt += 0.004;
      const k = py * cols + px;
      if (zt <= zb[k]) continue;
      const NX = v[o + 3], NY = v[o + 4], NZ = v[o + 5];
      let nx = NX * ca + NZ * sa;
      const nzr = -NX * sa + NZ * ca;
      let ny = NY * ct - nzr * st, nz = NY * st + nzr * ct;
      const m = MALZEMELER[v[o + 6]];
      let b = v[o + 7];
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; b -= m.arka; }
      const lam = nx * L0 + ny * L1 + nz * L2;
      b += ORTAM + (1 - ORTAM) * (lam > 0 ? lam : 0) + derinlik(zt);
      const sol = t - gor;
      if (sol < 0.4) b *= sol / 0.4;
      zb[k] = zt;
      this.yaz(k, m.tablo, m.rampa, b);
      if (cizgi) {
        const dxr = DX * ca + DZ * sa, dzr = -DX * sa + DZ * ca;
        this.ch[k] = yonKar(dxr, DY * ct - dzr * st);
      }
    }
  }

  yaz(k, tablo, rampa, b) {
    if (b < 0) b = 0; else if (b > 0.999) b = 0.999;
    this.renk[k] = tablo[(b * SEVIYE + 0.5) | 0];
    this.ch[k] = rampa[(b * rampa.length) | 0];
  }

  kuyruk(sahne, kam, t) {
    if (t < 1.0) return; // giriste kurdeleyle birlikte belirsin
    const n = kuyrukNoktalari(sahne.kuyruk, t, sahne.kuyrukTampon);
    this.noktalar(sahne.kuyrukTampon, n, kam, t);
  }

  cicek(fl, kam, t) {
    const g0 = (t - fl.gecikme) / ACILMA;
    if (g0 <= 0) return;
    const g = g0 >= 1 ? 1 : easeOutBack(g0);
    const sol = clamp(g0 * 3, 0, 1);
    const { ca, sa, ct, st, cx, cy, sx, sy, D } = kam;
    const cols = this.yer.cols;

    const X = fl.pos[0], Y = fl.pos[1] - PIVOT_Y, Z = fl.pos[2];
    const xr = X * ca + Z * sa, zr = -X * sa + Z * ca;
    const yt = Y * ct - zr * st, czt = Y * st + zr * ct;
    const f = D / (D - czt);
    const scx = cx + xr * f * sx, scy = cy - yt * f * sy;

    const don = (w) => {
      const a = w[0] * ca + w[2] * sa, c = -w[0] * sa + w[2] * ca;
      return [a, w[1] * ct - c * st, w[1] * st + c * ct];
    };
    const ax = don(fl.eksen);
    const yuz = ax[2];
    const A = norm([ax[0], ax[1], ax[2] + YUZ]);
    const uu = don(fl.u);
    const du = uu[0] * A[0] + uu[1] * A[1] + uu[2] * A[2];
    const U = norm([uu[0] - A[0] * du, uu[1] - A[1] * du, uu[2] - A[2] * du]);
    const V = [A[1] * U[2] - A[2] * U[1], A[2] * U[0] - A[0] * U[2], A[0] * U[1] - A[1] * U[0]];

    const R = fl.R * (0.3 + 0.7 * g) * (1 + 0.02 * Math.sin(t * 1.3 + fl.tohum));
    const kupa = fl.tur.kupa + (1 - Math.min(1, g)) * 1.0;
    const k = f * R;
    const Ux = U[0] * k * sx, Uy = -U[1] * k * sy, Vx = V[0] * k * sx, Vy = -V[1] * k * sy;
    const Ax = A[0] * k * sx, Ay = -A[1] * k * sy;
    const det = Ux * Vy - Uy * Vx;
    if (Math.abs(det) < 0.4) return;

    const ex = (Math.abs(Ux) + Math.abs(Vx)) * 1.05 + Math.abs(Ax) * kupa + 1;
    const ey = (Math.abs(Uy) + Math.abs(Vy)) * 1.05 + Math.abs(Ay) * kupa + 1;
    const xa = Math.max(0, Math.floor(scx - ex)), xb = Math.min(cols - 1, Math.ceil(scx + ex));
    const ya = Math.max(this.y0, Math.floor(scy - ey)), yb = Math.min(this.y1 - 1, Math.ceil(scy + ey));

    const tur = fl.tur, kenar = fl.kenar, dolgu = tur.dolgu, o = this.o;
    const zb = this.z;
    const arka = yuz < -0.05 ? -0.3 + yuz * 0.3 : 0;
    const dk = derinlik(czt);
    // bir hucrenin u cinsinden boyu: ekran alaninin karekokunden
    const px = 1.0 / Math.sqrt(Math.abs(det));

    for (let py = ya; py <= yb; py++) {
      for (let pxx = xa; pxx <= xb; pxx++) {
        const dx0 = pxx - scx, dy0 = py - scy;
        let h = 0, a = 0, b = 0, r2 = 0;
        for (let it = 0; it < 4; it++) {
          const dx = dx0 - h * Ax, dy = dy0 - h * Ay;
          a = (dx * Vy - dy * Vx) / det;
          b = (Ux * dy - Uy * dx) / det;
          r2 = a * a + b * b;
          if (r2 > 1.6) break;
          h = kupa * r2;
        }
        if (r2 > 1.44) continue;
        const r = Math.sqrt(r2);
        let th = Math.atan2(b, a);
        if (th < 0) th += TAU;
        const reach = kenar[Math.min(NTAB - 1, ((th / TAU) * NTAB) | 0)];
        if (r > reach) continue;
        const z = czt + (0.5 * (a * U[2] + b * V[2]) + h * A[2]) * R + 0.04;
        const kk = py * cols + pxx;
        if (z <= zb[kk]) continue;

        // canak ic yuzeyinin normali
        const egim = kupa * r, ir = r > 1e-6 ? 1 / r : 0;
        const nx = A[0] - egim * (a * U[0] + b * V[0]) * ir;
        const ny = A[1] - egim * (a * U[1] + b * V[1]) * ir;
        const nz = A[2] - egim * (a * U[2] + b * V[2]) * ir;
        const lam = (nx * L0 + ny * L1 + nz * L2) / (Math.hypot(nx, ny, nz) || 1);

        const u = r / reach;
        o.ton = 0; o.karisim = 0; o.tablo = null; o.ch = null; o.cizgi = 0; o.px = px;
        tur.doku(u, th, fl, o);
        // dis hat: cicekleri birbirinden ayirir
        if (u > 1 - 0.9 * px && !o.tablo) { o.cizgi = 1; o.ch = null; o.ton = Math.min(o.ton, 0) - 0.16; }

        let bri = (0.28 + 0.56 * (lam > 0 ? lam : 0) + o.ton + arka + dk) * sol;
        if (bri < 0) bri = 0; else if (bri > 0.999) bri = 0.999;
        const idx = (bri * SEVIYE + 0.5) | 0;
        let renk;
        if (o.tablo) renk = o.tablo[idx];
        else if (fl.tabloB && o.karisim > 0) renk = karistir(fl.tabloA[idx], fl.tabloB[idx], o.karisim);
        else renk = fl.tabloA[idx];
        let ch = o.ch;
        if (!ch) {
          if (o.cizgi === 1) ch = kavisKar(-b * U[0] + a * V[0], -b * U[1] + a * V[1], a * U[0] + b * V[0], a * U[1] + b * V[1], tur);
          else if (o.cizgi === 2) ch = yonKar(a * U[0] + b * V[0], a * U[1] + b * V[1]);
          else ch = dolgu[(bri * dolgu.length) | 0];
        }
        zb[kk] = z;
        this.renk[kk] = renk;
        this.ch[kk] = ch;
      }
    }
  }

  cipsofila(arr, kam, t) {
    const { ca, sa, ct, st, cx, cy, sx, sy, D } = kam;
    const cols = this.yer.cols, tablo = TABLOLAR.cipsofila;
    for (let i = 0; i < arr.length; i += 5) {
      if (t < arr[i + 4]) continue;
      const X = arr[i], Y = arr[i + 1] - PIVOT_Y, Z = arr[i + 2];
      const xr = X * ca + Z * sa, zr = -X * sa + Z * ca;
      const yt = Y * ct - zr * st, zt = Y * st + zr * ct + 0.03;
      const f = D / (D - zt);
      const px = Math.floor(cx + xr * f * sx + 0.5), py = Math.floor(cy - yt * f * sy + 0.5);
      if (px < 0 || px >= cols || py < this.y0 || py >= this.y1) continue;
      const k = py * cols + px;
      if (zt <= this.z[k]) continue;
      const pir = 0.5 + 0.5 * Math.sin(t * 2.3 + arr[i + 3] * 5);
      let b = 0.45 + 0.55 * pir * pir + derinlik(zt) * 1.2;
      b *= clamp((t - arr[i + 4]) / 0.5, 0, 1);
      this.z[k] = zt;
      this.yaz(k, tablo, pir > 0.85 ? '.:o*' : '.:o', b);
    }
  }

  sahne(sahne, kam, t) {
    this.noktalar(sahne.bulut.v, sahne.bulut.n, kam, t);
    this.kuyruk(sahne, kam, t);
    for (const fl of sahne.cicekler) this.cicek(fl, kam, t);
    this.cipsofila(sahne.cipsofila, kam, t);
  }

  // Bos hucreye (buketin arkasina) yaz
  arkaya(px, py, ch, renk) {
    px = Math.round(px); py = Math.round(py);
    if (px < 0 || px >= this.yer.cols || py < this.y0 || py >= this.y1) return;
    const k = py * this.yer.cols + px;
    if (this.z[k] !== -Infinity) return;
    this.ch[k] = ch; this.renk[k] = renk;
  }

  // Ust/alt metin satirlarina yaz
  metin(satir, sutun, str, renk) {
    const cols = this.yer.cols;
    if (satir < 0 || satir >= this.yer.rows) return;
    for (let i = 0; i < str.length; i++) {
      const x = sutun + i;
      if (x < 0 || x >= cols) continue;
      const k = satir * cols + x;
      this.ch[k] = str[i];
      this.renk[k] = typeof renk === 'function' ? renk(i) : renk;
    }
  }
}
