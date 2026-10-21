import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JerseyVisualizer from '../components/ui/JerseyVisualizer';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';

export default function KitCustomScreen({
  club,
  kit,
  store,
  auth,
  t,
  onBack,
  onOpenCart,
}) {
  const toast = useToast();
  const defaultPlayer = auth?.user?.fullName?.split(' ')[0]?.toUpperCase() || 'AZIZ';

  const [side, setSide] = useState('back');
  const [player, setPlayer] = useState(defaultPlayer);
  const [number, setNumber] = useState('10');
  const [includeShorts, setIncludeShorts] = useState(true);
  const [shirtSize, setShirtSize] = useState('L');
  const [shortsSize, setShortsSize] = useState('L');

  if (!club || !kit) return null;

  const basePrice = 189000;
  const totalPrice = includeShorts ? basePrice + 60000 : basePrice;

  const handleAddToCart = () => {
    const item = {
      id: Date.now(),
      title: `${club.name} · ${kit.name}`,
      sub: `${player || 'FORMO'} · ${number || '—'} · ${shirtSize}${includeShorts ? ` / ${shortsSize}` : ''}`,
      unit: totalPrice,
      qty: 1,
      sh: {
        color: kit.color,
        trim: kit.trim,
        ink: kit.ink,
        pattern: kit.pattern || 'none',
        crest: club.ini,
        player: player.toUpperCase(),
        number,
        side: 'back',
      },
      hasSo: includeShorts,
      so: {
        color: kit.color,
        trim: kit.trim,
        ink: kit.ink,
        number,
      },
    };

    store.addToCart(item);
    toast.show('Savatga qo‘shildi', 'success');
    onOpenCart?.();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>Formani moslashtirish</Text>
              <Text style={styles.sub}>{club.name} · {kit.name}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Visualizer Stage */}
          <View style={styles.stage}>
            <View style={styles.sideToggle}>
              <Pressable
                onPress={() => setSide('front')}
                style={[styles.sideBtn, side === 'front' && styles.sideBtnActive]}
              >
                <Text style={[styles.sideBtnText, side === 'front' && styles.sideBtnTextActive]}>
                  Old
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSide('back')}
                style={[styles.sideBtn, side === 'back' && styles.sideBtnActive]}
              >
                <Text style={[styles.sideBtnText, side === 'back' && styles.sideBtnTextActive]}>
                  Orqa
                </Text>
              </Pressable>
            </View>

            <View style={styles.visualWrap}>
              <JerseyVisualizer
                color={kit.color}
                trim={kit.trim}
                ink={kit.ink}
                pattern={kit.pattern || 'none'}
                crest={club.ini}
                player={player}
                number={number}
                side={side}
                size={200}
                showShorts={includeShorts}
                shorts={{
                  color: kit.color,
                  trim: kit.trim,
                  ink: kit.ink,
                  number,
                }}
              />
            </View>
          </View>

          {/* Inputs Card */}
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Formadagi ism (orqa tomonda)</Text>
            <TextInput
              value={player}
              onChangeText={(t) =>
                setPlayer(t.replace(/[^A-Za-z' ]/g, '').toUpperCase().slice(0, 10))
              }
              placeholder="AZIZ"
              placeholderTextColor={colors.caption}
              autoCapitalize="characters"
              maxLength={10}
              style={styles.input}
            />

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Raqam (1–99)</Text>
            <TextInput
              value={number}
              onChangeText={(t) => setNumber(t.replace(/\D/g, '').slice(0, 2))}
              placeholder="10"
              placeholderTextColor={colors.caption}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.input}
            />

            {/* Quick numbers */}
            <View style={styles.quickRow}>
              {['7', '9', '10', '11', '23'].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setNumber(n)}
                  style={[styles.quickChip, number === n && styles.quickChipActive]}
                >
                  <Text style={[styles.quickText, number === n && styles.quickTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Shorts switch */}
            <Pressable
              onPress={() => setIncludeShorts(!includeShorts)}
              style={styles.switchRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Shortik qo‘shish</Text>
                <Text style={styles.switchSub}>Raqam bilan birga to‘plam (+60 000 so‘m)</Text>
              </View>
              <View style={[styles.switchTrack, includeShorts && styles.switchTrackActive]}>
                <View style={[styles.switchThumb, includeShorts && styles.switchThumbActive]} />
              </View>
            </Pressable>

            {/* Shirt size */}
            <Text style={styles.inputLabel}>Futbolka o‘lchami</Text>
            <View style={styles.sizesRow}>
              {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => {
                const active = shirtSize === sz;
                return (
                  <Pressable
                    key={sz}
                    onPress={() => setShirtSize(sz)}
                    style={[styles.sizeChip, active && styles.sizeChipActive]}
                  >
                    <Text style={[styles.sizeText, active && styles.sizeTextActive]}>{sz}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Shorts size if enabled */}
            {includeShorts && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Shortik o‘lchami</Text>
                <View style={styles.sizesRow}>
                  {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => {
                    const active = shortsSize === sz;
                    return (
                      <Pressable
                        key={sz}
                        onPress={() => setShortsSize(sz)}
                        style={[styles.sizeChip, active && styles.sizeChipActive]}
                      >
                        <Text style={[styles.sizeText, active && styles.sizeTextActive]}>{sz}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Price and Add button */}
            <View style={styles.bottomRow}>
              <View>
                <Text style={styles.priceLabel}>Jami narx</Text>
                <Text style={styles.priceVal}>{totalPrice.toLocaleString('uz-UZ')} so‘m</Text>
              </View>

              <Pressable onPress={handleAddToCart} style={styles.addBtn}>
                <MaterialCommunityIcons name="shopping-bag" size={20} color="#080C24" />
                <Text style={styles.addBtnText}>Savatga qo‘shish</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#0E1A3F',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  sub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  stage: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    position: 'relative',
    marginBottom: 16,
  },
  sideToggle: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    backgroundColor: '#121A42',
    borderRadius: radii.round,
    padding: 2,
    zIndex: 10,
  },
  sideBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.round,
  },
  sideBtnActive: {
    backgroundColor: colors.accent,
  },
  sideBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  sideBtnTextActive: {
    color: '#080C24',
  },
  visualWrap: {
    marginVertical: 6,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A9B0D0',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#121A42',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.14)',
    color: '#F3F5F9',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: '#121A42',
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  quickText: {
    color: '#A9B0D0',
    fontSize: 13,
    fontWeight: '700',
  },
  quickTextActive: {
    color: colors.accent,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.1)',
    marginBottom: 16,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  switchSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1B2560',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: colors.teal,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F5F9',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  sizesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.sm,
    backgroundColor: '#121A42',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sizeChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
  },
  sizeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A9B0D0',
  },
  sizeTextActive: {
    color: colors.accent,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(243, 245, 249, 0.1)',
  },
  priceLabel: {
    fontSize: 11,
    color: '#8D95BD',
  },
  priceVal: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080C24',
  },
});
