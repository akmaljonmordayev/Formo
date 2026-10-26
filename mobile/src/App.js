import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Unbounded_500Medium } from '@expo-google-fonts/unbounded/500Medium';
import { Onest_400Regular } from '@expo-google-fonts/onest/400Regular';
import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium';
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold';
import { SairaExtraCondensed_700Bold } from '@expo-google-fonts/saira-extra-condensed/700Bold';
import { SairaExtraCondensed_800ExtraBold } from '@expo-google-fonts/saira-extra-condensed/800ExtraBold';
import BrandSplash from './components/ui/BrandSplash';
import { ToastProvider } from './components/ui/Toast';
import useAuth from './features/auth';
import { useTranslation } from './i18n';
import AppNavigator from './navigation/AppNavigator';
import { useAppStore } from './store/appStore';

// Native splash JS splash (BrandSplash) chizilguncha turadi — orada bo'sh ekran ko'rinmaydi
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const store = useAppStore();
  const { t } = useTranslation(store.language);
  const auth = useAuth();
  // Mahalliy .ttf fayllar — tez yuklanadi. Xato bo'lsa tizim shrifti bilan davom etamiz.
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_500Medium,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    SairaExtraCondensed_700Bold,
    SairaExtraCondensed_800ExtraBold,
  });

  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {fontsReady ? (
        <ToastProvider>
          <AppNavigator store={store} t={t} auth={auth} />
        </ToastProvider>
      ) : null}
      {/* Faqat ishga tushishda: shriftlar yuklanib, sessiya tiklanguncha */}
      <BrandSplash ready={fontsReady && !auth.isLoading} />
    </SafeAreaProvider>
  );
}
