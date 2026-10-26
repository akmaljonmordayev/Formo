import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import * as storage from '../../utils/storage';
import SplashScreen from './SplashScreen';
import OnboardingScreen from './OnboardingScreen';
import PhoneScreen from './PhoneScreen';
import TelegramScreen from './TelegramScreen';

const ONBOARDING_SEEN_KEY = 'formo_onboarding_seen';

/**
 * Ilovaning yagona kirish oqimi — parolsiz, faqat Telegram bot orqali:
 *   1. SplashScreen     — avtomatik o'tadi
 *   2. OnboardingScreen — tanishtiruv (faqat birinchi marta; o'tkazib yuborish mumkin)
 *   3. PhoneScreen      — telefon raqam → POST /auth/telegram/start
 *   4. TelegramScreen   — botni ochish va 5 xonali kod → POST /auth/telegram/verify
 *
 * Kod to'g'ri bo'lsa server mavjud hisobga kiritadi yoki yangi hisob ochadi —
 * `auth.isAuthenticated` o'zgargach AppNavigator keyingi ekranni (yangi
 * foydalanuvchi uchun profilni to'ldirish) ko'rsatadi.
 *
 * Android "orqaga" tugmasi ekrandagi orqaga tugmasi bilan bir xil ishlaydi:
 * telegram → phone → onboarding → ilovadan chiqish.
 */
export default function OtpLoginScreen({ auth, t }) {
  const [step, setStep] = useState('splash');
  const [phone, setPhone] = useState('');
  // Telegram so'rovi: { challengeId, deepLink, expiresAt } — "Yangi so'rov" bilan almashtiriladi
  const [challenge, setChallenge] = useState(null);
  const onboardingSeenRef = useRef(false);

  useEffect(() => {
    storage.getItem(ONBOARDING_SEEN_KEY).then((value) => {
      onboardingSeenRef.current = value === '1';
    });
  }, []);

  const finishSplash = useCallback(() => {
    // Splash bosilganda ham, animatsiya tugaganda ham chaqiriladi — faqat birinchisi o'tkazadi
    setStep((current) => {
      if (current !== 'splash') return current;
      return onboardingSeenRef.current ? 'phone' : 'onboarding';
    });
  }, []);

  const finishOnboarding = useCallback(() => {
    onboardingSeenRef.current = true;
    storage.setItem(ONBOARDING_SEEN_KEY, '1');
    setStep('phone');
  }, []);

  useEffect(() => {
    const previous = { telegram: 'phone', phone: 'onboarding' }[step];
    if (!previous) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep(previous);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  if (step === 'splash') {
    return <SplashScreen onFinish={finishSplash} />;
  }

  if (step === 'onboarding') {
    return <OnboardingScreen onFinish={finishOnboarding} />;
  }

  if (step === 'telegram' && challenge) {
    return (
      <TelegramScreen
        phone={phone}
        challenge={challenge}
        auth={auth}
        t={t}
        onNewRequest={async () => setChallenge(await auth.startTelegram(phone))}
        onBack={() => setStep('phone')}
      />
    );
  }

  return (
    <PhoneScreen
      auth={auth}
      t={t}
      initialPhone={phone}
      onBack={() => setStep('onboarding')}
      onTelegramStarted={({ phone: enteredPhone, challenge: started }) => {
        setPhone(enteredPhone);
        setChallenge(started);
        setStep('telegram');
      }}
    />
  );
}
