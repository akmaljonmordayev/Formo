import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BackButton } from '../ui/AuthUi';
import { Button } from '../ui/Common';
import MapView from './PlatformMap';
import { DARK_MAP_STYLE } from '../../constants/mapStyle';
import { colors, fonts, isLightTheme, radii, spacing, themedStyles } from '../../constants/theme';
import { STREET_DELTA, searchAddress, useDeviceLocation } from '../../features/location';

/**
 * Manzil qo'shishning xarita bosqichi: xarita tanlangan tumanda ochiladi, markazdagi pin — tanlangan nuqta.
 * Qidiruv ("Madadkor mahallasi") natijalar ro'yxatini beradi — tanlangani pinni o'sha joyga olib boradi;
 * "Mening joylashuvim" GPS'dan oladi; xaritani surish yoki bosish pinni siljitadi.
 *
 * Props: t, areaLabel ("Toshkent shahri · Sergeli tumani"), searchContext ("Sergeli tumani, Toshkent shahri"),
 *        regionName ("Toshkent shahri"), bounds (viloyat hududi — qidiruv natijalari shu bilan cheklanadi),
 *        area (tuman hududi — aniqlangach yangilanadi), coords, geo ({ text, resolving }), problem (i18n kaliti | null),
 *        onPoint(coords), onBack(), onChangeArea(), onConfirm()
 */
export default function MapStep({ t, areaLabel, searchContext, regionName, bounds, area, coords, geo, problem, onPoint, onBack, onChangeArea, onConfirm }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  // Foydalanuvchi nuqtani o'zi belgilaganidan keyin tuman hududi aniqlansa — xarita qayta surilmaydi
  const touched = useRef(Boolean(coords));
  const [moving, setMoving] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null); // null — qidirilmagan, [] — topilmadi
  const device = useDeviceLocation();
  const light = isLightTheme();

  const initialRegion = useMemo(
    () => (coords ? { ...coords, ...STREET_DELTA } : area),
    // Faqat birinchi chizishda — keyin xarita o'zi boshqaradi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Tuman chegarasi tarmoqdan kelganda (yoki tuman almashganda) — xarita o'sha hududga
  const firstArea = useRef(true);
  useEffect(() => {
    if (firstArea.current) {
      firstArea.current = false;
      return;
    }
    if (!touched.current) mapRef.current?.animateToRegion(area, 500);
  }, [area]);

  const setPoint = (next) => {
    touched.current = true;
    onPoint(next);
  };

  const flyTo = (next) => {
    mapRef.current?.animateToRegion({ ...next, ...STREET_DELTA }, 450);
    setPoint(next);
  };

  const useMyLocation = async () => {
    const here = await device.locate();
    if (here) flyTo(here);
  };

  const runSearch = async () => {
    if (query.trim().length < 3 || searching) return;
    setSearching(true);
    try {
      setResults(await searchAddress(query, { context: searchContext, area, region: regionName, bounds }));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (hit) => {
    Keyboard.dismiss();
    setResults(null);
    setQuery(hit.title);
    flyTo({ latitude: hit.latitude, longitude: hit.longitude });
  };

  const status = !coords
    ? t('locationPickPoint')
    : geo.resolving
      ? t('locationResolving')
      : geo.text || `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        dark={!light}
        customMapStyle={light ? undefined : DARK_MAP_STYLE}
        userInterfaceStyle={light ? 'light' : 'dark'}
        showsUserLocation={device.permission === 'granted'}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onPanDrag={() => !moving && setMoving(true)}
        onPress={(e) => {
          setResults(null);
          flyTo(e.nativeEvent.coordinate);
        }}
        onRegionChangeComplete={(region, details) => {
          setMoving(false);
          // Animatsiyalar (flyTo) nuqtani allaqachon o'rnatgan; faqat qo'l harakati
          if (details?.isGesture === false) return;
          if (details?.isGesture || moving) setPoint({ latitude: region.latitude, longitude: region.longitude });
        }}
      />

      {/* Markazdagi pin: teginishlarni olmaydi (xaritaga o'tadi); uchi markazda */}
      <View pointerEvents="none" style={styles.pinWrap}>
        <View style={[styles.pin, moving && styles.pinLifted]}>
          <MaterialCommunityIcons name="map-marker" size={48} color={colors.danger} />
        </View>
        <View style={styles.pinShadow} />
      </View>

      {/* Yuqori panel: orqaga + qidiruv, ostida tanlangan hudud */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.topRow}>
          <BackButton onPress={onBack} label={t('back')} />
          <View style={styles.search}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={(v) => {
                setQuery(v);
                setResults(null);
              }}
              onSubmitEditing={runSearch}
              placeholder={t('locationSearch')}
              placeholderTextColor={colors.dim}
              returnKeyType="search"
              autoCorrect={false}
              selectionColor={colors.accent}
              style={styles.searchInput}
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : query.trim().length >= 3 ? (
              <Pressable onPress={runSearch} hitSlop={8} style={styles.searchGo} accessibilityRole="button" accessibilityLabel={t('locationSearch')}>
                <MaterialCommunityIcons name="arrow-right" size={18} color={colors.primaryDark} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {results ? (
          <View style={styles.results}>
            {results.length ? (
              results.map((hit, i) => (
                <Pressable
                  key={hit.id}
                  onPress={() => pickResult(hit)}
                  style={({ pressed }) => [styles.result, i > 0 && styles.resultLine, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.accent} />
                  <View style={styles.flex}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{hit.title}</Text>
                    {hit.subtitle ? <Text style={styles.resultSub} numberOfLines={1}>{hit.subtitle}</Text> : null}
                  </View>
                </Pressable>
              ))
            ) : (
              <Text style={styles.resultEmpty}>{t('locationNotFound')}</Text>
            )}
          </View>
        ) : (
          <Pressable onPress={onChangeArea} style={({ pressed }) => [styles.areaChip, pressed && styles.pressed]} accessibilityRole="button">
            <MaterialCommunityIcons name="map-outline" size={15} color={colors.accent} />
            <Text style={styles.areaText} numberOfLines={1}>{areaLabel}</Text>
            <Text style={styles.areaChange}>{t('addrChangeArea')}</Text>
          </Pressable>
        )}
      </View>

      {/* Pastki karta: aniqlangan manzil + tasdiqlash */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} pointerEvents="box-none">
        <Pressable
          onPress={useMyLocation}
          disabled={device.locating}
          accessibilityRole="button"
          accessibilityLabel={t('locationUseMine')}
          style={({ pressed }) => [styles.gps, pressed && styles.pressed]}
        >
          {device.locating ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.accent} />
          )}
          <Text style={styles.gpsText}>{t('locationUseMine')}</Text>
        </Pressable>

        <View style={styles.card}>
          {device.error ? (
            <View style={styles.notice}>
              <MaterialCommunityIcons name="crosshairs-off" size={16} color={colors.accent} />
              <Text style={styles.noticeText}>{t(device.error)}</Text>
              {device.permission === 'blocked' ? (
                <Pressable onPress={device.openSettings} hitSlop={8}>
                  <Text style={styles.noticeAction}>{t('openSettings')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <View style={styles.statusRow}>
            <View style={[styles.statusIcon, coords && !problem && styles.statusIconOn]}>
              <MaterialCommunityIcons name="map-marker" size={20} color={coords && !problem ? colors.primaryDark : colors.muted} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.statusTitle} numberOfLines={2}>{status}</Text>
              <Text style={[styles.statusSub, coords && problem && styles.statusProblem]} numberOfLines={2}>
                {coords && problem ? t(problem) : t('locationPinHint')}
              </Text>
            </View>
            {geo.resolving ? <ActivityIndicator size="small" color={colors.accent} /> : null}
          </View>
          <Button size="large" disabled={!coords || Boolean(problem)} onPress={onConfirm} style={styles.confirm}>
            {t('locationConfirmPoint')}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  // 48px belgi: uchi konteyner markaziga tushishi uchun yuqoriga suriladi
  pin: { marginBottom: 44 },
  pinLifted: { transform: [{ translateY: -10 }] },
  pinShadow: { position: 'absolute', width: 14, height: 6, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.4)', marginTop: 6 },
  top: { position: 'absolute', left: 0, right: 0, paddingHorizontal: spacing.lg, gap: spacing.sm },
  topRow: { flexDirection: 'row', gap: 10 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, height: '100%', paddingVertical: 0, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  searchGo: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  results: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  resultLine: { borderTopWidth: 1, borderTopColor: colors.border },
  resultTitle: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 14 },
  resultSub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  resultEmpty: { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 13, padding: 14 },
  areaChip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  areaText: { flexShrink: 1, color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 },
  areaChange: { color: colors.accent, fontFamily: fonts.bodySemi, fontSize: 12 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, gap: spacing.sm },
  gps: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsText: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 },
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radii.md, backgroundColor: colors.accentGlow },
  noticeText: { flex: 1, color: colors.textSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  noticeAction: { color: colors.accent, fontFamily: fonts.bodySemi, fontSize: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  statusIconOn: { backgroundColor: colors.accent },
  statusTitle: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20 },
  statusSub: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  statusProblem: { color: colors.danger, fontFamily: fonts.bodyMedium },
  confirm: { alignSelf: 'stretch' },
}));
