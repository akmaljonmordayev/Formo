/**
 * 3D forma yozuvi uchun shrift: SairaExtraCondensed 800 (2D Shirt bilan bir xil) TTF → three.js
 * typeface JSON (FontLoader formati). Faqat bosma ismda bo'lishi mumkin bo'lgan bosh harflar, raqamlar
 * va tinish belgilari olinadi — bundle kichik qoladi.
 *
 * Bir martalik generator (ilova bog'liqligi emas):
 *   npx -p opentype.js@1.3.4 node scripts/build-jersey-font.js
 * yoki opentype.js o'rnatilgan papkani NODE_PATH bilan bering.
 */
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const SRC = path.join(
  __dirname,
  '../node_modules/@expo-google-fonts/saira-extra-condensed/800ExtraBold/SairaExtraCondensed_800ExtraBold.ttf',
);
const OUT = path.join(__dirname, '../src/components/ui/jersey3d/sairaFont.json');

// Backend printName: /^[\p{L}\p{M} .'’-]{1,12}$/u — ilova bosh harfga o'tkazadi
const ranges = [
  [0x20, 0x20],
  [0x27, 0x27],
  [0x2d, 0x2e],
  [0x30, 0x39],
  [0x3f, 0x3f], // FontLoader topilmagan belgi o'rniga '?' oladi
  [0x41, 0x5a],
  [0xc0, 0xde],
  [0x100, 0x17f],
  [0x2bb, 0x2bc],
  [0x2018, 0x2019],
  [0x400, 0x42f],
  [0x490, 0x4ff],
];

const font = opentype.parse(fs.readFileSync(SRC).buffer.slice(0));
const round = (v) => Math.round(v);
const glyphs = {};

for (const [from, to] of ranges) {
  for (let code = from; code <= to; code++) {
    const ch = String.fromCodePoint(code);
    // Lotin-kengaytma oralig'idagi kichik harflar kerak emas
    if (code >= 0x100 && code <= 0x17f && ch !== ch.toUpperCase()) continue;
    if (code >= 0x490 && code <= 0x4ff && ch !== ch.toUpperCase()) continue;
    const glyph = font.charToGlyph(ch);
    if (!glyph || glyph.index === 0) continue;
    const cmds = glyph.getPath(0, 0, font.unitsPerEm).commands;
    const o = [];
    // getPath Y o'qini pastga qaratadi — typeface formatida yuqoriga
    for (const c of cmds) {
      if (c.type === 'M') o.push('m', round(c.x), round(-c.y));
      else if (c.type === 'L') o.push('l', round(c.x), round(-c.y));
      else if (c.type === 'Q') o.push('q', round(c.x), round(-c.y), round(c.x1), round(-c.y1));
      else if (c.type === 'C') o.push('b', round(c.x), round(-c.y), round(c.x1), round(-c.y1), round(c.x2), round(-c.y2));
    }
    glyphs[ch] = { ha: round(glyph.advanceWidth), x_min: round(glyph.xMin ?? 0), x_max: round(glyph.xMax ?? 0), o: o.join(' ') };
  }
}

const json = {
  glyphs,
  familyName: 'Saira ExtraCondensed',
  ascender: font.ascender,
  descender: font.descender,
  underlinePosition: font.tables.post.underlinePosition,
  underlineThickness: font.tables.post.underlineThickness,
  boundingBox: { yMin: font.tables.head.yMin, xMin: font.tables.head.xMin, yMax: font.tables.head.yMax, xMax: font.tables.head.xMax },
  resolution: font.unitsPerEm,
  original_font_information: { copyright: font.names.copyright?.en ?? '', license: 'SIL Open Font License 1.1' },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(json));
console.log(`${Object.keys(glyphs).length} glyph → ${path.relative(process.cwd(), OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
