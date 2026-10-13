import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BottomTabs } from '../components/ui/BottomTabs';
import { colors } from '../constants/theme';
import LoginScreen from '../screens/Login/LoginScreen';
import RegisterScreen from '../screens/Login/RegisterScreen';
import CartScreen from '../screens/CartScreen';
import CatalogScreen from '../screens/CatalogScreen';
import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProductScreen from '../screens/ProductScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StudioScreen from '../screens/StudioScreen';

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

  const navigate = (next) => setRoute(next);
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
          // Successful register: auth.isAuthenticated will flip → navigator re-renders
          onLogin={() => setAuthRoute('login')}
        />
      );
    }

    return (
      <LoginScreen
        auth={auth}
        t={t}
        // Successful login: auth.isAuthenticated will flip → navigator re-renders
        onLogin={() => {}}
        onRegister={() => setAuthRoute('register')}
      />
    );
  }

  // ─── 3. Main app ─────────────────────────────────────────────────────────────
  const content =
    route === 'home' ? (
      <HomeScreen t={t} onNavigate={navigate} onProduct={openProduct} />
    ) : route === 'catalog' ? (
      <CatalogScreen
        t={t}
        favorites={store.favorites}
        onToggleFavorite={store.toggleFavorite}
        onProduct={openProduct}
      />
    ) : route === 'studio' ? (
      <StudioScreen
        t={t}
        addToCart={store.addToCart}
        cartCount={store.cart.length}
        onOpenCart={() => navigate('cart')}
        onBack={() => navigate('home')}
      />
    ) : route === 'cart' ? (
      <CartScreen
        t={t}
        cart={store.cart}
        removeFromCart={store.removeFromCart}
        clearCart={store.clearCart}
        onBack={() => navigate('studio')}
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
      />
    ) : (
      <ProductScreen
        t={t}
        product={selectedProduct}
        onBack={() => navigate('catalog')}
        onCustomize={() => navigate('studio')}
      />
    );

  const hideTabs = ['product', 'settings', 'studio'].includes(route);

  return (
    <>
      {content}
      {!hideTabs && (
        <BottomTabs active={route} onChange={navigate} cartCount={store.cart.length} t={t} />
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
