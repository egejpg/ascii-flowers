// Tamponu ANSI renkli metne cevirir.

export function renkModu(env = process.env) {
  if (env.BUKET_RENK === '256') return 256;
  if (env.BUKET_RENK === '24') return 24;
  if (env.TERM_PROGRAM === 'Apple_Terminal') return 256;
  return 24;
}

function x256(r, g, b) {
  const q = (v) => (v < 48 ? 0 : v < 115 ? 1 : Math.floor((v - 35) / 40));
  const lv = [0, 95, 135, 175, 215, 255];
  const cr = q(r), cg = q(g), cb = q(b);
  const d1 = (lv[cr] - r) ** 2 + (lv[cg] - g) ** 2 + (lv[cb] - b) ** 2;
  const gi = Math.max(0, Math.min(23, Math.round(((r + g + b) / 3 - 8) / 10)));
  const gv = 8 + 10 * gi;
  const d2 = (gv - r) ** 2 + (gv - g) ** 2 + (gv - b) ** 2;
  return d1 <= d2 ? 16 + 36 * cr + 6 * cg + cb : 232 + gi;
}

export class TerminalCikti {
  constructor(mod) {
    this.mod = mod;
    this.onbellek = new Map();
    this.onceki = [];
  }

  kacis(renk) {
    let s = this.onbellek.get(renk);
    if (!s) {
      const r = (renk >> 16) & 255, g = (renk >> 8) & 255, b = renk & 255;
      s = this.mod === 24 ? `\x1b[38;2;${r};${g};${b}m` : `\x1b[38;5;${x256(r, g, b)}m`;
      this.onbellek.set(renk, s);
    }
    return s;
  }

  sifirla() { this.onceki = []; }

  // Sadece degisen satirlari yazar
  kare(c) {
    const { cols, rows } = c.yer;
    const parcalar = [];
    for (let y = 0; y < rows; y++) {
      let satir = '', son = -1;
      const o = y * cols;
      for (let x = 0; x < cols; x++) {
        const ch = c.ch[o + x];
        if (ch !== ' ') {
          const r = c.renk[o + x];
          if (r !== son) { satir += this.kacis(r); son = r; }
        }
        satir += ch;
      }
      if (this.onceki[y] !== satir) {
        parcalar.push(`\x1b[${y + 1};1H`, satir, '\x1b[0m');
        this.onceki[y] = satir;
      }
    }
    return parcalar.join('');
  }

  // Tek seferlik cikti (renkli ya da duz)
  static duz(c, renkli, mod = 24) {
    const t = new TerminalCikti(mod);
    const { cols, rows } = c.yer;
    const satirlar = [];
    for (let y = 0; y < rows; y++) {
      let s = '', son = -1;
      for (let x = 0; x < cols; x++) {
        const k = y * cols + x, ch = c.ch[k];
        if (renkli && ch !== ' ' && c.renk[k] !== son) { s += t.kacis(c.renk[k]); son = c.renk[k]; }
        s += ch;
      }
      satirlar.push(renkli ? s + '\x1b[0m' : s.trimEnd());
    }
    return satirlar.join('\n');
  }
}
