import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as THREE from 'three';
import { colors } from '../../constants/theme';
import JerseyFlip from './JerseyFlip';
import { Shorts } from './Shirt';
import { createJerseyScene, hasGlyphs } from './jersey3d/model';

// Native modul yo'q bo'lsa (eski dev-build) import xato beradi — unda 2D zaxira ko'rinish
let GLView = null;
try {
  ({ GLView } = require('expo-gl')); // eslint-disable-line global-require
} catch {
  GLView = null;
}

/**
 * Haqiqiy 3D forma (expo-gl + three.js, model: jersey3d/model.js). Barmoq bilan aylantiriladi (inersiya bilan),
 * "Old/Orqa" tanlansa kerakli tomonga buriladi; rang, ism, raqam, shrift, neon va yamoqlar darhol yangilanadi.
 * Kadr faqat nimadir o'zgarganda chiziladi — tinch turganda GPU/batareya ishlamaydi.
 *
 * Zaxira (JerseyFlip, 2D): GL moduli yoki WebGL2 yo'q, GL xatosi, ismda 3D shriftida yo'q harf (kirill) yoki `flat`.
 * Shortik: 3D modeli yo'q — forma ostida xuddi shu rang va uslubdagi 2D shortik (raqam bilan).
 *
 * Props (JerseyFlip bilan bir xil): kit { color, ink, trim?, grad?, textStyle?, glow?, crest?, patches? },
 * name, number, shorts: null | { number }, side, onSideChange, width, flat, background
 */
const DRAG_RAD_PER_PX = 0.011;
const FRICTION = 0.93;
const HALF = Math.PI;

const faceOf = (yaw) => (Math.round(yaw / HALF) % 2 === 0 ? 'front' : 'back');
/** Joriy burchakka eng yaqin, kerakli tomonga qaragan burchak */
const nearestYaw = (yaw, side) => {
  const base = side === 'back' ? HALF : 0;
  return base + Math.round((yaw - base) / (2 * HALF)) * 2 * HALF;
};

export default function Jersey3D(props) {
  const { name = '', flat = false } = props;
  const [failed, setFailed] = useState(false);
  const fallback = flat || failed || !GLView || !hasGlyphs(String(name).trim().toUpperCase());
  if (fallback) return <JerseyFlip {...props} />;
  return <JerseyGL {...props} onFail={() => setFailed(true)} />;
}

function JerseyGL({ kit, name = '', number = '', shorts = null, side = 'back', onSideChange, width: wanted = 190, background = colors.surface, onFail }) {
  // Tor ekranda sahna ekrandan chiqib ketmasin
  const { width: screen } = useWindowDimensions();
  const width = Math.min(wanted, (screen - 48) / 1.7);
  const stageW = Math.round(width * 1.7);
  const stageH = Math.round(width * (shorts ? 1.36 : 1.62));

  const gfx = useRef(null); // { gl, renderer, view }
  const motion = useRef({ yaw: (side === 'back' ? HALF : 0) + 0.7, pitch: 0, vel: 0, target: side === 'back' ? HALF : 0, dragging: false, dirty: true });
  const sideRef = useRef(side);
  const onSideRef = useRef(onSideChange);
  onSideRef.current = onSideChange;
  const failRef = useRef(onFail);
  failRef.current = onFail;
  const reduceMotion = useRef(false);
  const viewProps = { kit, name, number };
  const propsRef = useRef(viewProps);
  propsRef.current = viewProps;
  const propsKey = JSON.stringify(viewProps);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => {
        if (!active || !v) return;
        reduceMotion.current = true;
        motion.current.yaw = motion.current.target;
        motion.current.dirty = true;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Rang/matn o'zgardi — sahna yangilanadi
  useEffect(() => {
    if (!gfx.current) return;
    gfx.current.view.update(propsRef.current);
    motion.current.dirty = true;
  }, [propsKey]);

  // "Old/Orqa" tashqaridan almashtirildi — eng yaqin yo'l bilan buriladi
  useEffect(() => {
    if (sideRef.current === side) return;
    sideRef.current = side;
    const m = motion.current;
    if (!m.dragging) {
      m.vel = 0;
      m.target = nearestYaw(m.yaw, side);
      m.dirty = true;
    }
  }, [side]);

  // Render sikli: faqat harakat/o'zgarish bo'lsa chiziladi
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const g = gfx.current;
      if (!g) return;
      const m = motion.current;
      if (!m.dragging) {
        if (Math.abs(m.vel) > 0.0008) {
          m.yaw += m.vel;
          m.vel *= FRICTION;
          m.dirty = true;
          if (Math.abs(m.vel) <= 0.0008) m.target = nearestYaw(m.yaw, faceOf(m.yaw));
        } else if (m.target != null && Math.abs(m.target - m.yaw) > 0.0015) {
          m.yaw += (m.target - m.yaw) * (reduceMotion.current ? 1 : 0.14);
          m.dirty = true;
        }
        if (Math.abs(m.pitch) > 0.001) {
          m.pitch *= 0.85;
          m.dirty = true;
        }
      }
      if (!m.dirty) return;
      m.dirty = false;
      g.view.root.rotation.set(m.pitch, m.yaw, 0);
      try {
        g.renderer.render(g.view.scene, g.view.camera);
        g.gl.endFrameEXP();
      } catch {
        gfx.current = null;
        failRef.current?.();
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      const g = gfx.current;
      gfx.current = null;
      if (g) {
        g.view.dispose();
        g.renderer.dispose();
      }
    };
  }, []);

  const onContextCreate = (gl) => {
    // three.js r163+ faqat WebGL2 bilan ishlaydi (expo-gl GLES3 bo'lmagan qurilmada WebGL1 beradi)
    if (!gl.supportsWebGL2) {
      failRef.current?.();
      return;
    }
    try {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const canvas = { width: w, height: h, clientWidth: w, clientHeight: h, style: {}, addEventListener() {}, removeEventListener() {}, getContext: () => gl };
      const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      const view = createJerseyScene({ ...propsRef.current, background });
      view.setAspect(w / h);
      gfx.current = { gl, renderer, view };
      motion.current.dirty = true;
    } catch {
      failRef.current?.();
    }
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Asosan gorizontal surish — ekranning vertikal skroli ishlayveradi
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          const m = motion.current;
          m.dragging = true;
          m.vel = 0;
          m.target = null;
          m.lastDx = 0;
          m.lastT = Date.now();
        },
        onPanResponderMove: (_, g) => {
          const m = motion.current;
          const step = (g.dx - m.lastDx) * DRAG_RAD_PER_PX;
          const now = Date.now();
          m.yaw += step;
          m.vel = step / Math.max(1, (now - m.lastT) / 16);
          m.lastDx = g.dx;
          m.lastT = now;
          m.pitch = Math.max(-0.28, Math.min(0.28, g.dy * 0.004));
          m.dirty = true;
        },
        onPanResponderRelease: () => {
          const m = motion.current;
          m.dragging = false;
          if (reduceMotion.current) m.vel = 0;
          // Inersiya tugagach qaysi tomonda to'xtashini oldindan bilib, tugmani yangilaymiz
          const projected = m.yaw + m.vel / (1 - FRICTION);
          const next = faceOf(projected);
          if (!m.vel) m.target = nearestYaw(m.yaw, next);
          if (next !== sideRef.current) {
            sideRef.current = next;
            onSideRef.current?.(next);
          }
        },
        onPanResponderTerminate: () => {
          const m = motion.current;
          m.dragging = false;
          m.vel = 0;
          m.target = nearestYaw(m.yaw, sideRef.current);
        },
      }),
    [],
  );

  return (
    <View style={styles.wrap}>
      <View
        style={{ width: stageW, height: stageH }}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityHint="Swipe left or right to rotate"
      >
        <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} msaaSamples={4} />
      </View>
      {shorts ? (
        <View style={styles.shorts} pointerEvents="none">
          <Shorts
            width={Math.round(width * 0.6)}
            color={kit.grad?.[0] || kit.color}
            trim={kit.trim || kit.ink}
            ink={kit.ink}
            number={shorts.number}
            glow={kit.glow}
            textStyle={kit.textStyle}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  shorts: { marginTop: -14 },
});
