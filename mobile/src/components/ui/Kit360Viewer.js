import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../../constants/theme';
import viewerHtml from './kit360/viewerHtml';
import useKit360Bridge from './kit360/useKit360Bridge';

// Eski dev-build'da native modul bo'lmasa import xato beradi — unda `fallback` (old tomon surati)
let WebView = null;
try {
  ({ WebView } = require('react-native-webview')); // eslint-disable-line global-require
} catch {
  WebView = null;
}

/**
 * Forma 360°: admin paneldagi bilan bir xil foto-360° (Superadmin/Kit360 → viewer.html), ilova ichidagi lokal HTML
 * (kadrlar ichida, tarmoq URL'i yo'q). Barmoq bilan aylantiriladi; "Old/Orqa" — `view`.
 *
 * Props: team (features/kit360 → kit360Team), name, number, view, onViewChange, height, fallback, t
 */
export default function Kit360Viewer({ height = 360, fallback = null, t = (k) => k, ...props }) {
  const ref = useRef(null);
  const [key, setKey] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const post = useCallback((msg) => ref.current?.postMessage(msg), []);
  const { ready, error, onMessage, reset } = useKit360Bridge(props, post);

  if (!WebView) return fallback;

  const retry = () => {
    reset();
    setCrashed(false);
    setKey((k) => k + 1);
  };
  const failed = crashed || Boolean(error);

  return (
    <View style={[styles.box, { height }]}>
      {failed && fallback ? (
        fallback
      ) : (
        <WebView
          key={key}
          ref={ref}
          source={{ html: viewerHtml }}
          originWhitelist={['*']}
          // Faqat shu ichki sahifa va Google Fonts uslublari (havola/yo'naltirish ochilmaydi)
          onShouldStartLoadWithRequest={(req) => req.url.startsWith('about:') || req.url.startsWith('data:')}
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled={false}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          androidLayerType="hardware"
          style={styles.web}
          containerStyle={styles.web}
          onMessage={(e) => onMessage(e.nativeEvent.data)}
          onError={() => setCrashed(true)}
          onRenderProcessGone={() => setCrashed(true)}
          onContentProcessDidTerminate={() => setCrashed(true)}
        />
      )}
      {!ready && !failed ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
      {failed ? (
        <Pressable style={styles.retry} onPress={retry}>
          <Text style={styles.retryText}>{t('kit360Retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', borderRadius: radii.xl, overflow: 'hidden', backgroundColor: '#b8b8ba' },
  web: { flex: 1, backgroundColor: 'transparent' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  retry: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
