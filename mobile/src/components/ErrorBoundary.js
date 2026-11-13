import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fonts, themedStyles } from '../constants/theme';
import { ThemeContextObject } from '../contexts/ThemeContext';

/**
 * Global ErrorBoundary — kutilmagan render xatosida butun ilova oq ekranga
 * aylanib qolmasligi uchun. `componentDidCatch`/`getDerivedStateFromError`
 * class component orqali amalga oshiriladi — bu React'da hook bilan bo'lmaydi.
 * Shu sabab mavzu rangini `useTheme()` o'rniga `static contextType` orqali oladi.
 *
 * "Qayta urinish" — faqat o'z holatini tozalaydi (daraxt qayta render bo'ladi);
 * agar xato yana takrorlansa (masalan global holatda buzilgan ma'lumot bo'lsa),
 * `onReset` prop orqali ilova darajasidagi holatni ham tozalash mumkin.
 */
export default class ErrorBoundary extends React.Component {
  static contextType = ThemeContextObject;

  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Hozircha masofaviy jurnalga yuborilmaydi — hech bo'lmasa konsolga yoziladi
    // (keyinchalik Sentry/boshqa xizmat ulanganda shu joyga qo'shiladi)
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleRetry = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    const colors = this.context.colors;

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Nimadir xato ketdi</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Ilovada kutilmagan xatolik yuz berdi. Qayta urinib ko'ring — agar
            takrorlansa, ilovani to'liq qayta ishga tushiring.
          </Text>
          <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={this.handleRetry} accessibilityRole="button">
            <Text style={styles.buttonText}>Qayta urinish</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = themedStyles(() => ({
  safe: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(242,163,58,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { fontFamily: fonts.display, fontSize: 19, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  buttonText: { color: '#1A1300', fontFamily: fonts.bodySemi, fontSize: 15 },
}));
