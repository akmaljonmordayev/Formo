// Shrift paket ichida (internet/Google Fonts kerak emas) — admin va mobil WebView bir xil chizadi
// Paket "exports" maydoni "./700" → "./700.css" (".css" qo'shib yozilsa topilmaydi)
import '@fontsource/big-shoulders-display/700';
import '@fontsource/big-shoulders-display/800';
import '@fontsource/big-shoulders-display/900';

/** Canvas'ga chizishdan oldin shrift yuklanishini kutadi (xato bo'lsa zaxira shrift bilan davom etadi) */
export function loadKitFonts() {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve();
  return Promise.all(['700', '800', '900'].map((w) => document.fonts.load(`${w} 100px "Big Shoulders Display"`))).then(
    () => undefined,
    () => undefined,
  );
}
