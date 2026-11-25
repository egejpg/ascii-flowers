// Tarayici surumu: ayni sahne ve cizici, cikti canvas'a karakter karakter cizilir.
// Kontroller: surukle = cevir, tikla / bosluk = durdur, + - hiz, r yon

import { AYARLAR } from './ayarlar.js';
import { sahneKur } from './src/sahne.js';
import { Cizici, yerlesim, kamera } from './src/cizici.js';
import { Suslemeler, Mesajlar } from './src/suslemeler.js';

const params = new URLSearchParams(location.search);
const ayar = { ...AYARLAR };
if (params.has('kime')) ayar.kime = params.get('kime');
if (params.has('mesaj')) ayar.mesajlar = [params.get('mesaj')];
if (params.has('tohum')) ayar.tohum = Number(params.get('tohum')) || ayar.tohum;
if (params.get('yazi') === '1') ayar.yazilar = true;
if (params.get('giris') === '0') ayar.giris = false;

const GIRIS_SONU = 5.6;
const canvas = document.getElementById('sahne');
const ctx = canvas.getContext('2d', { alpha: false });
const FONT = 'Menlo, "SF Mono", Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace';

let yer, sahne, c, hucreW, hucreH, fontPx;
const sus = new Suslemeler(ayar);
const mesaj = new Mesajlar(ayar, GIRIS_SONU);
const renkCss = new Map();
const css = (r) => {
  let s = renkCss.get(r);
  if (!s) { s = '#' + r.toString(16).padStart(6, '0'); renkCss.set(r, s); }
  return s;
};

function boyutla() {
  const W = window.innerWidth, H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // hucre 1:2; kucuk ekranda da yeterli cozunurluk olsun
  hucreH = Math.max(7, Math.min(18, Math.min(H / 62, W / 62)));
  hucreW = hucreH / 2;
  const cols = Math.floor(W / hucreW), rows = Math.floor(H / hucreH);
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, (W - cols * hucreW) / 2 * dpr, (H - rows * hucreH) / 2 * dpr);
  fontPx = hucreH * 0.84;
  yer = yerlesim(cols, rows, ayar.yazilar);
  sahne = sahneKur(ayar, 0.6 / yer.sx);
  c = new Cizici(yer);
  sus.boyutla(yer);
}

function ciz() {
  const { cols, rows } = yer;
  ctx.fillStyle = '#000';
  ctx.fillRect(-hucreW, -hucreH, (cols + 2) * hucreW, (rows + 2) * hucreH);
  ctx.font = `${fontPx}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let son = -1;
  for (let y = 0; y < rows; y++) {
    const o = y * cols, py = y * hucreH + hucreH / 2;
    for (let x = 0; x < cols; x++) {
      const ch = c.ch[o + x];
      if (ch === ' ') continue;
      const r = c.renk[o + x];
      if (r !== son) { ctx.fillStyle = css(r); son = r; }
      ctx.fillText(ch, x * hucreW + hucreW / 2, py);
    }
  }
}

// ---------- durum ve kontroller ----------

let t = ayar.giris ? 0 : GIRIS_SONU;
let aci = 0.3, egim = ayar.egim, hiz = ayar.donmeHizi, yon = 1, durdu = false;
let surukle = null;

canvas.addEventListener('pointerdown', (e) => {
  surukle = { x: e.clientX, y: e.clientY, aci, egim, hareket: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!surukle) return;
  const dx = e.clientX - surukle.x, dy = e.clientY - surukle.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) surukle.hareket = true;
  aci = surukle.aci + dx * 0.008;
  egim = Math.max(-0.2, Math.min(0.9, surukle.egim + dy * 0.004));
});
canvas.addEventListener('pointerup', () => {
  if (surukle && !surukle.hareket) durdu = !durdu;
  surukle = null;
});
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { durdu = !durdu; e.preventDefault(); }
  else if (e.key === '+' || e.key === '=') hiz = Math.min(3, hiz * 1.25);
  else if (e.key === '-') hiz = Math.max(0.05, hiz / 1.25);
  else if (e.key === 'r' || e.key === 'R') yon = -yon;
  else if (e.key === 'ArrowRight') aci += 0.15;
  else if (e.key === 'ArrowLeft') aci -= 0.15;
  else if (e.key === 'ArrowUp') egim = Math.min(0.9, egim + 0.05);
  else if (e.key === 'ArrowDown') egim = Math.max(-0.2, egim - 0.05);
});

let boyutBekle = null;
window.addEventListener('resize', () => {
  clearTimeout(boyutBekle);
  boyutBekle = setTimeout(boyutla, 150);
});

let onceki = performance.now();
function kare(simdi) {
  const dt = Math.min(0.1, (simdi - onceki) / 1000);
  onceki = simdi;
  t += dt;
  if (!durdu && !surukle) aci += hiz * yon * dt;
  sus.guncelle(dt, t);
  c.temizle();
  sus.ciz(c, t);
  c.sahne(sahne, kamera(aci, egim, yer, ayar.kameraUzaklik), t);
  if (ayar.yazilar) mesaj.ciz(c, t, yer);
  ciz();
  requestAnimationFrame(kare);
}

boyutla();
requestAnimationFrame(kare);
