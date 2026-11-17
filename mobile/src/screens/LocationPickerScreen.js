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
  addressTitle,
  areaOf,
  districtsOf,
  isDistrictOf,
  isPostalRegion,
  lookupArea,
  matchDistrict,
  pointProblem,
  saveAddress,
  useReverseGeocode,
  validateAddressForm,
} from '../features/location';
import { errorText } from '../utils/errors';

const GEOCODE_DELAY_MS = 600;
const STEPS = ['region', 'district', 'map', 'details'];
// Viloyatlarga pochta bo'limigacha — xarita bosqichi yo'q
const POSTAL_STEPS = ['region', 'district', 'details'];

/**
 * LocationPickerScreen — yetkazish manzilini qo'shish/tahrirlash:
 *   • Toshkent shahri (kuryer uygacha), 4 bosqich: 1) viloyat → 2) tuman → 3) xarita: tanlangan tumanda ochiladi,
 *     qidiruv ("Madadkor mahallasi") yoki GPS bilan uy nuqtasi belgilanadi → 4) aniq manzil: mahalla/ko'cha,
 *     uy raqami (majburiy), xonadon.
 *   • Viloyatlar (pochta bo'limigacha), 3 bosqich: 1) viloyat → 2) tuman yoki shahar → 3) saqlash. Xarita va uy
 *     manzili so'ralmaydi — viloyat va tuman yetarli.
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
      // Manzil nomi (Uy/Ish) so'ralmaydi — saqlashda tuman nomidan olinadi (addressTitle)
      label: address?.label || '',
      isDefault: Boolean(address?.isDefault),
    };
  });
  // Tahrirda viloyat va tuman ma'lum bo'lsa — to'g'ridan-to'g'ri aniq manzil (nuqta yo'q bo'lsa xarita); aks holda boshidan.
  // Bosqichlar tarixi: "orqaga" oxirgi ko'rilgan bosqichga qaytaradi, birinchisida — ekrandan chiqadi
  const [trail, setTrail] = useState(() => [
    form.region && form.district ? (form.coords || isPostalRegion(form.region) ? 'details' : 'map') : 'region',
  ]);
  const postal = isPostalRegion(form.region);
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
    // Viloyat almashsa — tuman, nuqta va aniq manzil qaytadan kiritiladi: boshqa viloyatning ko'chasi/uy raqami
    // yangi viloyatga yopishib qolmasin (eski, viloyatsiz manzilning nuqtasi va matni saqlanadi)
    if (region !== form.region) {
      patch({
        region,
        district: null,
        geoText: '',
        ...(form.region ? { coords: null, address: '', addressEdited: false, house: '', houseEdited: false, apartment: '' } : {}),
      });
    }
    setStep('district');
  };

  const pickDistrict = (district) => {
    const changed = district !== form.district;
    // Boshqa tumanga o'tilsa nuqta qaytadan belgilanadi; tuman birinchi marta tanlanayotgan eski manzilda — saqlanadi
    const dropPoint = changed && Boolean(form.district);
    if (changed) {
      patch({ district, ...(dropPoint ? { coords: null, geoText: '', ...(form.addressEdited ? {} : { address: '' }) } : {}) });
    }
    // Viloyatlarga pochta bo'limigacha — xaritasiz, to'g'ridan-to'g'ri saqlash bosqichi
    if (isPostalRegion(form.region)) {
      setStep('details');
      return;
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
        setForm((current) => {
          // Nuqta (GPS "Mening joylashuvim" yoki xaritani surish) boshqa tumanga tushdi — manzil tumani ham shu:
          // aks holda "Toshkent shahri, Mirobod tumani, Sergeli-7 ..." kabi ikki joy aralash manzil saqlanardi
          const district = matchDistrict(current.region, found.areas) || current.district;
          const moved = district !== current.district;
          return {
            ...current,
            district,
            // Tuman almashsa — qo'lda yozilgan ko'cha/uy ham eski tumanniki, yangi nuqtanikiga almashadi
            address: current.addressEdited && !moved ? current.address : found.text,
            addressEdited: moved ? false : current.addressEdited,
            house: current.houseEdited && !moved ? current.house : found.house || '',
            houseEdited: moved ? false : current.houseEdited,
            // Xonadon raqamini geokoder bermaydi — jimgina o'chirilmaydi, foydalanuvchi o'zi tekshiradi
            geoText: found.text,
          };
        });
      }, GEOCODE_DELAY_MS);
    },
    [geocoder],
  );

  const problem = form.coords ? pointProblem(form.region, form.coords) : null;

  const save = async () => {
    if (saving) return;
    // Nom (server uchun majburiy) — tuman, bo'lmasa viloyat nomi: ro'yxat va checkout'da manzil sarlavhasi
    const ready = { ...form, label: addressTitle(form, t) };
    const found = validateAddressForm(ready);
    // Xarita nuqtasi faqat Toshkent shahri (kuryer) manzilida majburiy
    const pointError = postal ? null : pointProblem(form.region, form.coords);
    if (pointError) found.coords = pointError;
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveAddress(ready, address?.id);
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

  // Viloyat tanlanmaguncha (1-bosqich) bosqichlar soni noma'lum — to'liq (4) deb ko'rsatiladi
  const steps = postal ? POSTAL_STEPS : STEPS;
  const index = steps.indexOf(step);
  const titles = { region: 'addrStepRegion', district: 'addrStepDistrict', details: postal ? 'addrStepPostal' : 'addrStepDetails' };
  const subs = { region: 'addrStepRegionSub', district: 'addrStepDistrictSub', details: postal ? 'addrStepPostalSub' : 'addrStepDetailsSub' };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <KeyboardAvoider style={styles.flex}>
        <View style={styles.header}>
          <BackButton onPress={back} label={t('back')} />
          <View style={styles.flex}>
            <Text style={styles.stepNo}>{`${index + 1} / ${steps.length}`}</Text>
            <Text style={styles.title} numberOfLines={1}>{t(titles[step])}</Text>
          </View>
        </View>
        <View style={styles.progress}>
          {steps.map((s, i) => (
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
            postal={postal}
            form={form}
            onChange={patch}
            errors={errors}
            saveError={saveError}
            saving={saving}
            onEditPoint={() => setStep('map')}
            onChangeArea={() => setStep('region')}
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
