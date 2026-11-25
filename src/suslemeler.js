// Ekran uzerindeki suslemeler: yukselen kalpler, dusen yapraklar, yildizlar ve mesaj yazimi.

import { TAU, clamp, rastgele } from './matematik.js';
import { KALP_RENKLERI, YAPRAKCIK_RENKLERI, MESAJ_RENKLERI, SOLUK, BASLIK, karistir } from './renkler.js';

const YAPRAKCIK = [',', '\'', '`', '.', '~'];

export class Suslemeler {
  constructor(ayar) {
    this.rnd = rastgele(4242);
    this.kalpKar = ayar.ascii ? '*' : '♥';
    this.kalpler = [];
    this.yapraklar = [];
    this.yildizlar = [];
    this.yer = null;
    this.kalpSayi = ayar.kalpSayisi ?? 14;
    this.yaprakSayi = ayar.yaprakSayisi ?? 18;
  }

  boyutla(yer) {
    this.yer = yer;
    const r = this.rnd;
    this.kalpler = Array.from({ length: this.kalpSayi }, () => this.yeniKalp(true));
    this.yapraklar = Array.from({ length: this.yaprakSayi }, () => this.yeniYaprak(true));
    const n = Math.floor((yer.cols * yer.gorusSatir) / 90);
    this.yildizlar = Array.from({ length: n }, () => ({
      x: Math.floor(r() * yer.cols), y: yer.ust + Math.floor(r() * yer.gorusSatir), faz: r() * TAU, hiz: 0.6 + r() * 1.4,
    }));
  }

  yeniKalp(ilk) {
    const r = this.rnd, y = this.yer;
    return {
      x: r() * y.cols, y: ilk ? y.ust + r() * y.gorusSatir : y.ust + y.gorusSatir + r() * 4,
      vy: 1.2 + r() * 2.2, faz: r() * TAU, genlik: 0.6 + r() * 1.6, renk: Math.floor(r() * KALP_RENKLERI.length),
    };
  }

  yeniYaprak(ilk) {
    const r = this.rnd, y = this.yer;
    return {
      x: r() * y.cols, y: ilk ? y.ust + r() * y.gorusSatir : y.ust - 1 - r() * 6,
      vy: 0.8 + r() * 1.4, vx: 1.5 + r() * 2.5, faz: r() * TAU, renk: Math.floor(r() * YAPRAKCIK_RENKLERI.length),
    };
  }

  guncelle(dt, t) {
    const y = this.yer;
    for (let i = 0; i < this.kalpler.length; i++) {
      const k = this.kalpler[i];
      k.y -= k.vy * dt;
      if (k.y < y.ust - 1) this.kalpler[i] = this.yeniKalp(false);
    }
    for (let i = 0; i < this.yapraklar.length; i++) {
      const p = this.yapraklar[i];
      p.y += p.vy * dt;
      p.x += (p.vx + Math.sin(t * 0.9 + p.faz) * 2.5) * dt;
      if (p.y > y.ust + y.gorusSatir || p.x > y.cols + 2) this.yapraklar[i] = this.yeniYaprak(false);
    }
  }

  // Giris sirasinda once yildizlar, sonra kalpler ve yapraklar belirir
  ciz(c, t) {
    for (const s of this.yildizlar) {
      const p = 0.5 + 0.5 * Math.sin(t * s.hiz + s.faz);
      if (p < 0.55) continue;
      c.arkaya(s.x, s.y, p > 0.93 ? '+' : '.', karistir(0x2a1c24, 0x9a7c8a, (p - 0.55) / 0.45));
    }
    if (t < 3) return;
    for (const k of this.kalpler) {
      const x = k.x + Math.sin(t * 1.3 + k.faz) * k.genlik;
      c.arkaya(x, k.y, this.kalpKar, KALP_RENKLERI[k.renk]);
    }
    for (const p of this.yapraklar) {
      c.arkaya(p.x, p.y, YAPRAKCIK[Math.floor(t * 2 + p.faz) % YAPRAKCIK.length], YAPRAKCIK_RENKLERI[p.renk]);
    }
  }
}

// ---------- mesajlar ----------

const HARF_HIZI = 22; // saniyede harf
const BEKLE = 4.2, SILME_HIZI = 70, ARA = 0.7;

export class Mesajlar {
  constructor(ayar, baslangic) {
    this.liste = ayar.mesajlar.length ? ayar.mesajlar : [''];
    this.baslik = ayar.kime ? `~ ${ayar.kime} icin ~` : '~ senin icin ~';
    this.imza = ayar.imza ?? (ayar.kimden ? `sevgiyle, ${ayar.kimden}` : '');
    this.kalp = ayar.ascii ? '<3' : '♥';
    this.bas = baslangic;
    this.i = 0;
    this.t0 = baslangic;
  }

  sonraki(t) {
    this.i = (this.i + 1) % this.liste.length;
    this.t0 = t;
  }

  metin(t) {
    if (t < this.t0) return { yazi: '', imlec: false };
    const m = this.liste[this.i];
    const yazma = m.length / HARF_HIZI, silme = m.length / SILME_HIZI;
    const e = t - this.t0;
    if (e < yazma) return { yazi: m.slice(0, Math.floor(e * HARF_HIZI)), imlec: true };
    if (e < yazma + BEKLE) return { yazi: m, imlec: Math.floor(e * 2) % 2 === 0 };
    if (e < yazma + BEKLE + silme) return { yazi: m.slice(0, Math.ceil(m.length - (e - yazma - BEKLE) * SILME_HIZI)), imlec: true };
    if (e < yazma + BEKLE + silme + ARA) return { yazi: '', imlec: true };
    this.sonraki(t);
    return this.metin(t);
  }

  ciz(c, t, yer) {
    const cols = yer.cols;
    // baslik
    const bg = clamp((t - 0.3) / 1.2, 0, 1);
    if (bg > 0) {
      const b = this.baslik;
      c.metin(0, Math.floor((cols - b.length) / 2), b, karistir(0x000000, BASLIK, bg));
    }
    // mesaj
    const { yazi, imlec } = this.metin(t);
    const satir = yer.rows - 2;
    const tam = yazi + (imlec ? '_' : ' ');
    const x0 = Math.floor((cols - this.liste[this.i].length) / 2);
    c.metin(satir, x0, tam, (i) => MESAJ_RENKLERI[Math.floor(i * 0.5 + t * 6) % MESAJ_RENKLERI.length]);
    // imza
    if (this.imza && t > this.bas) {
      const s = `${this.kalp} ${this.imza} ${this.kalp}`;
      c.metin(yer.rows - 1, Math.floor((cols - s.length) / 2), s, karistir(0x000000, SOLUK, clamp(t - this.bas, 0, 1)));
    }
  }
}
