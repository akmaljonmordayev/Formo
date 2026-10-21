import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from './components/ui/Toast';
import useAuth from './features/auth';
import { useTranslation } from './i18n';
import AppNavigator from './navigation/AppNavigator';
import { useAppStore } from './store/appStore';

export default function App() {
  const store = useAppStore();
  const { t } = useTranslation(store.language);
  const auth = useAuth();

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <StatusBar style="light" />
        <AppNavigator store={store} t={t} auth={auth} />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
