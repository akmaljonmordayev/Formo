import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

const THUMB = 24;

/**
 * Qo'shimcha kutubxonasiz gorizontal slayder (dizayndagi `<input type="range">`).
 * Bosilgan joyga sakraydi, sudralganda qadam bo'yicha yaxlitlaydi; faqat qiymat
 * o'zgarganda `onChange` chaqiriladi. Ekran o'quvchilar uchun "adjustable".
 */
export default function RangeSlider({ value, min, max, step = 1, onChange, accessibilityLabel, color = '#F2A33A', trackColor = '#1B2560' }) {
  const widthRef = useRef(0);
  const startRef = useRef(value);
  // PanResponder bir marta yaratiladi — eng so'nggi props ref orqali o'qiladi
  const propsRef = useRef({ value, min, max, step, onChange });
  propsRef.current = { value, min, max, step, onChange };

  const responder = useMemo(() => {
    const clamp = (raw) => {
      const p = propsRef.current;
      const stepped = Math.round((raw - p.min) / p.step) * p.step + p.min;
      return Math.min(p.max, Math.max(p.min, stepped));
    };
    const fromX = (x) => {
      const p = propsRef.current;
      const usable = Math.max(1, widthRef.current - THUMB);
      return p.min + ((x - THUMB / 2) / usable) * (p.max - p.min);
    };
    const emit = (raw) => {
      const next = clamp(raw);
      if (next !== propsRef.current.value) propsRef.current.onChange?.(next);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        const next = clamp(fromX(event.nativeEvent.locationX));
        startRef.current = next;
        emit(next);
      },
      onPanResponderMove: (_, gesture) => {
        const p = propsRef.current;
        const usable = Math.max(1, widthRef.current - THUMB);
        emit(startRef.current + (gesture.dx / usable) * (p.max - p.min));
      },
    });
  }, []);

  const ratio = max > min ? (Math.min(max, Math.max(min, value)) - min) / (max - min) : 0;

  return (
    <View
      {...responder.panHandlers}
      onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const delta = e.nativeEvent.actionName === 'increment' ? step : -step;
        const next = Math.min(max, Math.max(min, value + delta));
        if (next !== value) onChange?.(next);
      }}
      style={styles.hit}
    >
      {/* Bolalar teginishni olmaydi — locationX doim konteynerga nisbatan bo'ladi */}
      <View pointerEvents="none" style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: `${ratio * 100}%`, marginLeft: -ratio * THUMB, backgroundColor: color }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 32, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, marginHorizontal: THUMB / 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  thumb: {
    position: 'absolute',
    top: (32 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    borderColor: '#080C24',
  },
});
