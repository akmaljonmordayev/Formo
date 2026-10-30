import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabs } from '../components/ui/BottomTabs';
import { CartContext } from '../components/ui/CartButton';
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
import WalletScreen from '../screens/WalletScreen';
import useAppConfig from '../features/config';
import useCart from '../features/cart';
import * as storage from '../utils/storage';
import { profileGaps } from '../utils/userName';


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
  const [walletFrom, setWalletFrom] = useState('profile');
  // Bosh sahifadan katalogga: liga filtri yoki qidiruvga fokus
  const [catalogIntent, setCatalogIntent] = useState({ categoryId: null, search: false });

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
  // Ism (server joy egasi "Yangi mijoz" bo'lsa), jins yoki yosh bo'sh — skip-bayrog'idan qat'i nazar
  const gaps = profileGaps(auth.user);
  const requiredMissing = gaps.required;
  const profileMissing = gaps.required || gaps.optional;
  const needsSurvey = auth.isAuthenticated && (requiredMissing || (profileMissing && profileSkip === false));

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
  // Tab/bosh sahifadan studiyaga kirilsa — Forma 360° jamoalari ro'yxati (forma klub sahifasidan tanlanadi)
  const navigateTab = (next) => {
    if (next === 'studio') setStudioKit(null);
    if (next === 'catalog') setCatalogIntent({ categoryId: null, search: false });
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
  const openWallet = (from) => {
    setWalletFrom(from);
    setRoute('wallet');
  };
  const openNotifications = (from) => {
    setNotifFrom(from);
    setRoute('notifications');
  };

  // Sarlavhalardagi savat tugmasi (Header cart) — soni va qaysi ekrandan ochilgani
  const cartValue = useMemo(
    () => ({ count: cart.count, open: () => openCart(route === 'cart' ? cartFrom : route), t }),
    [cart.count, route, cartFrom, t], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ─── 1. Sessiya tiklanguncha — ustida BrandSplash (App.js) turadi ─────────────
  // Bayroq o'qilguncha (bir lahza) — profili to'liq bo'lmaganga asosiy ekran miltillamasin
  if (auth.isLoading || (auth.isAuthenticated && !requiredMissing && profileMissing && profileSkip === null)) {
    return <View style={styles.loadingContainer} />;
  }

  // ─── 2. Auth wall — faqat telefon + Telegram bot kodi (parol/SMS yo'q) ────────
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
        onCategory={(categoryId) => {
          setCatalogIntent({ categoryId, search: false });
          setRoute('catalog');
        }}
        onSearch={() => {
          setCatalogIntent({ categoryId: null, search: true });
          setRoute('catalog');
        }}
        rules={config.rules}
        auth={auth}
      />
    ) : route === 'catalog' ? (
      <CatalogScreen
        t={t}
        onClub={openClub}
        initialCategoryId={catalogIntent.categoryId}
        focusSearch={catalogIntent.search}
      />
    ) : route === 'studio' ? (
      <StudioScreen
        t={t}
        kit={studioKit}
        cart={cart}
        rules={config.rules}
        onOpenCart={() => openCart('studio')}
        onClub={openClub}
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
        onWallet={() => openWallet('checkout')}
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
        onWallet={() => openWallet('profile')}
      />
    ) : route === 'wallet' ? (
      <WalletScreen t={t} telegramBot={config.telegramBot} onBack={() => navigate(walletFrom)} />
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
  const hideTabs = ['product', 'settings', 'checkout', 'order', 'notifications', 'addresses', 'locationPicker', 'wallet'].includes(route);

  return (
    <CartContext.Provider value={cartValue}>
      {content}
      {!hideTabs && (
        <BottomTabs active={route} onChange={navigateTab} t={t} />
      )}
    </CartContext.Provider>
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
