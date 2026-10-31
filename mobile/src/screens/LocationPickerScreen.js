import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoider, KeyboardAwareScrollView } from '../components/ui/KeyboardAware';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BackButton, ErrorNote, OutlineButton, authColors as c } from '../components/ui/AuthUi';
import { useToast } from '../components/ui/Toast';
import { fonts } from '../constants/theme';
import {
  ADDRESS_LIMITS,
  CITY_DELTA,
  DEFAULT_CENTER,
  STREET_DELTA,
  addressCoords,
  saveAddress,
  searchPlace,
  useDeviceLocation,
  useReverseGeocode,
  validateAddressForm,
} from '../features/location';
import { errorText } from '../utils/errors';
import { DARK_MAP_STYLE } from '../constants/mapStyle';

const LABEL_KEYS = ['addrLabelHome', 'addrLabelWork'];
const GEOCODE_DELAY_MS = 600;

/**
 * LocationPickerScreen — yetkazish manzilini xaritada tanlash.
 * Markazdagi pin — tanlangan nuqta: xaritani surish yoki bosish uni siljitadi,
 * "Mening joylashuvim" GPS'dan oladi, qidiruv qurilma geokoderidan foydalanadi.
 * Saqlash: POST /addresses (yangi) yoki PATCH /addresses/:id (tahrir) —
 * label, address, apartment, latitude, longitude, isDefault.
 *
 * Props: t, address (tahrirlanadigan manzil | null), onCancel, onSaved(savedAddress)
 */
export default function LocationPickerScreen({ t, address, onCancel, onSaved }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const mapRef = useRef(null);
  const geocodeTimer = useRef(null);
  const isEdit = Boolean(address?.id);

  const startCoords = addressCoords(address);
  const initialRegion = useMemo(
    () => ({ ...(startCoords || DEFAULT_CENTER), ...(startCoords ? STREET_DELTA : CITY_DELTA) }),
    // Faqat birinchi chizishda — keyin xarita o'zi boshqaradi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [coords, setCoords] = useState(startCoords);
  const [moving, setMoving] = useState(false);
  const [label, setLabel] = useState(address?.label || t('addrLabelHome'));
  const [text, setText] = useState(address?.address || '');
  // Foydalanuvchi manzil matnini o'zi tahrir qilgan bo'lsa, geokoder uni almashtirmaydi
  const [textEdited, setTextEdited] = useState(Boolean(address?.address));
  const [apartment, setApartment] = useState(address?.apartment || '');
  const [isDefault, setIsDefault] = useState(Boolean(address?.isDefault));
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMiss, setSearchMiss] = useState(false);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const device = useDeviceLocation();
  const geocoder = useReverseGeocode();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!saving) onCancel?.();
      return true;
    });
    return () => sub.remove();
  }, [onCancel, saving]);

  useEffect(() => () => clearTimeout(geocodeTimer.current), []);

  /** Yangi nuqta: pinni joylaydi va (kerak bo'lsa) manzil matnini kechiktirib aniqlaydi. */
  const setPoint = useCallback((next) => {
    setCoords(next);
    setErrors((e) => ({ ...e, coords: undefined }));
    clearTimeout(geocodeTimer.current);
    if (textEdited) return;
    geocodeTimer.current = setTimeout(async () => {
      const found = await geocoder.resolve(next);
      if (found) setText(found);
    }, GEOCODE_DELAY_MS);
  }, [geocoder, textEdited]);

  const flyTo = (next) => {
    mapRef.current?.animateToRegion({ ...next, ...STREET_DELTA }, 450);
    setPoint(next);
  };

  const useMyLocation = async () => {
    const here = await device.locate();
    if (here) flyTo(here);
  };

  const runSearch = async () => {
    if (query.trim().length < 3) return;
    setSearching(true);
    setSearchMiss(false);
    try {
      const hit = await searchPlace(query);
      if (hit) flyTo(hit);
      else setSearchMiss(true);
    } catch {
      setSearchMiss(true);
    } finally {
      setSearching(false);
    }
  };

  const confirm = async () => {
    if (saving) return;
    const form = { label, address: text, apartment, coords, isDefault };
    const found = validateAddressForm(form);
    if (!coords) found.coords = 'locationPickPoint';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveAddress(form, address?.id);
      toast.show(t('addressSaved'), 'success');
      onSaved?.(saved);
    } catch (err) {
      setSaveError(errorText(err, t));
    } finally {
      setSaving(false);
    }
  };

  const deviceError = device.error && (
    <View style={styles.notice}>
      <MaterialCommunityIcons name="crosshairs-off" size={18} color={c.accent} />
      <Text style={styles.noticeText}>{t(device.error)}</Text>
      {device.permission === 'blocked' && (
        <Pressable onPress={device.openSettings} hitSlop={8}>
          <Text style={styles.noticeAction}>{t('openSettings')}</Text>
        </Pressable>
      )}
    </View>
  );

  const pinLifted = moving;
  const statusLine = geocoder.resolving
    ? t('locationResolving')
    : coords
      ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
      : t('locationPickPoint');

  return (
    <KeyboardAvoider style={styles.root}>
      {/* Xarita yuqori qismni egallaydi; pin aynan xarita markazida (region markazi) */}
      <View style={styles.mapArea}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={DARK_MAP_STYLE}
        userInterfaceStyle="dark"
        showsUserLocation={device.permission === 'granted'}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onPanDrag={() => !moving && setMoving(true)}
        onPress={(e) => flyTo(e.nativeEvent.coordinate)}
        onRegionChangeComplete={(region, details) => {
          setMoving(false);
          // Animatsiyalar (flyTo) nuqtani allaqachon o'rnatgan; faqat qo'l harakati
          if (details?.isGesture === false) return;
          if (details?.isGesture || moving) setPoint({ latitude: region.latitude, longitude: region.longitude });
        }}
      />

      {/* Markazdagi pin: teginishlarni olmaydi (xaritaga o'tadi); uchi markazda */}
      <View pointerEvents="none" style={styles.pinWrap}>
        <View style={[styles.pin, pinLifted && styles.pinLifted]}>
          <MaterialCommunityIcons name="map-marker" size={44} color={c.accent} />
        </View>
        <View style={styles.pinShadow} />
      </View>

      {/* Yuqori panel: orqaga + qidiruv */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={onCancel} label={t('back')} />
        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={20} color={c.muted} />
          <TextInput
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setSearchMiss(false);
            }}
            onSubmitEditing={runSearch}
            placeholder={t('locationSearch')}
            placeholderTextColor={c.placeholder}
            returnKeyType="search"
            autoCorrect={false}
            selectionColor={c.accent}
            style={styles.searchInput}
          />
          {searching && <ActivityIndicator size="small" color={c.accent} />}
        </View>
      </View>
      {searchMiss && (
        <View style={[styles.searchMiss, { top: insets.top + 64 }]}>
          <Text style={styles.searchMissText}>{t('locationNotFound')}</Text>
        </View>
      )}

      <Pressable
        onPress={useMyLocation}
        disabled={device.locating}
        accessibilityRole="button"
        accessibilityLabel={t('locationUseMine')}
        style={({ pressed }) => [styles.gps, pressed && styles.pressed]}
      >
        {device.locating ? (
          <ActivityIndicator size="small" color={c.accent} />
        ) : (
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={c.accent} />
        )}
      </Pressable>
      </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
            <Text style={styles.sheetTitle}>{isEdit ? t('addressEdit') : t('addressPick')}</Text>

            {/* Tanlangan nuqta xulosasi */}
            <View style={[styles.summary, errors.coords && styles.summaryError]}>
              <View style={styles.summaryIcon}>
                <MaterialCommunityIcons name="map-marker" size={20} color={coords ? c.accent : c.muted} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.summaryTitle} numberOfLines={2}>{text.trim() || t('locationNoAddress')}</Text>
                <Text style={styles.summarySub}>{statusLine}</Text>
              </View>
              {geocoder.resolving && <ActivityIndicator size="small" color={c.accent} />}
            </View>
            {deviceError}
            {geocoder.failed && !textEdited && <Text style={styles.hint}>{t('locationGeocodeFailed')}</Text>}

            <Text style={styles.label}>{t('addrLabel')}</Text>
            <View style={styles.chips}>
              {LABEL_KEYS.map((key) => {
                const value = t(key);
                const on = label === value;
                return (
                  <Pressable key={key} onPress={() => setLabel(value)} style={[styles.chip, on && styles.chipOn]}>
                    <MaterialCommunityIcons
                      name={key === 'addrLabelHome' ? 'home-outline' : 'briefcase-outline'}
                      size={16}
                      color={on ? c.accent : c.muted}
                    />
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{value}</Text>
                  </Pressable>
                );
              })}
              <TextInput
                value={LABEL_KEYS.some((k) => t(k) === label) ? '' : label}
                onChangeText={setLabel}
                placeholder={t('addrLabelOther')}
                placeholderTextColor={c.placeholder}
                maxLength={ADDRESS_LIMITS.label}
                selectionColor={c.accent}
                style={[styles.chip, styles.chipInput, errors.label && styles.inputError]}
              />
            </View>

            <Text style={styles.label}>{t('address')}</Text>
            <TextInput
              value={text}
              onChangeText={(v) => {
                setText(v);
                setTextEdited(true);
                setErrors((e) => ({ ...e, address: undefined }));
              }}
              placeholder={t('addrPlaceholder')}
              placeholderTextColor={c.placeholder}
              maxLength={ADDRESS_LIMITS.address}
              multiline
              selectionColor={c.accent}
              style={[styles.input, styles.inputMulti, errors.address && styles.inputError]}
            />
            {errors.address && <Text style={styles.fieldError}>{t(errors.address)}</Text>}

            <Text style={styles.label}>{t('addrApartment')}</Text>
            <TextInput
              value={apartment}
              onChangeText={setApartment}
              placeholder={t('addrApartmentPlaceholder')}
              placeholderTextColor={c.placeholder}
              maxLength={ADDRESS_LIMITS.apartment}
              selectionColor={c.accent}
              style={styles.input}
            />

            <View style={styles.defaultRow}>
              <Text style={styles.defaultText}>{t('addrMakeDefault')}</Text>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: c.track, true: 'rgba(242,163,58,0.45)' }}
                thumbColor={isDefault ? c.accent : '#8D95BD'}
              />
            </View>

            {errors.coords && <Text style={styles.fieldError}>{t(errors.coords)}</Text>}
            {Boolean(saveError) && <ErrorNote>{saveError}</ErrorNote>}
          </KeyboardAwareScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onCancel} disabled={saving} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </Pressable>
            <OutlineButton label={t('addressConfirm')} onPress={confirm} loading={saving} style={styles.flex} />
          </View>
        </View>
    </KeyboardAvoider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  mapArea: { flex: 1, minHeight: 220 },
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  // 44px belgi: uchi konteyner markaziga tushishi uchun yuqoriga suriladi
  pin: { marginBottom: 40 },
  pinLifted: { transform: [{ translateY: -10 }] },
  pinShadow: {
    position: 'absolute',
    width: 14,
    height: 6,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
    marginTop: 6,
  },
  top: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: c.field,
    borderWidth: 1,
    borderColor: c.line,
  },
  searchInput: { flex: 1, height: '100%', paddingVertical: 0, color: c.text, fontFamily: fonts.body, fontSize: 15 },
  searchMiss: {
    position: 'absolute',
    left: 70,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: c.field,
  },
  searchMissText: { color: c.soft, fontFamily: fonts.body, fontSize: 13 },
  gps: {
    position: 'absolute',
    right: 16,
    bottom: 40, // sheet xaritaning pastki 24px'ini yopadi
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: c.field,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dizayn sheet.addr: radius 28 28 0 0, fon #121A42, padding 10 20
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: c.field,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  sheetScroll: { maxHeight: 320 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#2A3572', marginBottom: 12 },
  sheetTitle: { color: c.text, fontFamily: fonts.display, fontSize: 20, lineHeight: 26, marginBottom: 12 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#0B1030',
    borderWidth: 1.5,
    borderColor: c.accent,
  },
  summaryError: { borderColor: c.danger },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: { color: c.text, fontFamily: fonts.bodySemi, fontSize: 15 },
  summarySub: { color: c.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(242,163,58,0.1)',
  },
  noticeText: { flex: 1, color: '#F7C27A', fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  noticeAction: { color: c.accent, fontFamily: fonts.bodySemi, fontSize: 13 },
  hint: { color: c.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 8 },
  label: { color: c.muted, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 16, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#0B1030',
    borderWidth: 1,
    borderColor: c.line,
  },
  chipOn: { borderColor: c.accent, backgroundColor: c.track },
  chipText: { color: c.muted, fontFamily: fonts.bodySemi, fontSize: 14 },
  chipTextOn: { color: c.accent },
  chipInput: { flex: 1, minWidth: 110, paddingVertical: 0, color: c.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  input: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#0B1030',
    borderWidth: 1,
    borderColor: c.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: c.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  inputMulti: { minHeight: 64, textAlignVertical: 'top' },
  inputError: { borderColor: c.danger },
  fieldError: { color: c.dangerText, fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
  defaultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  defaultText: { color: c.soft, fontFamily: fonts.bodyMedium, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 12 },
  cancel: {
    width: 110,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: c.text, fontFamily: fonts.bodyMedium, fontSize: 16 },
});
