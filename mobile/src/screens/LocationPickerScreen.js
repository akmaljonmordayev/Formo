import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AreaStep from '../components/location/AreaStep';
import DetailsStep from '../components/location/DetailsStep';
import MapStep from '../components/location/MapStep';
import { BackButton } from '../components/ui/AuthUi';
import { KeyboardAvoider } from '../components/ui/KeyboardAware';
import { useToast } from '../components/ui/Toast';
import { colors, fonts, spacing, themedStyles } from '../constants/theme';
import {
  REGION_CODES,
  addressCoords,
  areaOf,
  districtsOf,
  isDistrictOf,
  lookupArea,
  pointProblem,
  saveAddress,
  useReverseGeocode,
  validateAddressForm,
} from '../features/location';
import { errorText } from '../utils/errors';

const GEOCODE_DELAY_MS = 600;
const STEPS = ['region', 'district', 'map', 'details'];

/**
 * LocationPickerScreen — yetkazish manzilini qo'shish/tahrirlash, 4 bosqichda:
 *   1) viloyat (Toshkent shahri alohida) → 2) tuman yoki shahar → 3) xarita: tanlangan tumanda ochiladi,
 *   qidiruv ("Madadkor mahallasi") yoki GPS bilan uy nuqtasi belgilanadi → 4) aniq manzil: mahalla/ko'cha,
 *   uy raqami (majburiy), xonadon.
 * Saqlash: POST /addresses (yangi) yoki PATCH /addresses/:id (tahrir) — label, address, house, apartment,
 * region, district, latitude, longitude, isDefault. Admin panel buyurtmada to'liq manzil va xarita nuqtasini ko'radi.
 *
 * Props: t, address (tahrirlanadigan manzil | null), onCancel, onSaved(savedAddress),
 *        onBackIntercept — AppNavigator'ning markaziy hardware-back ref'ini o'rnatish funksiyasi
 */
export default function LocationPickerScreen({ t, address, onCancel, onSaved, onBackIntercept }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const geocodeTimer = useRef(null);
  const geocoder = useReverseGeocode();

  const [form, setForm] = useState(() => {
    const region = REGION_CODES.includes(address?.region) ? address.region : null;
    return {
      region,
      district: region && isDistrictOf(region, address?.district) ? address.district : null,
      coords: addressCoords(address),
      address: address?.address || '',
      // Foydalanuvchi o'zi yozgan matnni geokoder almashtirmaydi
      addressEdited: Boolean(address?.address),
      house: address?.house || '',
      houseEdited: Boolean(address?.house),
      apartment: address?.apartment || '',
      label: address?.label || t('addrLabelHome'),
      isDefault: Boolean(address?.isDefault),
    };
  });
  // Tahrirda viloyat va tuman ma'lum bo'lsa — to'g'ridan-to'g'ri aniq manzil (nuqta yo'q bo'lsa xarita); aks holda boshidan.
  // Bosqichlar tarixi: "orqaga" oxirgi ko'rilgan bosqichga qaytaradi, birinchisida — ekrandan chiqadi
  const [trail, setTrail] = useState(() => [form.region && form.district ? (form.coords ? 'details' : 'map') : 'region']);
  const step = trail[trail.length - 1];
  const setStep = useCallback((next) => {
    setTrail((current) => {
      const at = current.indexOf(next);
      return at === -1 ? [...current, next] : current.slice(0, at + 1);
    });
  }, []);
  const [area, setArea] = useState(() => areaOf(form.region, form.district));
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const patch = useCallback((fields) => {
    setForm((current) => ({ ...current, ...fields }));
    setErrors({});
    setSaveError(null);
  }, []);

  const back = useCallback(() => {
    if (saving) return;
    if (trail.length <= 1) onCancel?.();
    else setTrail((current) => current.slice(0, -1));
  }, [onCancel, saving, trail.length]);

  // Android "orqaga": bosqichma-bosqich ortga; saqlanayotganda bloklanadi
  useEffect(() => {
    if (!onBackIntercept) return undefined;
    onBackIntercept(() => {
      back();
      return true;
    });
    return () => onBackIntercept(null);
  }, [onBackIntercept, back]);

  useEffect(() => () => clearTimeout(geocodeTimer.current), []);

  const pickRegion = (region) => {
    // Viloyat almashsa — tuman va nuqta qaytadan tanlanadi (eski, viloyatsiz manzilning nuqtasi saqlanadi)
    if (region !== form.region) patch({ region, district: null, geoText: '', ...(form.region ? { coords: null } : {}) });
    setStep('district');
  };

  const pickDistrict = (district) => {
    const changed = district !== form.district;
    // Boshqa tumanga o'tilsa nuqta qaytadan belgilanadi; tuman birinchi marta tanlanayotgan eski manzilda — saqlanadi
    const dropPoint = changed && Boolean(form.district);
    if (changed) {
      patch({ district, ...(dropPoint ? { coords: null, geoText: '', ...(form.addressEdited ? {} : { address: '' }) } : {}) });
    }
    if (dropPoint || !form.coords) setArea(areaOf(form.region, district));
    setStep('map');
    // Toshkent shahri tumanlari markazi ilovada bor; qolganlari uchun chegara tarmoqdan aniqlanadi
    if (form.region !== 'TOSHKENT_SHAHRI') {
      lookupArea(`${district}, ${t(`region_${form.region}`)}`)
        .then((found) => {
          if (found) setArea(found);
        })
        .catch(() => {});
    }
  };

  /** Yangi nuqta: pinni joylaydi va manzilni (mahalla/ko'cha, uy) kechiktirib aniqlaydi. */
  const setPoint = useCallback(
    (next) => {
      setForm((current) => ({ ...current, coords: next }));
      setErrors({});
      clearTimeout(geocodeTimer.current);
      geocodeTimer.current = setTimeout(async () => {
        const found = await geocoder.resolve(next);
        if (!found) return;
        setForm((current) => ({
          ...current,
          address: current.addressEdited ? current.address : found.text,
          house: current.houseEdited ? current.house : found.house || '',
          geoText: found.text,
        }));
      }, GEOCODE_DELAY_MS);
    },
    [geocoder],
  );

  const problem = form.coords ? pointProblem(form.region, form.coords) : null;

  const save = async () => {
    if (saving) return;
    const found = validateAddressForm(form);
    const pointError = pointProblem(form.region, form.coords);
    if (pointError) found.coords = pointError;
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

  const regionItems = useMemo(
    () =>
      REGION_CODES.map((code) => ({
        key: code,
        label: t(`region_${code}`),
        icon: code === 'TOSHKENT_SHAHRI' ? 'city-variant-outline' : 'map-marker-outline',
      })),
    [t],
  );
  const districtItems = useMemo(
    () =>
      districtsOf(form.region).map((d) => ({
        key: d.name,
        label: d.name,
        icon: d.city ? 'city-variant-outline' : 'map-marker-outline',
        // Toshkent shahrida faqat tumanlar — bo'lim sarlavhasi kerak emas
        group: form.region === 'TOSHKENT_SHAHRI' ? null : t(d.city ? 'addrCitiesGroup' : 'addrDistrictsGroup'),
      })),
    [form.region, t],
  );

  if (step === 'map') {
    return (
      <MapStep
        t={t}
        areaLabel={`${t(`region_${form.region}`)} · ${form.district}`}
        searchContext={`${form.district}, ${t(`region_${form.region}`)}`}
        regionName={t(`region_${form.region}`)}
        bounds={areaOf(form.region)}
        area={area}
        coords={form.coords}
        geo={{ text: form.geoText || '', resolving: geocoder.resolving }}
        problem={problem}
        onPoint={setPoint}
        onBack={back}
        onChangeArea={() => setStep('region')}
        onConfirm={() => setStep('details')}
      />
    );
  }

  const index = STEPS.indexOf(step);
  const titles = { region: 'addrStepRegion', district: 'addrStepDistrict', details: 'addrStepDetails' };
  const subs = { region: 'addrStepRegionSub', district: 'addrStepDistrictSub', details: 'addrStepDetailsSub' };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoider style={styles.flex}>
        <View style={styles.header}>
          <BackButton onPress={back} label={t('back')} />
          <View style={styles.flex}>
            <Text style={styles.stepNo}>{`${index + 1} / ${STEPS.length}`}</Text>
            <Text style={styles.title} numberOfLines={1}>{t(titles[step])}</Text>
          </View>
        </View>
        <View style={styles.progress}>
          {STEPS.map((s, i) => (
            <View key={s} style={[styles.bar, i <= index && styles.barOn]} />
          ))}
        </View>
        <Text style={styles.sub}>{step === 'district' ? `${t(`region_${form.region}`)} · ${t(subs[step])}` : t(subs[step])}</Text>

        {step === 'region' ? (
          <AreaStep items={regionItems} value={form.region} onPick={pickRegion} searchPlaceholder={t('addrRegionSearch')} emptyText={t('noResults')} />
        ) : step === 'district' ? (
          <AreaStep
            key={form.region}
            items={districtItems}
            value={form.district}
            onPick={pickDistrict}
            searchPlaceholder={t('addrDistrictSearch')}
            emptyText={t('noResults')}
          />
        ) : (
          <DetailsStep
            t={t}
            form={form}
            onChange={patch}
            errors={errors}
            saveError={saveError}
            saving={saving}
            onEditPoint={() => setStep('map')}
            onSave={save}
            bottomInset={insets.bottom}
          />
        )}
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.xl, paddingTop: 8 },
  stepNo: { color: colors.accent, fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 18, lineHeight: 24, marginTop: 1 },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.xl, marginTop: 14 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  barOn: { backgroundColor: colors.accent },
  sub: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, paddingHorizontal: spacing.xl, marginTop: 12, marginBottom: 14 },
}));
