import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';
import useNetworkStatus from '../../hooks/useNetworkStatus';

/**
 * Doimiy "Siz oflaynsiz" banner — har bir so'rovdagi umumiy tarmoq xatosi
 * matni o'rniga, butun ilova davomida ko'rinadi (App.js'da bir marta,
 * AppNavigator'dan tepada joylashtiriladi).
 */
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <MaterialCommunityIcons name="wifi-off" size={14} color={colors.text} />
      <Text style={styles.text}>Internet aloqasi yo'q</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 8,
    backgroundColor: colors.danger,
  },
  text: {
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
});
