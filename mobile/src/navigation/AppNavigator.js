import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BottomTabs } from '../components/ui/BottomTabs';
import { colors } from '../constants/theme';
import OtpLoginScreen from '../screens/Auth/OtpLoginScreen';
import CompleteProfileScreen from '../screens/Login/CompleteProfileScreen';
import AddressesScreen from '../screens/AddressesScreen';
import CartScreen from '../screens/CartScreen';
import CatalogScreen from '../screens/CatalogScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import HomeScreen from '../screens/HomeScreen';
import LocationPickerScreen from '../screens/LocationPickerScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProductScreen from '../screens/ProductScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StudioScreen from '../screens/StudioScreen';
import useAppConfig from '../features/config';
import useCart from '../features/cart';
import * as storage from '../utils/storage';
import { realFullName } from '../utils/userName';

const MEASUREMENT_KEYS = ['gender', 'age', 'height', 'weight'];

/**
 * AppNavigator
 *
 * Props:
 *   store  — useAppStore() object
 *   t      — translation function
 *   auth   — useAuth() object { isLoading, isAuthenticated, login, register, logout, user, error }
 */
export default function AppNavigator({ store, t, auth }) {
  // ─── Main app routes ─────────────────────────────────────────────────────────
  const [route, setRoute] = useState('home');
  // Klub sahifasi: { clubId, kitId? }; studiyadagi forma; ochilgan buyurtma
  const [selectedClub, setSelectedClub] = useState(null);
  const [studioKit, setStudioKit] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [orderFrom, setOrderFrom] = useState('orders');
  const [notifFrom, setNotifFrom] = useState('home');

  // ─── Cart origin (to return where the user came from) ────────────────────────
  const [cartFrom, setCartFrom] = useState('home');

  // ─── Xaritada manzil tanlash: tahrirlanayotgan manzil va qaytish joyi ─────────
  const [pickerAddress, setPickerAddress] = useState(null);
  const [pickerFrom, setPickerFrom] = useState('addresses');
  const [addressesKey, setAddressesKey] = useState(0);
  const [checkoutAddressId, setCheckoutAddressId] = useState(null);

  // ─── Profile completion survey (shown once for users missing measurements) ───
  // Skip-bayrog'i foydalanuvchi id'siga bog'langan: shu foydalanuvchi uchun
  // o'qilmaguncha `null` (noma'lum) — eski qiymat yangi hisobga o'tib ketmaydi.
  const userId = auth.user?.id;

  // Server savati — barcha ekranlar uchun bitta (faqat kirgan foydalanuvchi)
  const cart = useCart(auth.isAuthenticated);
  // GET /api/app/config — buyurtma qoidalari va aloqa (Superadmin sozlamalari)
  const config = useAppConfig();
  const { refresh: refreshConfig } = config;
  const [skipState, setSkipState] = useState({ userId: null, skip: true });
  const profileSkip = skipState.userId === userId ? skipState.skip : null;
  // Ro'yxatdan o'tish qadamlari ochilgach, "Xush kelibsiz" ekranigacha ochiq
  // qoladi — saqlash o'lchovlarni to'ldirgani uchun `profileMissing` false
  // bo'lsa ham asosiy ilovaga muddatidan oldin o'tib ketmaymiz.
  const [surveyOpen, setSurveyOpen] = useState(false);
  // Ism (server joy egasi "Yangi mijoz" bo'lsa) yoki o'lchovlardan biri bo'sh
  const profileMissing =
    !!auth.user && (!realFullName(auth.user) || MEASUREMENT_KEYS.some((key) => auth.user[key] == null));
  const needsSurvey = auth.isAuthenticated && profileMissing && profileSkip === false;

  useEffect(() => {
    if (needsSurvey) setSurveyOpen(true);
  }, [needsSurvey]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setSurveyOpen(false);
      return undefined;
    }
    storage.getItem(`formo_profile_skip_${userId}`).then((value) => {
      if (!cancelled) setSkipState({ userId, skip: value === '1' });
    });
    return () => { cancelled = true; };
  }, [userId]);

  // Buyurtma beriladigan ekranlarga kirganda qoidalarni yangilaymiz
  useEffect(() => {
    if (['studio', 'cart', 'checkout'].includes(route)) refreshConfig();
  }, [route, refreshConfig]);

  const navigate = (next) => setRoute(next);
  // Tab/bosh sahifadan studiyaga kirilsa — maxsus dizayn rejimi (klub formasi faqat klub sahifasidan)
  const navigateTab = (next) => {
    if (next === 'studio') setStudioKit(null);
    setRoute(next);
  };
  const openCart = (from) => {
    setCartFrom(from);
    setRoute('cart');
  };
  const openClub = (club, kitId) => {
    setSelectedClub({ clubId: club.id, kitId });
    setRoute('product');
  };
  const openOrder = (id, from = route) => {
    setOrderId(id);
    setOrderFrom(from === 'order' ? 'orders' : from);
    setRoute('order');
  };
  const openPicker = (address, from) => {
    setPickerAddress(address);
    setPickerFrom(from);
    setRoute('locationPicker');
  };
  const openNotifications = (from) => {
    setNotifFrom(from);
    setRoute('notifications');
  };

  // ─── 1. Full-screen loading while session is being restored ──────────────────
  // Bayroq o'qilguncha (bir lahza) — profili to'liq bo'lmaganga asosiy ekran miltillamasin
  if (auth.isLoading || (auth.isAuthenticated && profileMissing && profileSkip === null)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // ─── 2. Auth wall — faqat telefon + SMS kod (parol yo'q) ──────────────────────
  if (!auth.isAuthenticated) {
    // Successful login/register: auth.isAuthenticated flips → navigator re-renders
    return <OtpLoginScreen auth={auth} t={t} />;
  }

  // ─── 2b. Ro'yxatdan o'tish qadamlari (o'lchovlari bo'sh foydalanuvchiga bir marta) ─
  if (needsSurvey || surveyOpen) {
    const closeSurvey = () => {
      setSurveyOpen(false);
      setSkipState({ userId, skip: true });
      if (userId) storage.setItem(`formo_profile_skip_${userId}`, '1');
      setRoute('home');
    };
    return <CompleteProfileScreen auth={auth} t={t} onSkip={closeSurvey} onFinish={closeSurvey} />;
  }

  // ─── 3. Main app ─────────────────────────────────────────────────────────────
  const content =
    route === 'home' ? (
      <HomeScreen
        t={t}
        onNavigate={navigateTab}
        onClub={openClub}
        onOrder={(id) => openOrder(id, 'home')}
        onNotifications={() => openNotifications('home')}
        rules={config.rules}
        auth={auth}
        cartCount={cart.count}
        onCart={() => openCart('home')}
      />
    ) : route === 'catalog' ? (
      <CatalogScreen
        t={t}
        onClub={openClub}
        cartCount={cart.count}
        onCart={() => openCart('catalog')}
      />
    ) : route === 'studio' ? (
      <StudioScreen
        t={t}
        kit={studioKit}
        cart={cart}
        rules={config.rules}
        studio={config.studio}
        studioError={config.error}
        onRetryConfig={refreshConfig}
        onOpenCart={() => openCart('studio')}
        onPickKit={() => navigate('catalog')}
        onBack={() => navigate('home')}
      />
    ) : route === 'cart' ? (
      <CartScreen
        t={t}
        cart={cart}
        rules={config.rules}
        onBack={() => navigate(cartFrom)}
        onCheckout={() => navigate('checkout')}
      />
    ) : route === 'checkout' ? (
      <CheckoutScreen
        t={t}
        cart={cart}
        rules={config.rules}
        onBack={() => navigate('cart')}
        onPlaced={(order) => openOrder(order.id, 'orders')}
        onPickOnMap={() => openPicker(null, 'checkout')}
        initialAddressId={checkoutAddressId}
      />
    ) : route === 'orders' ? (
      <OrdersScreen t={t} onOrder={(id) => openOrder(id, 'orders')} />
    ) : route === 'order' ? (
      <OrderDetailScreen t={t} orderId={orderId} rules={config.rules} onBack={() => navigate(orderFrom)} />
    ) : route === 'notifications' ? (
      <NotificationsScreen t={t} onBack={() => navigate(notifFrom)} />
    ) : route === 'profile' ? (
      <ProfileScreen
        t={t}
        auth={auth}
        onSettings={() => navigate('settings')}
        onOrders={() => navigate('orders')}
        onAddresses={() => navigate('addresses')}
      />
    ) : route === 'addresses' ? (
      <AddressesScreen
        t={t}
        refreshKey={addressesKey}
        onBack={() => navigate('profile')}
        onEdit={(address) => openPicker(address, 'addresses')}
      />
    ) : route === 'locationPicker' ? (
      <LocationPickerScreen
        t={t}
        address={pickerAddress}
        onCancel={() => navigate(pickerFrom)}
        onSaved={(saved) => {
          setAddressesKey((k) => k + 1);
          if (pickerFrom === 'checkout' && saved?.id) setCheckoutAddressId(saved.id);
          navigate(pickerFrom);
        }}
      />
    ) : route === 'settings' ? (
      <SettingsScreen
        t={t}
        language={store.language}
        setLanguage={store.setLanguage}
        onBack={() => navigate('profile')}
        onNotifications={() => openNotifications('settings')}
        general={config.general}
        auth={auth}
      />
    ) : (
      <ProductScreen
        t={t}
        clubId={selectedClub?.clubId}
        kitId={selectedClub?.kitId}
        rules={config.rules}
        onBack={() => navigate('catalog')}
        onCustomize={(product) => {
          setStudioKit(product);
          navigate('studio');
        }}
      />
    );

  // Tab bar stays visible everywhere in the main app (including the design
  // studio — only full-screen detail/settings pages hide it).
  const hideTabs = ['product', 'settings', 'checkout', 'order', 'notifications', 'addresses', 'locationPicker'].includes(route);

  return (
    <>
      {content}
      {!hideTabs && (
        <BottomTabs active={route} onChange={navigateTab} t={t} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
