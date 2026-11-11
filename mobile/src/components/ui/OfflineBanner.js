import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fonts, themedStyles } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import useNetworkStatus from '../../hooks/useNetworkStatus';

/**
 * Doimiy "Siz oflaynsiz" banner — har bir so'rovdagi umumiy tarmoq xatosi
 * matni o'rniga, butun ilova davomida ko'rinadi (App.js'da bir marta,
 * AppNavigator'dan tepada joylashtiriladi).
 */
export default function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6, backgroundColor: colors.danger }]} pointerEvents="none">
      <MaterialCommunityIcons name="wifi-off" size={14} color={colors.white} />
      <Text style={[styles.text, { color: colors.white }]}>Internet aloqasi yo'q</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
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
  },
  text: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
  },
}));
