import { useCallback, useEffect, useState } from 'react';
import { api, assetUrl } from '../../services/api';

/**
 * 3D forma (WebView ichidagi viewer.html — admin paneldagi bilan bir xil kod, packages/kit-3d).
 * Bu yerda: ilova ma'lumotlarini v1 dizayn shakliga o'girish va viewer bilan xabar almashish.
 */

/** viewer.html protokolidagi belgi (packages/kit-3d/src/viewer/protocol.js bilan bir xil) */
export const VIEWER_SOURCE = 'formo-kit';
/** Telefonda tekstura o'lchami va yozish paytidagi kechikish */
export const MOBILE_TEXTURE_SIZE = 1024;
export const UPDATE_DEBOUNCE_MS = 80;

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX3 = /^#[0-9a-fA-F]{3}$/;

/** "#FFF" → "#ffffff"; noto'g'ri bo'lsa fallback */
export function toHex6(value, fallback) {
  if (HEX6.test(value || '')) return value.toLowerCase();
  if (HEX3.test(value || '')) return `#${value.slice(1).split('').map((c) => c + c).join('')}`.toLowerCase();
  return fallback;
}

const base = (over) => ({
  designVersion: 1,
  name: '',
  pattern: 'plain',
  neck: 'round',
  sponsorText: '',
  backTopText: '',
  crestImageUrl: null,
  sponsorImageUrl: null,
  ...over,
});

/** Klub formasi (katalogdagi kit) → v1 dizayn: forma rangi, yozuv rangi, nishonda klub kodi */
export function clubKitDesign(product) {
  const color = toHex6(product?.color, '#1a3582');
  const ink = toHex6(product?.accent, '#ffffff');
  return base({ name: product?.code || '', primaryColor: color, secondaryColor: ink, textColor: ink });
}

/** "Maxsus dizayn" studiyasi tanlovi (designPreview natijasi) → v1 dizayn; gradient — "fade" naqshi */
export function studioKitDesign(preview) {
  const color = toHex6(preview?.color, '#5a66de');
  const ink = toHex6(preview?.accent, '#f3f5f9');
  const gradient = preview?.gradient;
  return base({
    name: 'Formo',
    primaryColor: gradient ? toHex6(gradient[0], color) : color,
    secondaryColor: gradient ? toHex6(gradient[1], ink) : ink,
    textColor: ink,
    pattern: gradient ? 'fade' : 'plain',
  });
}

/** Viewer rasmlarni o'zi yuklaydi — nisbiy server manzillari to'liq URL'ga aylantiriladi */
export function withAssetUrls(design) {
  if (!design) return design;
  return { ...design, crestImageUrl: assetUrl(design.crestImageUrl), sponsorImageUrl: assetUrl(design.sponsorImageUrl) };
}

/** WebView'ga yuboriladigan xabar */
export function viewerMessage(props) {
  return JSON.stringify({ source: VIEWER_SOURCE, type: 'update', props });
}

/** WebView'dan kelgan xabar (boshqa sahifa xabarlari e'tiborsiz) */
export function parseViewerMessage(raw) {
  try {
    const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return msg && msg.source === VIEWER_SOURCE && typeof msg.type === 'string' ? msg : null;
  } catch {
    return null;
  }
}

/** Studiyadagi orqa yozuv qoidalari bilan bir xil: 12 belgigacha, raqam 0–99 */
export const printProps = (name, number) => ({
  backName: String(name || '').trim().slice(0, 12),
  number: String(number || '').replace(/\D/g, '').slice(0, 2),
});

/** Nashr qilingan 3D dizaynlar (GET /kits/designs): yuklanish, xato (tarmoq yo'q) va qayta urinish */
export function useKitDesigns() {
  const [state, setState] = useState({ designs: [], loading: true, error: null });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const designs = await api.kits.designs();
      setState({ designs: Array.isArray(designs) ? designs : [], loading: false, error: null });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}
