import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, radii } from '../../constants/theme';
import viewerHtml from './kit3d/viewerHtml';
import useKitBridge from './kit3d/useKitBridge';

/**
 * Expo web: react-native-webview web'da ishlamaydi — o'sha viewer.html iframe (srcdoc) ichida,
 * xabarlar postMessage orqali. iframe sandbox'da (allow-scripts), ilova sahifasiga kira olmaydi.
 */
export default function KitViewer({ height = 360, ...props }) {
  const frame = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const post = useCallback((msg) => frame.current?.contentWindow?.postMessage(msg, '*'), []);
  const { ready, onMessage } = useKitBridge(props, post);

  useEffect(() => {
    const listener = (e) => {
      if (e.source === frame.current?.contentWindow) onMessage(e.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onMessage]);

  return (
    <View style={[styles.box, { height }]}>
      {React.createElement('iframe', {
        ref: frame,
        title: '3D',
        srcDoc: viewerHtml,
        sandbox: 'allow-scripts',
        onLoad: () => setLoaded(true),
        style: { width: '100%', height: '100%', border: 0, display: 'block', background: 'transparent' },
      })}
      {!ready || !loaded ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', borderRadius: radii.xl, overflow: 'hidden', backgroundColor: '#1a1b1e' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
