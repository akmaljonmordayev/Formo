import { useEffect, useRef } from 'react';
import { STUDIO_BACKGROUND, createKitScene } from './scene.js';

/**
 * 3D forma ko'rinishi (web). Props:
 *   design      — KitDesign (normalizeDesign qoidalari bilan)
 *   backName    — orqadagi ism (bo'sh — faqat dizayn)
 *   number      — orqadagi raqam 0–99 (bo'sh — raqamsiz)
 *   view        — 'front' | 'back': o'zgarganda kamera shu tomonga buriladi
 *   autoRotate  — avtomatik aylanish
 *   textureSize — tekstura o'lchami (standart 2048, mobilda 1024)
 *   onReady(api)— sahna API: snapshot(), setView(), ...
 */
export default function Kit3DViewer({
  design,
  backName = '',
  number = '',
  view = 'front',
  autoRotate = true,
  textureSize = 2048,
  debounceMs = 60,
  onReady,
  onViewChange,
  className,
  style,
}) {
  const ref = useRef(null);
  const sceneRef = useRef(null);
  const mounted = useRef(false);
  // Sahna faqat bir marta yaratiladi; boshlang'ich qiymatlar ref orqali olinadi
  const initial = useRef({ design, backName, number, view, autoRotate, onReady, onViewChange });
  initial.current.onViewChange = onViewChange;

  useEffect(() => {
    const init = initial.current;
    const api = createKitScene(ref.current, {
      design: init.design,
      backName: init.backName,
      number: init.number,
      view: init.view,
      autoRotate: init.autoRotate,
      textureSize,
      debounceMs,
      onViewChange: (v) => initial.current.onViewChange?.(v),
    });
    sceneRef.current = api;
    init.onReady?.(api);
    return () => {
      api.dispose();
      sceneRef.current = null;
      mounted.current = false;
    };
  }, [textureSize, debounceMs]);

  useEffect(() => {
    sceneRef.current?.update({ design, backName, number });
  }, [design, backName, number]);

  useEffect(() => {
    // Birinchi render'da sahna allaqachon kerakli tomonda — burilish faqat o'zgarganda
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    sceneRef.current?.setView(view);
  }, [view]);

  useEffect(() => {
    sceneRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', background: STUDIO_BACKGROUND, ...style }}
    />
  );
}
