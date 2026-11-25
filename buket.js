#!/usr/bin/env node
// ASCII buket - terminalde donen 3B cicek buketi.
// Calistir:  node buket.js
// Kontroller: bosluk durdur | sol/sag ok elle cevir | yukari/asagi egim | + - hiz
//             r yon degistir | n sonraki mesaj | h yardim | q cikis

import { AYARLAR } from './ayarlar.js';
import { sahneKur } from './src/sahne.js';
import { Cizici, yerlesim, kamera } from './src/cizici.js';
import { Suslemeler, Mesajlar } from './src/suslemeler.js';
import { TerminalCikti, renkModu } from './src/terminal.js';
import { SOLUK } from './src/renkler.js';

// ---------- ayarlar: dosya < ortam degiskeni < komut satiri ----------

function arguman(ad) {
  const i = process.argv.indexOf(`--${ad}`);
  if (i < 0) return undefined;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

function ayarlariOku() {
  const a = { ...AYARLAR };
  const e = process.env;
  const metin = (k, env, arg) => { const v = arguman(arg) ?? e[env]; if (typeof v === 'string') a[k] = v; };
  const sayi = (k, env, arg) => { const v = Number(arguman(arg) ?? e[env]); if (Number.isFinite(v)) a[k] = v; };
  metin('kime', 'BUKET_KIME', 'kime');
  metin('kimden', 'BUKET_KIMDEN', 'kimden');
  metin('imza', 'BUKET_IMZA', 'imza');
  const tekMesaj = arguman('mesaj') ?? e.BUKET_MESAJ;
  if (typeof tekMesaj === 'string') a.mesajlar = [tekMesaj];
  sayi('tohum', 'BUKET_TOHUM', 'tohum');
  sayi('fps', 'BUKET_FPS', 'fps');
  sayi('donmeHizi', 'BUKET_HIZ', 'hiz');
  sayi('egim', 'BUKET_EGIM', 'egim');
  sayi('kameraUzaklik', 'BUKET_UZAKLIK', 'uzaklik');
  if (arguman('girissiz') || e.BUKET_GIRIS === '0') a.giris = false;
  if (arguman('ascii') || e.BUKET_ASCII === '1') a.ascii = true;
  if (arguman('yazili') || e.BUKET_YAZI === '1') a.yazilar = true;
  if (arguman('yazisiz') || e.BUKET_YAZI === '0') a.yazilar = false;
  a.fps = Math.max(5, Math.min(60, a.fps));
  return a;
}

const ayar = ayarlariOku();
const GIRIS_SONU = 5.6; // cicekler acildiktan sonra mesajlar baslar

// ---------- tek kare (test / ekran goruntusu icin) ----------

function tekKare() {
  const t = Number(arguman('kare')) || 8;
  const [cols, rows] = String(arguman('boyut') || '120x45').split('x').map(Number);
  const aci = Number(arguman('aci') ?? 0.3);
  const yer = yerlesim(cols, rows, ayar.yazilar);
  const sahne = sahneKur(ayar, 0.6 / yer.sx);
  const c = new Cizici(yer);
  const sus = new Suslemeler(ayar);
  sus.boyutla(yer);
  const mesaj = new Mesajlar(ayar, GIRIS_SONU);
  c.temizle();
  sus.ciz(c, t);
  c.sahne(sahne, kamera(aci, ayar.egim, yer, ayar.kameraUzaklik), t);
  if (ayar.yazilar) mesaj.ciz(c, t, yer);
  process.stdout.write(TerminalCikti.duz(c, !arguman('renksiz'), renkModu()) + '\n');
}

// ---------- canli ----------

function canli() {
  const out = process.stdout;
  const cikti = new TerminalCikti(renkModu());
  const sus = new Suslemeler(ayar);
  let yer, sahne, c;

  const boyutla = () => {
    const cols = out.columns || 120, rows = out.rows || 40;
    yer = yerlesim(cols, rows, ayar.yazilar);
    sahne = sahneKur(ayar, 0.6 / yer.sx);
    c = new Cizici(yer);
    sus.boyutla(yer);
    cikti.sifirla();
    out.write('\x1b[2J');
  };

  let t = ayar.giris ? 0 : GIRIS_SONU;
  const mesaj = new Mesajlar(ayar, GIRIS_SONU);
  let aci = 0.3, egim = ayar.egim, hiz = ayar.donmeHizi, yon = 1, durdu = false, yardim = true;
  let son = performance.now(), zamanlayici = null, bitti = false;

  const bitir = () => {
    if (bitti) return;
    bitti = true;
    clearTimeout(zamanlayici);
    out.write('\x1b[0m\x1b[?25h\x1b[?1049l');
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.exit(0);
  };

  out.write('\x1b[?1049h\x1b[?25l');
  boyutla();
  out.on('resize', boyutla);
  process.on('SIGINT', bitir);
  process.on('SIGTERM', bitir);
  process.on('uncaughtException', (err) => {
    out.write('\x1b[0m\x1b[?25h\x1b[?1049l');
    console.error(err);
    process.exit(1);
  });

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (k) => {
      if (k === 'q' || k === 'Q' || k === '\x03' || k === '\x1b') bitir();
      else if (k === ' ') durdu = !durdu;
      else if (k === '+' || k === '=') hiz = Math.min(3, hiz * 1.25);
      else if (k === '-' || k === '_') hiz = Math.max(0.05, hiz / 1.25);
      else if (k === 'r' || k === 'R') yon = -yon;
      else if (k === 'n' || k === 'N') mesaj.sonraki(Math.max(t, GIRIS_SONU));
      else if (k === 'h' || k === 'H') yardim = !yardim;
      else if (k === '\x1b[C') aci += 0.15;
      else if (k === '\x1b[D') aci -= 0.15;
      else if (k === '\x1b[A') egim = Math.min(0.9, egim + 0.05);
      else if (k === '\x1b[B') egim = Math.max(-0.2, egim - 0.05);
    });
  }

  const YARDIM = 'bosluk:durdur  oklar:cevir  +/-:hiz  r:yon  n:mesaj  h:gizle  q:cikis';

  const kare = () => {
    if (bitti) return;
    const bas = performance.now();
    const dt = Math.min(0.1, (bas - son) / 1000);
    son = bas;
    t += dt;
    if (!durdu) aci += hiz * yon * dt;

    sus.guncelle(dt, t);
    c.temizle();
    sus.ciz(c, t);
    c.sahne(sahne, kamera(aci, egim, yer, ayar.kameraUzaklik), t);
    if (ayar.yazilar) mesaj.ciz(c, t, yer);
    if (ayar.yazilar && yardim && t < 12 && yer.cols > YARDIM.length + 4) c.metin(yer.rows - 1, yer.cols - YARDIM.length - 1, YARDIM, SOLUK);
    if (durdu && ayar.yazilar) c.metin(0, 1, '[durdu]', SOLUK);

    out.write(cikti.kare(c));
    const gecen = performance.now() - bas;
    zamanlayici = setTimeout(kare, Math.max(1, 1000 / ayar.fps - gecen));
  };
  kare();
}

if (arguman('kare') !== undefined) tekKare();
else canli();
