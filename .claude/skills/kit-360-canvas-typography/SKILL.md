---
name: kit-360-canvas-typography
description: >-
  Specialized engineering runbook for 2D Canvas jersey rendering, 360-degree kit frame segmentation,
  multilingual athletic typography (Latin, Russian Cyrillic, Uzbek Cyrillic/Latin), and input state UX
  in Formo's superadmin/kit-360 and Design Studio. Activate whenever modifying Kit360, measure.js,
  jersey previews, custom print fonts, or 360° kit photos.
---

# Kit-360 Canvas, Photo Segmentation & Multilingual Typography Skill

This skill enforces production-grade graphics and UX invariants for `frontend/src/pages/Superadmin/Kit360/` and related jersey preview modules.

> **Important Override (vs. `ponytail`):** Never sacrifice correctness for line-count brevity in Canvas 2D, font loading, pixel segmentation, or controlled input caret handling. Explicit bounds math, async readiness checks, and HiDPI scaling are mandatory.

## 1. Photo & 360° Frame Pipeline Invariants

1. **Safe Image Readiness & Error Handling**
   - Always check `img.complete && img.naturalWidth > 0` on **every** frame image (including reference `backImg` `f4.jpg`). Never rely on `img.complete` alone (`complete` is `true` on broken/404 images).
   - Attach both `onload` and `onerror` handlers. If `backImg` (`f4.jpg`) fails or is still loading, render a loading skeleton or fall back to current-frame torso measurement instead of freezing stale frames from a previously selected team.
   - Normalize or crop out the outer `#b2b2b3` matting border baked into `600×800` frame JPEGs (`~48px` top, `~24px` left/right, `~14px` bottom) or match container matting cleanly.

2. **HiDPI (`devicePixelRatio`) Backing Store**
   - Scale the `<canvas>` backing buffer by `Math.min(window.devicePixelRatio || 1, 2)` (`canvas.width = W * dpr`, `canvas.height = H * dpr`, `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`) so photos and diagonal/curved letter edges stay sharp on Retina and mobile screens.
   - Do not use `ctx.filter = 'blur(...)'` without feature guards and HiDPI scaling; prefer subpixel anti-aliased offscreen supersampling (`2x` offscreen text canvas downsampled onto the surface).

3. **Chroma-Safe Garment Segmentation (`measure.js`)**
   - Distinguish **background studio grey** (connected exterior border flood-fill from `CROP` edges) and **glossy grey mannequin skin** (`s <= 4 && 70 <= l < 205`, horizontal runs `>= 10px`) from **white/grey/shadowed fabric**.
   - **CRITICAL Neutral-White Invariant:** Pure studio-white fabric (`rm`, `en`, `fr`, `mu`, `mci`) frequently has `s <= 4` (`R ≈ G ≈ B`) with `l >= 205`. `pixelKind` MUST classify `l >= 205` as `FABRIC` (matching `isGrey`'s `l < 205` bound) so pure-white jerseys/shorts are never misclassified as `GREY` mannequin plastic or punched with `mask = 0` holes in `garmentMask`.
   - **Exterior Background Masking:** `garmentMask` must zero out both exterior flood-filled `BG` (stopping at luminance gradient edges so shadowed white fabric stays intact) and `GREY` mannequin limbs/fingers, with a 1px edge feather so angled text never bleeds onto studio background or hanging fingers.

4. **Multi-Angle Shorts Number Geometry & AI-Badge Handling (`0°`, `45°`, `315°`)**
   - **Anatomical Leg Invariant (Never Swap Legs):** The shorts number ALWAYS belongs on the **mannequin's left leg** (the rightmost leg on screen across `frame === 0`, `1`, `7`). **Never** jump or mirror the number onto `leftCx` (the mannequin's right/crest leg) on `frame === 1` — swapping legs causes the player number and club crest to swap places during rotation.
   - **Hand-Safe Silhouette Measurement:** Do not measure shorts width solely at `y = 470`, where the mannequin's hanging grey hand/fingers (`y ≈ 435–478`) truncate `top[1]` on `45°`/`315°`. Measure `hem` across multiple right-leg columns, and measure `rightEdge` at the actual print band `y` (excluding `GREY` hand runs via `garmentMask` / multi-row interpolation between waist `y ≈ 420` and lower hem `y = hem - 12`).
   - **Foreshortening & Edge Clearance on `315°` (`frame === 7`) and `45°` (`frame === 1`):** Use realistic thigh depth (`LEG_DEPTH ≈ 0.58`, small `t0 ≈ 0.06–0.08`) anchored to `rightEdge(yPrint)` so `315°` centers around `x ≈ 346` (keeping `>= 14px` margin inside the tapered outer silhouette and clear of far-right Nike/Adidas edge tips on `psg/f7`, `ar/f7`) and `45°` centers around `x ≈ 312` (clear of both the crotch seam and outer Adidas stripes).
   - **Brand Logo Clearance vs. AI-Mirrored Crest Healing:**
     - If a small brand logo (Nike swoosh / Adidas triangle on `ar/f1`, `mu/f1`, `psg/f1`, `en/f0`, `psg/f0`, `pt/f0`, `mu/f0`) sits near the lower hem (`hem - 28 .. hem - 8`), lift `y` (digit baseline) `>= 6px` above the detected logo top (clamped below shirt hem) so both number and brand logo remain cleanly separated.
     - If `frame === 1` has an AI-hallucinated club crest inside the mid-thigh number zone while the opposite leg `leftCx` is calm (`fr/f1`, `en/f1`, `mci/f1`), **inpaint/heal** that isolated badge patch row-by-row from adjacent clean shorts fabric pixels (`±4px` left/right linear blend + micro-grain) on the canvas before compositing the number on the anatomically correct right-side leg.

5. **Stripe-Safe Fabric Shading (`shadeInto`)**
   - Never treat raw RGB luminance `L` of striped jerseys (`ar`, `fcb`, `psg`) as 3D physical height. High-contrast color stripes create huge luminance step edges (`gx`) that tear letters (`±MAX_SHIFT`) and blow out highlights (`sheen`).
   - Suppress step edges where chromaticity (`R-G`, `G-B` or HSV hue/saturation delta) changes sharply, or extract soft low-frequency fold shading within homogeneous color zones only, clamping highlight sheen to subtle values (`<= 18` RGB).

## 2. Multilingual Athletic Fonts & Canvas Metrics

1. **Mandatory Script Coverage (`Latin` + `Cyrillic` + `Uzbek Extended`)**
   - Every font offered in `FONTS` must either natively cover `A-Z`, `А-ЯЁ`, Uzbek Cyrillic (`Ў`, `Қ`, `Ғ`, `Ҳ`), and Uzbek apostrophe (`ʻ` U+02BB / `ʼ` U+02BC), **or** declare an explicit Cyrillic-capable athletic companion font (e.g., `Oswald`, `Russo One` + glyph fallback / self-hosted WOFF2, `Unbounded`, `Sofia Sans Extra Condensed`, `Alumni Sans`, `Rubik Mono One`) so `Sport`/`Bebas`/`Teko`/`Graduate` never silently fall back to system `Arial` / `sans-serif` mid-word or mismatch between name and number.
   - In font-picker buttons, keep translated UI labels (`Спорт`, `Модерн`, `Колледж`) in `var(--font-body)` or show a consistent Latin/numeric specimen (`AB 10`) in the target athletic font so buttons do not render ransom-note fallback glyphs in `RU` / `ЎЗ` locales.

2. **Race-Free Font & `unicode-range` Loading**
   - Wait for the `<link rel="stylesheet">` `load` event (or preload fonts in `index.html`) before calling `document.fonts.load(...)`.
   - Call `document.fonts.load(fontCss(style.font, 48), `${name || 'ISROIL ИСРОИЛ ЎҚҒҲ'} ${number || '10'}`)` with the **actual characters being rendered** so Google Fonts downloads the required `cyrillic` and `cyrillic-ext` WOFF2 subsets, and subscribe to `document.fonts.addEventListener('loadingdone', ...)` to trigger a canvas repaint.

3. **Full Bounding-Box Text Layer (`textLayer`)**
   - Measure actual glyph metrics on `text` (`actualBoundingBoxAscent`, `actualBoundingBoxDescent`, `actualBoundingBoxLeft`, `actualBoundingBoxRight`), keeping `'H0'` only for nominal cap-height scaling (`capRatio`).
   - Size offscreen canvas height to `Math.ceil(ascent + descent) + pad * 2` and set `baseline = pad + Math.ceil(ascent)` so diacritics (`Й`, `Ё`, `Ў`) are never clipped at the top and descenders (`Д`, `Ц`, `Щ`, `Қ`, `Ҳ`) are never chopped off at the bottom.
   - Enforce `maxW` horizontal fitting on **both** `name` and `number` (e.g., wide digits `88`/`99` at `120%` scale in wide fonts).
   - Dynamically offset `number` top position below `name` bottom + minimum vertical gap so `scale > 1` never causes the number to collide with the name.
   - When warping vertical strips onto the torso ellipse (`arcTable`), composite onto an opaque/premultiplied intermediate buffer without overlapping `+1px` semi-transparent alpha edges that create dark vertical seam bands.

## 3. Name & Number Input UX Invariants

1. **Sync with Platform Order Rules**
   - Load `order.rules` (`printNameMaxLength`, `printNumberMin`, `printNumberMax`) and `order.bannedWords` via `loadSettings()` (with `DEFAULT_ORDER_RULES` fallback).
   - Support number `"0"` (and single/double digits within `[printNumberMin, printNumberMax]`); do **not** strip `"0"` via `.replace(/^0+/, '')`.
2. **Uzbek Apostrophe Normalization & Caret Preservation**
   - Normalize keyboard apostrophe variants (`` ` ``, `'`, `‘`, `’`, `ʼ`, `ʻ`) to standard `' ` or `ʻ` **before** stripping invalid characters so typing `O` + `` ` `` produces `O'` instead of `O`.
   - Collapse leading/trailing whitespace when measuring/rendering on the jersey back so `" ALI"` stays centered over the spine, while allowing single internal spaces while typing.
   - Remove restrictive raw DOM `maxLength` before sanitization (sanitize first, then `.slice(0, maxLen)`) and preserve input caret position (`selectionStart`/`selectionEnd`) on mid-string edits.
3. **Context-Aware View Auto-Rotation**
   - When editing `name`, auto-rotate to a back view (`frame in BACK_FRAMES`) only if currently facing front/side.
   - When editing `number`, `numberColor`, or `scale`, **keep the current frame** if the user is already viewing a shorts-number front frame (`frame === 0`, `1`, `7`) so they can preview shorts numbering live without being forcibly spun to `180°`.

## 4. Verification Checklist

1. Run `pnpm --filter @formo/frontend test` and add unit tests in `Kit360.test.jsx` & `measure.test.js` covering:
   - `"0"`, `"07"`, `"99"` in `cleanNumber`;
   - Uzbek apostrophes (`o\`ktam`, `gʼofur`), Cyrillic (`ЙЎЛДОШЕВ`, `ҚОДИРОВ`, `ЩУКИН`), and paste-truncation in `cleanName`;
   - Non-overlapping `name` and `number` boxes at `scale = 1.2` and `maxW` clamping for `"88"`.
2. Visually verify in Chrome (`UZ`, `ЎЗ`, `RU` locales) across striped (`ar`, `fcb`, `psg`), white (`rm`, `en`), and dark (`fr`) kits across all 8 angles (`0°–315°`).

