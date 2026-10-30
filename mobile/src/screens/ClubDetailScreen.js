import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import JerseyVisualizer from '../components/ui/JerseyVisualizer';
import { useToast } from '../components/ui/Toast';
import { colors, radii, spacing } from '../constants/theme';
import { api, mapApiClub } from '../services/api';

export default function ClubDetailScreen({
  club,
  store,
  t,
  onBack,
  onCustomize,
  onOpenAr,
  onOpenCart,
}) {
  const toast = useToast();
  const [selectedKitIndex, setSelectedKitIndex] = useState(0);
  const [side, setSide] = useState('front');
  const [selectedSize, setSelectedSize] = useState('L');
  const [includeShorts, setIncludeShorts] = useState(true);

  if (!club) return null;

  const kit = club.kits[selectedKitIndex] || club.kits[0];
  const isFav = store.favorites.includes(club.id);

  const basePrice = 189000;
  const totalPrice = includeShorts ? basePrice + 60000 : basePrice;

  const handleToggleFav = async () => {
    store.toggleFavorite(club.id);
    try {
      if (isFav) {
        await api.catalog.removeFavorite(club.id).catch(() => null);
        toast.show('Sevimlilardan olib tashlandi', 'info');
      } else {
        await api.catalog.addFavorite(club.id).catch(() => null);
        toast.show('Sevimlilarga qo‘shildi', 'success');
      }
    } catch {
      // ignore
    }
  };

  const handleAddToCart = () => {
    const item = {
      id: Date.now(),
      title: `${club.name} · ${kit.name}`,
      sub: `${includeShorts ? 'To‘plam' : 'Futbolka'} · ${selectedSize}`,
      unit: totalPrice,
      qty: 1,
      sh: {
        color: kit.color,
        trim: kit.trim,
        ink: kit.ink,
        pattern: kit.pattern || 'none',
        crest: club.ini,
        side: 'back',
      },
      hasSo: includeShorts,
      so: {
        color: kit.color,
        trim: kit.trim,
        ink: kit.ink,
      },
    };

    store.addToCart(item);
    toast.show('Savatga qo‘shildi', 'success');
    onOpenCart?.();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.clubTitle}>{club.name}</Text>
            <Text style={styles.clubSub}>{club.league}</Text>
          </View>
          <Pressable onPress={handleToggleFav} hitSlop={10} style={styles.iconBtn}>
            <MaterialCommunityIcons
              name={isFav ? 'star' : 'star-outline'}
              size={24}
              color={isFav ? colors.accent : colors.muted}
            />
          </Pressable>
        </View>

        {/* Kits selection tabs */}
        <View style={styles.kitTabsRow}>
          {club.kits.map((k, i) => {
            const active = selectedKitIndex === i;
            return (
              <Pressable
                key={k.id || i}
                onPress={() => setSelectedKitIndex(i)}
                style={[styles.kitTab, active && styles.kitTabActive]}
              >
                <Text style={[styles.kitTabText, active && styles.kitTabTextActive]}>
                  {k.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Visualizer Stage */}
        <View style={styles.stage}>
          {/* Front / Back switch */}
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

          {/* AR button */}
          <Pressable onPress={onOpenAr} style={styles.arBadge}>
            <MaterialCommunityIcons name="augmented-reality" size={18} color={colors.accent} />
            <Text style={styles.arBadgeText}>AR ko‘rish</Text>
          </Pressable>

          <View style={styles.visualWrap}>
            <JerseyVisualizer
              color={kit.color}
              trim={kit.trim}
              ink={kit.ink}
              pattern={kit.pattern || 'none'}
              crest={club.ini}
              player="FORMO"
              number="10"
              side={side}
              size={210}
              showShorts={includeShorts}
              shorts={{
                color: kit.color,
                trim: kit.trim,
                ink: kit.ink,
                number: '10',
              }}
            />
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          {/* Shorts Switch */}
          <Pressable
            onPress={() => setIncludeShorts(!includeShorts)}
            style={styles.switchRow}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Shortik bilan to‘plam</Text>
              <Text style={styles.switchSub}>Futbolka + shortik (+60 000 so‘m)</Text>
            </View>
            <View style={[styles.switchTrack, includeShorts && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, includeShorts && styles.switchThumbActive]} />
            </View>
          </Pressable>

          {/* Size picker */}
          <Text style={styles.sectionLabel}>O‘lcham</Text>
          <View style={styles.sizesRow}>
            {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => {
              const active = selectedSize === sz;
              return (
                <Pressable
                  key={sz}
                  onPress={() => setSelectedSize(sz)}
                  style={[styles.sizeChip, active && styles.sizeChipActive]}
                >
                  <Text style={[styles.sizeText, active && styles.sizeTextActive]}>{sz}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Jami narx</Text>
              <Text style={styles.priceVal}>
                {totalPrice.toLocaleString('uz-UZ')} so‘m
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => onCustomize?.(club, kit)}
              style={styles.customBtn}
            >
              <MaterialCommunityIcons name="pencil" size={18} color="#F3F5F9" />
              <Text style={styles.customBtnText}>Moslashtirish</Text>
            </Pressable>

            <Pressable onPress={handleAddToCart} style={styles.cartBtn}>
              <MaterialCommunityIcons name="shopping-bag" size={18} color="#080C24" />
              <Text style={styles.cartBtnText}>Savatga</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
  clubTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  clubSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  kitTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.md,
    padding: 3,
    marginBottom: 16,
  },
  kitTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  kitTabActive: {
    backgroundColor: '#1B2560',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  kitTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A9B0D0',
  },
  kitTabTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  stage: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    paddingVertical: 20,
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
  arBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(242, 163, 58, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.accent,
    zIndex: 10,
  },
  arBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  visualWrap: {
    marginVertical: 10,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 245, 249, 0.1)',
    marginBottom: 16,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  switchSub: {
    fontSize: 12,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A9B0D0',
    marginBottom: 8,
  },
  sizesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  sizeChip: {
    flex: 1,
    paddingVertical: 10,
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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 12,
    color: '#8D95BD',
  },
  priceVal: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.accent,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1B2560',
    borderRadius: radii.md,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.15)',
  },
  customBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  cartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 13,
  },
  cartBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080C24',
  },
});
