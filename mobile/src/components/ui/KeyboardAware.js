import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, ScrollView, TextInput, View } from 'react-native';

// Klaviatura bilan ishlash — ikkala platformada bir xil.
// Expo SDK 58 (Android edge-to-edge) da `softwareKeyboardLayoutMode: resize` oynani
// kichraytirmaydi, shuning uchun klaviatura inputlarni yopib qo'yardi. Bu yerda
// klaviatura konteynerning qancha qismini yopayotganini o'lchab, aynan shuncha joy
// bo'shatamiz (oyna o'zi kichraygan qurilmalarda overlap 0 bo'ladi — ikki marta surilmaydi).

const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
const INPUT_GAP = 24;

/** { visible, top } — top: klaviaturaning ekran bo'yicha yuqori cheti (px) */
export function useKeyboard() {
  const [state, setState] = useState({ visible: false, top: 0, height: 0 });
  useEffect(() => {
    const show = Keyboard.addListener(SHOW_EVENT, (e) => {
      const { screenY = 0, height = 0 } = e?.endCoordinates || {};
      // Ba'zi qurilmalarda screenY 0 keladi — unda oyna balandligidan hisoblaymiz
      const top = screenY > 0 ? screenY : Dimensions.get('window').height - height;
      setState({ visible: height > 0, top, height });
    });
    const hide = Keyboard.addListener(HIDE_EVENT, () => setState({ visible: false, top: 0, height: 0 }));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return state;
}

/**
 * KeyboardAvoidingView o'rniga: klaviatura yopgan qism qadar pastdan padding beradi.
 * Ichidagi skroll kichrayadi, pastki tugmalar klaviatura ustiga chiqadi.
 */
export function KeyboardAvoider({ style, children, enabled = true }) {
  const ref = useRef(null);
  const kb = useKeyboard();
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled || !kb.visible) {
      setInset(0);
      return undefined;
    }
    let cancelled = false;
    const measure = () =>
      ref.current?.measureInWindow?.((x, y, w, h) => {
        if (cancelled) return;
        // Klaviatura balandligidan ko'p bo'lishi mumkin emas (noto'g'ri o'lchovdan himoya)
        const overlap = Math.min(kb.height, Math.max(0, Math.round(y + h - kb.top)));
        // O'lchov bo'lmasa (eski arxitektura) — klaviatura balandligi
        setInset(Number.isFinite(overlap) && h > 0 ? overlap : kb.height);
      });
    // Android'da oyna kichrayishi (resize) layout'dan keyin tugaydi — bir kadr kutamiz
    const id = requestAnimationFrame(measure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [enabled, kb.visible, kb.top, kb.height]);

  return (
    <View ref={ref} collapsable={false} style={[{ flex: 1 }, style, inset ? { paddingBottom: inset } : null]}>
      {children}
    </View>
  );
}

/**
 * ScrollView: klaviatura ochilganda (yoki boshqa inputga o'tilganda) fokusdagi
 * inputni ko'rinadigan joyga suradi. KeyboardAvoider ichida ishlatiladi.
 */
export const KeyboardAwareScrollView = forwardRef(function KeyboardAwareScrollView(
  { onScroll, scrollEventThrottle, children, ...props },
  forwardedRef,
) {
  const scrollRef = useRef(null);
  const offset = useRef(0);
  const kb = useKeyboard();
  useImperativeHandle(forwardedRef, () => scrollRef.current);

  const reveal = useCallback(() => {
    const input = TextInput.State?.currentlyFocusedInput?.();
    if (!input?.measureInWindow || !kb.visible) return;
    input.measureInWindow((x, y, w, h) => {
      const limit = kb.top - INPUT_GAP;
      const bottom = y + h;
      if (bottom > limit) {
        scrollRef.current?.scrollTo({ y: offset.current + (bottom - limit), animated: true });
      } else if (y < 80) {
        scrollRef.current?.scrollTo({ y: Math.max(0, offset.current - (80 - y)), animated: true });
      }
    });
  }, [kb.visible, kb.top]);

  // Klaviatura ochilgach — avval KeyboardAvoider padding'i qo'llansin, keyin suramiz
  useEffect(() => {
    if (!kb.visible) return undefined;
    const id = setTimeout(reveal, Platform.OS === 'ios' ? 80 : 60);
    return () => clearTimeout(id);
  }, [kb.visible, kb.top, reveal]);

  const handleScroll = useCallback(
    (e) => {
      offset.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    },
    [onScroll],
  );

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      {...props}
      onScroll={handleScroll}
      scrollEventThrottle={scrollEventThrottle || 16}
      // Klaviatura ochiq paytda boshqa inputga teginilsa — o'shani ham ko'rsatamiz
      onTouchEnd={(e) => {
        props.onTouchEnd?.(e);
        if (kb.visible) setTimeout(reveal, 120);
      }}
    >
      {children}
    </ScrollView>
  );
});
