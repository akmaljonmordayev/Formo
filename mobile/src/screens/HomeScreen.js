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
import { colors, radii, spacing } from '../constants/theme';
import { api, mapApiClub } from '../services/api';
import { CLUBS_DATA } from './Auth/Reg3ClubScreen';

export default function HomeScreen({
  auth,
  t,
  onNavigate,
  onOpenClub,
  onOpenStudio,
  onOpenTrack,
}) {
  const [activeOrder, setActiveOrder] = useState(null);
  const [clubs, setClubs] = useState(CLUBS_DATA);
  const [loading, setLoading] = useState(false);

  // Load active order and popular clubs from API
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        if (auth.isAuthenticated) {
          const ord = await api.orders.getActive().catch(() => null);
          if (!cancelled && ord) setActiveOrder(ord);
        }
        const pop = await api.catalog.getPopularClubs(6).catch(() => null);
        if (!cancelled && Array.isArray(pop) && pop.length > 0) {
          setClubs(pop.map(mapApiClub));
        } else if (!cancelled && pop?.items && pop.items.length > 0) {
          setClubs(pop.items.map(mapApiClub));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated]);

  const userName = auth.user?.fullName?.split(' ')[0] || 'Mehmon';
  const initial = userName[0]?.toUpperCase() || 'M';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Salom, {userName}!</Text>
              <Text style={styles.subtitle}>O‘z formangni yarat</Text>
            </View>
          </View>

          <Pressable onPress={() => onNavigate('profile')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="bell-outline" size={22} color="#F3F5F9" />
          </Pressable>
        </View>

        {/* Active Order Banner (if any) */}
        {Boolean(activeOrder) && (
          <Pressable
            onPress={() => onOpenTrack?.(activeOrder.id)}
            style={styles.activeOrderCard}
          >
            <View style={styles.activeOrderTop}>
              <View style={styles.activeOrderBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.activeOrderBadgeText}>FAOL BUYURTMA</Text>
              </View>
              <Text style={styles.orderId}>#{activeOrder.orderNumber || activeOrder.id}</Text>
            </View>

            <Text style={styles.activeOrderStatus}>
              {activeOrder.status === 'SHIPPED'
                ? 'Yetkazishga chiqdi'
                : activeOrder.status === 'ACCEPTED'
                ? 'Qabul qilindi va bosilmoqda'
                : 'Tayyorlanmoqda'}
            </Text>

            {/* Progress bar */}
            <View style={styles.orderProgressBar}>
              <View style={[styles.orderProgressFill, { width: '75%' }]} />
            </View>

            <View style={styles.activeOrderAction}>
              <Text style={styles.trackLinkText}>Buyurtmani kuzatish</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.accent} />
            </View>
          </Pressable>
        )}

        {/* 2 Main Hero Cards */}
        <View style={styles.heroRow}>
          {/* Card 1: Dizayn Studiyasi */}
          <Pressable
            onPress={() => onNavigate('studio')}
            style={[styles.heroCard, styles.studioCard]}
          >
            <View style={styles.heroCardBadge}>
              <MaterialCommunityIcons name="auto-fix" size={14} color="#080C24" />
              <Text style={styles.heroCardBadgeText}>KONSTRUKTOR</Text>
            </View>

            <Text style={styles.heroCardTitle}>Dizayn studiyasi</Text>
            <Text style={styles.heroCardDesc}>
              Noldan o‘z formangizni yarating: rang, ism, raqam va logo
            </Text>

            <View style={styles.heroJerseyWrap}>
              <JerseyVisualizer
                color="#0E1A3F"
                trim="#F2A33A"
                ink="#F3F5F9"
                grad="#19A7A1,#9184D9,#F2A33A"
                gradAngle={160}
                player={userName.toUpperCase()}
                number="10"
                side="back"
                size={140}
              />
            </View>

            <View style={styles.heroCardBtn}>
              <Text style={styles.heroCardBtnText}>Boshlash</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#080C24" />
            </View>
          </Pressable>

          {/* Card 2: Klublar Katalogi */}
          <Pressable
            onPress={() => onNavigate('catalog')}
            style={[styles.heroCard, styles.catalogCard]}
          >
            <View style={[styles.heroCardBadge, { backgroundColor: '#19A7A1' }]}>
              <MaterialCommunityIcons name="tshirt-crew" size={14} color="#080C24" />
              <Text style={styles.heroCardBadgeText}>KATALOG</Text>
            </View>

            <Text style={styles.heroCardTitle}>Klublar katalogi</Text>
            <Text style={styles.heroCardDesc}>
              Real Madrid, Barcelona, Man United va boshqalar
            </Text>

            <View style={styles.clubBadgesWrap}>
              {clubs.slice(0, 4).map((c) => (
                <View key={c.id} style={[styles.miniCrest, { backgroundColor: c.c1 }]}>
                  <Text style={[styles.miniCrestText, { color: c.c2 === '#F3F5F9' ? '#080C24' : c.c2 }]}>
                    {c.ini}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.heroCardBtn, { backgroundColor: '#19A7A1' }]}>
              <Text style={styles.heroCardBtnText}>Katalog</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#080C24" />
            </View>
          </Pressable>
        </View>

        {/* Section: Mashhur klublar */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mashhur klublar</Text>
          <Pressable onPress={() => onNavigate('catalog')} hitSlop={8}>
            <Text style={styles.sectionLink}>Barchasi →</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {clubs.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => onOpenClub?.(c)}
              style={styles.clubScrollCard}
            >
              <View style={styles.clubScrollVisual}>
                <JerseyVisualizer
                  color={c.kits[0].color}
                  trim={c.kits[0].trim}
                  ink={c.kits[0].ink}
                  pattern={c.kits[0].pattern || 'none'}
                  crest={c.ini}
                  side="front"
                  size={105}
                />
              </View>
              <Text style={styles.clubScrollName} numberOfLines={1}>
                {c.name}
              </Text>
              <Text style={styles.clubScrollLeague}>{c.league}</Text>
              <Text style={styles.clubScrollPrice}>189 000 so‘m</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Features banner */}
        <View style={styles.featuresCard}>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="truck-fast-outline" size={24} color={colors.accent} />
            <Text style={styles.featureTitle}>Tez yetkazish</Text>
            <Text style={styles.featureSub}>1–2 kunda bosiladi va yetkaziladi</Text>
          </View>

          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="shield-check-outline" size={24} color={colors.teal} />
            <Text style={styles.featureTitle}>Kafolat</Text>
            <Text style={styles.featureSub}>7 kun ichida bepul almashtirish</Text>
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
    paddingTop: 12,
    paddingBottom: 110,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  subtitle: {
    fontSize: 12,
    color: '#A9B0D0',
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#121A42',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeOrderCard: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginBottom: 20,
  },
  activeOrderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeOrderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(242, 163, 58, 0.14)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.round,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  activeOrderBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  orderId: {
    color: '#8D95BD',
    fontSize: 12,
    fontWeight: '600',
  },
  activeOrderStatus: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F3F5F9',
    marginTop: 10,
    marginBottom: 10,
  },
  orderProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1B2560',
    overflow: 'hidden',
    marginBottom: 12,
  },
  orderProgressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  activeOrderAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  trackLinkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  heroRow: {
    gap: 14,
    marginBottom: 26,
  },
  heroCard: {
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  studioCard: {
    backgroundColor: '#0E1A3F',
    borderColor: 'rgba(242, 163, 58, 0.25)',
  },
  catalogCard: {
    backgroundColor: '#0E1A3F',
    borderColor: 'rgba(25, 167, 161, 0.25)',
  },
  heroCardBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.round,
    marginBottom: 10,
  },
  heroCardBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#080C24',
    letterSpacing: 0.5,
  },
  heroCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F3F5F9',
    marginBottom: 4,
  },
  heroCardDesc: {
    fontSize: 13,
    color: '#A9B0D0',
    lineHeight: 18,
    maxWidth: '65%',
  },
  heroJerseyWrap: {
    position: 'absolute',
    right: -10,
    top: 10,
  },
  clubBadgesWrap: {
    position: 'absolute',
    right: 14,
    top: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 90,
    gap: 6,
  },
  miniCrest: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.2)',
  },
  miniCrestText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroCardBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    marginTop: 20,
  },
  heroCardBtnText: {
    color: '#080C24',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  horizontalScroll: {
    gap: 12,
    paddingBottom: 20,
  },
  clubScrollCard: {
    width: 130,
    backgroundColor: '#0E1A3F',
    borderRadius: radii.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.1)',
  },
  clubScrollVisual: {
    height: 100,
    justifyContent: 'center',
    marginBottom: 6,
  },
  clubScrollName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F5F9',
    textAlign: 'center',
  },
  clubScrollLeague: {
    fontSize: 10,
    color: '#8D95BD',
    marginTop: 2,
  },
  clubScrollPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
    marginTop: 6,
  },
  featuresCard: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.1)',
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  featureItem: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F5F9',
    marginTop: 6,
  },
  featureSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
    lineHeight: 15,
  },
});
