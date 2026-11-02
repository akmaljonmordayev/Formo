import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRAMES_DIR = path.join(__dirname, 'frames');
const BUILD_SCRIPT = path.join(__dirname, 'viewer', 'build.mjs');

const psScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
public static class Kit360Mask {
  // 1 = garment: pixels the border flood fill cannot reach through low-saturation steps of <= STEP luminance
  const int STEP = 3, STEP_IN = 1, SAT = 10, MIN_BLOB = 400, MARGIN = 6;
  public static byte[] Garment(byte[] px, int w, int h) {
    int n = w * h; var bg = new bool[n]; var lum = new int[n]; var grey = new bool[n];
    for (int p = 0; p < n; p++) {
      int b = px[p * 4], g = px[p * 4 + 1], r = px[p * 4 + 2];
      lum[p] = (299 * r + 587 * g + 114 * b) / 1000;
      grey[p] = System.Math.Max(r, System.Math.Max(g, b)) - System.Math.Min(r, System.Math.Min(g, b)) <= SAT;
    }
    // Studio grey range seen on the border: white fabric shading must not leak into the background through gentle steps
    var border = new System.Collections.Generic.List<int>();
    for (int x = 0; x < w; x++) { border.Add(lum[x]); border.Add(lum[(h - 1) * w + x]); }
    for (int y = 0; y < h; y++) { border.Add(lum[y * w]); border.Add(lum[y * w + w - 1]); }
    border.Sort();
    lo = border[border.Count / 20] - MARGIN; hi = border[border.Count * 19 / 20] + MARGIN;
    // Row span between clearly-fabric pixels: inside it the fill may only creep (STEP_IN), so folds in white shorts that
    // happen to match a light background are not eaten, while gaps between the legs/under the arms still clear
    spanL = new int[h]; spanR = new int[h]; W = w;
    for (int y = 0; y < h; y++) {
      spanL[y] = w; spanR[y] = -1;
      for (int x = 0; x < w; x++) {
        int p = y * w + x, b = px[p * 4], g = px[p * 4 + 1], r = px[p * 4 + 2];
        int sat = System.Math.Max(r, System.Math.Max(g, b)) - System.Math.Min(r, System.Math.Min(g, b));
        if (sat > 25 || lum[p] < lo - 20 || lum[p] > hi + 15) { if (x < spanL[y]) spanL[y] = x; spanR[y] = x; }
      }
    }
    var q = new int[n]; int head = 0, tail = 0;
    for (int x = 0; x < w; x++) { Seed(x, bg, grey, lum, q, ref tail); Seed((h - 1) * w + x, bg, grey, lum, q, ref tail); }
    for (int y = 0; y < h; y++) { Seed(y * w, bg, grey, lum, q, ref tail); Seed(y * w + w - 1, bg, grey, lum, q, ref tail); }
    while (head < tail) {
      int p = q[head++], x = p % w;
      if (x > 0) Grow(p, p - 1, bg, grey, lum, q, ref tail);
      if (x < w - 1) Grow(p, p + 1, bg, grey, lum, q, ref tail);
      if (p >= w) Grow(p, p - w, bg, grey, lum, q, ref tail);
      if (p < n - w) Grow(p, p + w, bg, grey, lum, q, ref tail);
    }
    var m = new byte[n];
    for (int p = 0; p < n; p++) m[p] = bg[p] ? (byte)0 : (byte)1;
    DropSpecks(m, w, h, q);
    return m;
  }
  static int lo, hi, W;
  static int[] spanL, spanR;
  static void Seed(int p, bool[] bg, bool[] grey, int[] lum, int[] q, ref int tail) {
    if (!bg[p] && grey[p] && lum[p] >= lo && lum[p] <= hi) { bg[p] = true; q[tail++] = p; }
  }
  static void Grow(int from, int p, bool[] bg, bool[] grey, int[] lum, int[] q, ref int tail) {
    if (bg[p] || !grey[p] || lum[p] < lo || lum[p] > hi) return;
    int y = p / W, x = p % W;
    int step = x >= spanL[y] && x <= spanR[y] ? STEP_IN : STEP;
    if (System.Math.Abs(lum[p] - lum[from]) > step) return;
    bg[p] = true; q[tail++] = p;
  }
  // JPEG noise islands far from the kit would otherwise stretch the bounding box
  static void DropSpecks(byte[] m, int w, int h, int[] q) {
    int n = w * h; var seen = new bool[n];
    for (int s = 0; s < n; s++) {
      if (m[s] == 0 || seen[s]) continue;
      int head = 0, tail = 0; q[tail++] = s; seen[s] = true;
      while (head < tail) {
        int p = q[head++], x = p % w;
        int[] nb = { x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p < n - w ? p + w : -1 };
        foreach (int k in nb) if (k >= 0 && m[k] == 1 && !seen[k]) { seen[k] = true; q[tail++] = k; }
      }
      if (tail < MIN_BLOB) for (int i = 0; i < tail; i++) m[q[i]] = 0;
    }
  }
}
"@

function Fit-Frame-Seamless($srcPath, $dstPath, $flip) {
  $bmp = [System.Drawing.Bitmap]::new($srcPath)
  if ($flip) {
    $bmp.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
  }
  $sw = $bmp.Width
  $sh = $bmp.Height

  $rect = [System.Drawing.Rectangle]::new(0, 0, $sw, $sh)
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = [byte[]]::new($sw * $sh * 4)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)

  $bgR = 0; $bgG = 0; $bgB = 0; $bgN = 0
  for ($y = 0; $y -lt 35; $y += 3) {
    for ($x = 0; $x -lt 35; $x += 3) {
      $i = ($y * $sw + $x) * 4
      $bgB += $bytes[$i]; $bgG += $bytes[$i+1]; $bgR += $bytes[$i+2]; $bgN++
    }
  }
  $bgR /= $bgN; $bgG /= $bgN; $bgB /= $bgN
  $bgL = 0.299 * $bgR + 0.587 * $bgG + 0.114 * $bgB

  # Background = everything reachable from the border through small grey steps (handles gradient/vignette and soft floor shadows)
  $mask = [Kit360Mask]::Garment($bytes, $sw, $sh)
  $minX = $sw; $maxX = 0; $minY = $sh; $maxY = 0
  for ($y = 0; $y -lt $sh; $y++) {
    $row = $y * $sw
    for ($x = 0; $x -lt $sw; $x++) {
      if ($mask[$row + $x]) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  $targetR = 184; $targetG = 184; $targetB = 186
  $cleanSrc = [System.Drawing.Bitmap]::new($sw, $sh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $cData = $cleanSrc.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $outBytes = [byte[]]::new($sw * $sh * 4)

  $dilMask = [byte[]]::new($sw * $sh)
  for ($y = 1; $y -lt $sh - 1; $y++) {
    for ($x = 1; $x -lt $sw - 1; $x++) {
      $p = $y * $sw + $x
      if ($mask[$p] -or $mask[$p-1] -or $mask[$p+1] -or $mask[$p-$sw] -or $mask[$p+$sw]) {
        $dilMask[$p] = 1
      }
    }
  }

  for ($y = 0; $y -lt $sh; $y++) {
    for ($x = 0; $x -lt $sw; $x++) {
      $i = ($y * $sw + $x) * 4
      $p = $y * $sw + $x
      if ($dilMask[$p]) {
        $outBytes[$i] = $bytes[$i]
        $outBytes[$i+1] = $bytes[$i+1]
        $outBytes[$i+2] = $bytes[$i+2]
        $outBytes[$i+3] = 255
      } else {
        $outBytes[$i] = $targetB
        $outBytes[$i+1] = $targetG
        $outBytes[$i+2] = $targetR
        $outBytes[$i+3] = 255
      }
    }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($outBytes, 0, $cData.Scan0, $outBytes.Length)
  $cleanSrc.UnlockBits($cData)

  $targetTopY = 142
  $targetBottomY = 498
  $targetH = $targetBottomY - $targetTopY
  $scale = $targetH / [Math]::Max(10, ($maxY - $minY))
  $targetW = [Math]::Round(($maxX - $minX) * $scale)

  $dstBmp = [System.Drawing.Bitmap]::new(600, 800, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($dstBmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $g.Clear([System.Drawing.Color]::FromArgb($targetR, $targetG, $targetB))

  $srcGarmentRect = [System.Drawing.Rectangle]::new($minX, $minY, $maxX - $minX, $maxY - $minY)
  $dstX = [Math]::Round(300 - $targetW / 2)
  $dstRect = [System.Drawing.Rectangle]::new($dstX, $targetTopY, $targetW, $targetH)

  $g.DrawImage($cleanSrc, $dstRect, $srcGarmentRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $cleanSrc.Dispose()
  $bmp.Dispose()

  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $encParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
  $encParams.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 94L)
  $dstBmp.Save($dstPath, $jpegCodec, $encParams)
  $dstBmp.Dispose()
  Write-Output "Seamless fitted $dstPath (W=$targetW, H=$targetH, X=$dstX, Y=$targetTopY)"
}
`;

export function processTeam(teamCode, sourceFiles) {
  const teamDir = path.join(FRAMES_DIR, teamCode);
  if (!fs.existsSync(teamDir)) fs.mkdirSync(teamDir, { recursive: true });

  let frames;
  if (sourceFiles.f7) {
    // All 8 frames provided explicitly!
    frames = [
      { f: 0, file: sourceFiles.f0, flip: false },
      { f: 1, file: sourceFiles.f1, flip: false },
      { f: 2, file: sourceFiles.f2, flip: false },
      { f: 3, file: sourceFiles.f3, flip: false },
      { f: 4, file: sourceFiles.f4, flip: false },
      { f: 5, file: sourceFiles.f5, flip: false },
      { f: 6, file: sourceFiles.f6, flip: false },
      { f: 7, file: sourceFiles.f7, flip: false },
    ];
  } else {
    // 5 Master frames provided: mirror f3->f5, f2->f6, f1->f7
    frames = [
      { f: 0, file: sourceFiles.f0, flip: false },
      { f: 1, file: sourceFiles.f1, flip: false },
      { f: 2, file: sourceFiles.f2, flip: false },
      { f: 3, file: sourceFiles.f3, flip: false },
      { f: 4, file: sourceFiles.f4, flip: false },
      { f: 5, file: sourceFiles.f3, flip: true },
      { f: 6, file: sourceFiles.f2, flip: true },
      { f: 7, file: sourceFiles.f1, flip: true },
    ];
  }

  const tmpPs = path.join(__dirname, `_tmp_fit_${teamCode}.ps1`);
  let psContent = psScript + '\n';
  for (const item of frames) {
    const dst = path.join(teamDir, `f${item.f}.jpg`);
    psContent += `Fit-Frame-Seamless "${item.file.replace(/\\/g, '\\\\')}" "${dst.replace(/\\/g, '\\\\')}" ${item.flip ? '$true' : '$false'}\n`;
  }
  fs.writeFileSync(tmpPs, psContent);

  console.log(`[Kit360] Normalizing 8 frames for team "${teamCode}"...`);
  const res = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpPs], { stdio: 'inherit' });
  try { fs.unlinkSync(tmpPs); } catch {}

  if (res.status === 0) {
    console.log(`[Kit360] Successfully fitted all 8 frames for ${teamCode}!`);
    console.log(`[Kit360] Rebuilding mobile viewer bundle...`);
    spawnSync('node', [BUILD_SCRIPT], { stdio: 'inherit' });
    return true;
  } else {
    console.error(`[Kit360] Error fitting frames, status: ${res.status}`);
    return false;
  }
}

// CLI usage:
// 1) node process_team.mjs <team> <dir_with_f0_to_f7_or_f4>
// 2) node process_team.mjs <team> <f0> <f1> <f2> <f3> <f4> [f5] [f6] [f7]
const args = process.argv.slice(2);
const team = args[0];

if (team && args.length === 2 && fs.existsSync(args[1]) && fs.statSync(args[1]).isDirectory()) {
  const dir = args[1];
  const files = {};
  for (let i = 0; i < 8; i++) {
    const p = path.join(dir, `f${i}.jpg`);
    if (fs.existsSync(p)) files[`f${i}`] = p;
  }
  if (files.f0 && files.f1 && files.f2 && files.f3 && files.f4) {
    processTeam(team, files);
  }
} else if (team && args.length >= 6) {
  const sourceFiles = {
    f0: args[1], f1: args[2], f2: args[3], f3: args[4], f4: args[5]
  };
  if (args.length >= 9) {
    sourceFiles.f5 = args[6];
    sourceFiles.f6 = args[7];
    sourceFiles.f7 = args[8];
  }
  processTeam(team, sourceFiles);
}
