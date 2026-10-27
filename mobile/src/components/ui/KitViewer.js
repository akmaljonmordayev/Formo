import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../../constants/theme';
import viewerHtml from './kit3d/viewerHtml';
import useKitBridge from './kit3d/useKitBridge';

// Eski dev-build'da native modul bo'lmasa import xato beradi — unda `fallback` (oldingi 3D/2D ko'rinish)
let WebView = null;
try {
  ({ WebView } = require('react-native-webview')); // eslint-disable-line global-require
} catch {
  WebView = null;
}

/**
 * 3D forma: admin paneldagi bilan aynan bir xil sahna (packages/kit-3d → viewer.html), ilova ichidagi
 * lokal HTML sifatida (tarmoq URL'i yo'q). Barmoq bilan aylantiriladi; "Old/Orqa" — `view`.
 *
 * Props: design (v1), backName, number, glow, patch, view, onViewChange, height, fallback, t
 * Yuklanguncha spinner; WebView xatosida "Qayta urinish" va (berilgan bo'lsa) fallback.
 */
export default function KitViewer({ height = 360, fallback = null, t = (k) => k, ...props }) {
  const ref = useRef(null);
  const [key, setKey] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const post = useCallback((msg) => ref.current?.postMessage(msg), []);
  const { ready, error, onMessage, reset } = useKitBridge(props, post);

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
          // Ichki HTML'ning origin'i platformaga qarab about:blank yoki data: — shuning uchun '*';
          // navigatsiya esa pastda faqat shu ichki sahifaga cheklangan (havola/yo'naltirish ochilmaydi)
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={(req) => req.url.startsWith('about:') || req.url.startsWith('data:')}
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled={false}
          // Lokal dev'da rasmlar http://<kompyuter-IP>:3001 dan keladi
          mixedContentMode="always"
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
          <Text style={styles.retryText}>{t('kit3dRetry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', borderRadius: radii.xl, overflow: 'hidden', backgroundColor: '#1a1b1e' },
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
