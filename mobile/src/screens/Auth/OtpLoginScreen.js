import React, { useState } from 'react';
import SplashScreen from './SplashScreen';
import OnboardingScreen from './OnboardingScreen';
import PhoneScreen from './PhoneScreen';
import OtpScreen from './OtpScreen';

/**
 * Ilovaning yagona kirish oqimi — parolsiz, 1-bosqich (Kirish), 4 qadam:
 *   1. SplashScreen     — avtomatik o'tadi
 *   2. OnboardingScreen — tanishtiruv (o'tkazib yuborish mumkin)
 *   3. PhoneScreen      — telefon raqam
 *   4. OtpScreen        — SMS kod (dev-only demo: istalgan 5 ta raqam)
 *
 * Kod to'g'ri bo'lsa `auth.verifyOtp` mavjud hisobga kiradi yoki yangi hisob
 * ochadi — `auth.isAuthenticated` flip bo'lgach AppNavigator asosiy ilovaga
 * o'tkazadi, shuning uchun bu yerda alohida "onVerified" navigatsiyasi kerak
 * emas.
 */
export default function OtpLoginScreen({ auth, t }) {
  const [step, setStep] = useState('splash');
  const [phone, setPhone] = useState('');

  if (step === 'splash') {
    return <SplashScreen onFinish={() => setStep('onboarding')} />;
  }

  if (step === 'onboarding') {
    return <OnboardingScreen onFinish={() => setStep('phone')} />;
  }

  if (step === 'otp') {
    return (
      <OtpScreen
        phone={phone}
        auth={auth}
        t={t}
        onBack={() => setStep('phone')}
      />
    );
  }

  return (
    <PhoneScreen
      auth={auth}
      t={t}
      onBack={() => setStep('onboarding')}
      onRequestOtp={({ phone: verifiedPhone }) => {
        setPhone(verifiedPhone);
        setStep('otp');
      }}
    />
  );
}
