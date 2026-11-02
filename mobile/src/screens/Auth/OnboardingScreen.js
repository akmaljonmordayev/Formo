import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Kit360Thumb from '../../components/ui/Kit360Thumb';
import { colors } from '../../constants/theme';

const SLIDES = [
  {
    title: "O'z formangni yarat",
    desc: "Ism, raqam, ranglar va boshqa tafsilotlarni tanlang — premium futbol formasini o'zingizcha dizayn qiling.",
  },
  {
    title: 'Sevimli klub estetikasi',
    desc: "Elit klub formalari asosida o'z ko'rinishingizni yarating — klassik yo'laklar yoki zamonaviy away formalari.",
  },
  {
    title: 'Kontseptsiyadan yetkazishgacha',
    desc: "Dizayn qiling, buyurtma bering va qolganini Formo'ga qoldiring — premium sifat va o'z vaqtida yetkazish.",
  },
];

export default function OnboardingScreen({ onFinish }) {
  const [index, setIndex] = useState(0);

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      setIndex(index + 1);
    } else {
      onFinish?.();
    }
  };

  const current = SLIDES[index];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onFinish} hitSlop={12} style={styles.skipBtn}>
          <Text style={styles.skipText}>O'tkazib yuborish</Text>
        </Pressable>
      </View>

      <View style={styles.heroShell}>
        <View style={styles.radialGlow} />
        <View style={styles.cornerBadge}>
          <Text style={styles.cornerBadgeText}>FORMO</Text>
        </View>

        {index === 0 && (
          <View style={styles.jerseysRow}>
            <View style={[styles.sideShirt, styles.leftShirt]}>
              <Kit360Thumb team="ar" width={90} height={120} zoom={1.7} style={styles.kitPhoto} />
            </View>

            <View style={[styles.sideShirt, styles.rightShirt]}>
              <Kit360Thumb team="mu" width={90} height={120} zoom={1.7} style={styles.kitPhoto} />
            </View>

            <View style={styles.centerShirt}>
              <Kit360Thumb team="rm" width={143} height={190} zoom={1.7} style={styles.kitPhoto} />
            </View>
          </View>
        )}

        {index === 1 && (
          <View style={styles.jerseysRow}>
            <View style={[styles.sideShirt, styles.leftShirt, { top: 20 }]}>
              <Kit360Thumb team="psg" width={109} height={145} zoom={1.7} style={styles.kitPhoto} />
            </View>
            <View style={[styles.sideShirt, styles.rightShirt, { top: 20 }]}>
              <Kit360Thumb team="fcb" width={109} height={145} zoom={1.7} style={styles.kitPhoto} />
            </View>
          </View>
        )}

        {index === 2 && (
          <View style={styles.boxStage}>
            <View style={styles.deliveryIconWrap}>
              <MaterialCommunityIcons name="package-variant-closed" size={54} color={colors.accent} />
            </View>
            <Kit360Thumb team="es" width={128} height={170} zoom={1.7} style={styles.kitPhoto} />
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        <View style={styles.pillsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.pill,
                i === index ? styles.pillActive : styles.pillInactive,
              ]}
            />
          ))}
        </View>

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.desc}>{current.desc}</Text>

        <Pressable onPress={handleNext} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>
            {index < SLIDES.length - 1 ? 'Keyingi' : 'Boshlash'}
          </Text>
          <MaterialCommunityIcons
            name={index < SLIDES.length - 1 ? 'arrow-right' : 'check'}
            size={20}
            color="#080C24"
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 23, 49, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.1)',
  },
  skipText: {
    color: '#A9B0D0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroShell: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 32,
    backgroundColor: '#0D1538',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  radialGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(25, 167, 161, 0.16)',
    shadowColor: '#19A7A1',
    shadowOpacity: 0.35,
    shadowRadius: 80,
    elevation: 12,
  },
  cornerBadge: {
    position: 'absolute',
    top: 18,
    left: 18,
    zIndex: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 12, 36, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.38)',
  },
  cornerBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  // Forma 360° suratlari (haqiqiy formalar) — 2D chizma o'rniga
  kitPhoto: { borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)' },
  jerseysRow: {
    width: '100%',
    height: 310,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideShirt: {
    position: 'absolute',
    top: 55,
    opacity: 0.9,
  },
  leftShirt: {
    left: 25,
    transform: [{ rotate: '-12deg' }],
  },
  rightShirt: {
    right: 25,
    transform: [{ rotate: '12deg' }],
  },
  centerShirt: {
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
    elevation: 12,
  },
  boxStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  pill: {
    width: 26,
    height: 5,
    borderRadius: 999,
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillInactive: {
    backgroundColor: 'rgba(243, 245, 249, 0.16)',
  },
  title: {
    color: '#F3F5F9',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  desc: {
    color: '#A9B0D0',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  actionBtn: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  actionBtnText: {
    color: '#080C24',
    fontSize: 15,
    fontWeight: '800',
  },
});
