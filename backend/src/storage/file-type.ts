/**
 * Fayl turi kengaytma yoki Content-Type bo'yicha emas, birinchi baytlar (magic bytes) bo'yicha aniqlanadi —
 * "rasm.png" deb nomlangan HTML/SVG/skript qabul qilinmaydi. SVG ataylab yo'q (ichida skript bo'lishi mumkin).
 */
export type ImageType = { ext: 'png' | 'jpg' | 'webp'; mime: string };

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b);

export function detectImage(buf: Buffer): ImageType | null {
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: 'png', mime: 'image/png' };
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { ext: 'jpg', mime: 'image/jpeg' };
  // RIFF....WEBP
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}
