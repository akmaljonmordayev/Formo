export const THUMB_W = 360;
export const THUMB_H = 432;

/**
 * Sahna kadridan ro'yxat uchun kichik PNG: markazdan kesib (forma kadr o'rtasida) THUMB_W × THUMB_H ga kichraytiradi.
 * @param {string} dataUrl sahna snapshot()
 * @returns {Promise<Blob>}
 */
export async function makeThumbnail(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const target = THUMB_W / THUMB_H;
  let sw = img.width;
  let sh = img.height;
  if (sw / sh > target) sw = sh * target;
  else sh = sw / target;
  const cv = document.createElement('canvas');
  cv.width = THUMB_W;
  cv.height = THUMB_H;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, THUMB_W, THUMB_H);
  // GPU band bo'lsa WebGL bo'sh kadr berishi mumkin — shaffof rasm saqlanmasin (ro'yxatda rang namunasi qoladi)
  const alpha = ctx.getImageData(0, 0, THUMB_W, THUMB_H).data;
  let visible = false;
  for (let i = 3; i < alpha.length && !visible; i += 16) visible = alpha[i] > 0;
  if (!visible) throw new Error("3D kadr bo'sh chiqdi — dizaynni qayta saqlang");
  return new Promise((resolve, reject) => {
    cv.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG yaratib bo‘lmadi'))), 'image/png');
  });
}
