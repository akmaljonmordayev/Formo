import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BottomTabs } from '../components/ui/BottomTabs';
import { colors } from '../constants/theme';
import LoginScreen from '../screens/Login/LoginScreen';
import RegisterScreen from '../screens/Login/RegisterScreen';
import CompleteProfileScreen from '../screens/Login/CompleteProfileScreen';
import CartScreen from '../screens/CartScreen';
import CatalogScreen from '../screens/CatalogScreen';
import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProductScreen from '../screens/ProductScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StudioScreen from '../screens/StudioScreen';
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
  const [selectedProduct, setSelectedProduct] = useState(null);

  // ─── Auth sub-routes (login | register) ──────────────────────────────────────
  const [authRoute, setAuthRoute] = useState('login');

  // ─── Cart origin (to return where the user came from) ────────────────────────
  const [cartFrom, setCartFrom] = useState('home');

  // ─── Profile completion survey (shown once for users missing measurements) ───
  // Starts as `true` (hidden) until the stored skip-flag is read, so the survey
  // never flashes while loading.
  const userId = auth.user?.id;
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

  const navigate = (next) => setRoute(next);
  const openCart = (from) => {
    setCartFrom(from);
    setRoute('cart');
  };
  const openProduct = (product) => {
    setSelectedProduct(product);
    setRoute('product');
  };

  // ─── 1. Full-screen loading while session is being restored ──────────────────
  if (auth.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // ─── 2. Auth wall ─────────────────────────────────────────────────────────────
  if (!auth.isAuthenticated) {
    if (authRoute === 'register') {
      return (
        <RegisterScreen
          auth={auth}
          t={t}
          language={store.language}
          onLanguage={store.setLanguage}
          // Successful register: auth.isAuthenticated will flip → navigator re-renders
          onLogin={() => setAuthRoute('login')}
        />
      );
    }

    return (
      <LoginScreen
        auth={auth}
        t={t}
        language={store.language}
        onLanguage={store.setLanguage}
        // Successful login: auth.isAuthenticated will flip → navigator re-renders
        onLogin={() => {}}
        onRegister={() => setAuthRoute('register')}
      />
    );
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
        onNavigate={navigate}
        onProduct={openProduct}
        auth={auth}
        cartCount={store.cart.length}
        onCart={() => openCart('home')}
      />
    ) : route === 'catalog' ? (
      <CatalogScreen
        t={t}
        favorites={store.favorites}
        onToggleFavorite={store.toggleFavorite}
        onProduct={openProduct}
        cartCount={store.cart.length}
        onCart={() => openCart('catalog')}
      />
    ) : route === 'studio' ? (
      <StudioScreen
        t={t}
        addToCart={store.addToCart}
        cartCount={store.cart.length}
        onOpenCart={() => openCart('studio')}
        onBack={() => navigate('home')}
      />
    ) : route === 'cart' ? (
      <CartScreen
        t={t}
        cart={store.cart}
        addToCart={store.addToCart}
        removeFromCart={store.removeFromCart}
        clearCart={store.clearCart}
        onBack={() => navigate(cartFrom)}
        onNavigate={navigate}
      />
    ) : route === 'orders' ? (
      <OrdersScreen t={t} />
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
        auth={auth}
      />
    ) : (
      <ProductScreen
        t={t}
        product={selectedProduct}
        onBack={() => navigate('catalog')}
        onCustomize={() => navigate('studio')}
      />
    );

  // Tab bar stays visible everywhere in the main app (including the design
  // studio — only full-screen detail/settings pages hide it).
  const hideTabs = ['product', 'settings'].includes(route);

  return (
    <>
      {content}
      {!hideTabs && (
        <BottomTabs active={route} onChange={navigate} t={t} />
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
