import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BottomTabs } from '../components/ui/BottomTabs';
import { colors } from '../constants/theme';
import OtpLoginScreen from '../screens/Auth/OtpLoginScreen';
import CompleteProfileScreen from '../screens/Login/CompleteProfileScreen';
import CartScreen from '../screens/CartScreen';
import CatalogScreen from '../screens/CatalogScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import HomeScreen from '../screens/HomeScreen';
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

  // ─── Profile completion survey (shown once for users missing measurements) ───
  // Starts as `true` (hidden) until the stored skip-flag is read, so the survey
  // never flashes while loading.
  const userId = auth.user?.id;

  // Server savati — barcha ekranlar uchun bitta (faqat kirgan foydalanuvchi)
  const cart = useCart(auth.isAuthenticated);
  // GET /api/app/config — buyurtma qoidalari va aloqa (Superadmin sozlamalari)
  const config = useAppConfig();
  const { refresh: refreshConfig } = config;
  const [profileSkip, setProfileSkip] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setProfileSkip(true);
      return undefined;
    }
    storage.getItem(`formo_profile_skip_${userId}`).then((value) => {
      if (!cancelled) setProfileSkip(value === '1');
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
  const openNotifications = (from) => {
    setNotifFrom(from);
    setRoute('notifications');
  };

  // ─── 1. Full-screen loading while session is being restored ──────────────────
  if (auth.isLoading) {
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

  // ─── 2b. One-time "about you" survey for users with missing measurements ─────
  const profileMissing = !!auth.user && MEASUREMENT_KEYS.some((key) => auth.user[key] == null);
  if (profileMissing && !profileSkip) {
    return (
      <CompleteProfileScreen
        auth={auth}
        t={t}
        language={store.language}
        onLanguage={store.setLanguage}
        onSkip={() => {
          setProfileSkip(true);
          if (userId) storage.setItem(`formo_profile_skip_${userId}`, '1');
        }}
      />
    );
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
  const hideTabs = ['product', 'settings', 'checkout', 'order', 'notifications'].includes(route);

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
