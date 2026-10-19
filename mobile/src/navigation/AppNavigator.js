import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BottomTabs } from '../components/ui/BottomTabs';
import { colors } from '../constants/theme';

// ─── Auth screens (original Antigravity flow) ───────────────────────────────
// splash → onboarding → phone → OTP → reg0 (password) → reg1 (name) →
// reg2 (measurements) → reg3 (club) → reg4 (jersey) → register.
//
// Existing users sign in directly from PhoneScreen (phone + password) and land
// on Home; the OTP/SMS branch is used only to create a new account. There is
// intentionally no club/jersey/measurement step forced after a normal login.
import SplashScreen from '../screens/Auth/SplashScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';
import PhoneScreen from '../screens/Auth/PhoneScreen';
import OtpScreen from '../screens/Auth/OtpScreen';
import Reg0PasswordScreen from '../screens/Auth/Reg0PasswordScreen';
import Reg1NameScreen from '../screens/Auth/Reg1NameScreen';
import Reg2MeasurementsScreen from '../screens/Auth/Reg2MeasurementsScreen';
import Reg3ClubScreen from '../screens/Auth/Reg3ClubScreen';
import Reg4JerseyScreen from '../screens/Auth/Reg4JerseyScreen';

// ─── Main app screens ───────────────────────────────────────────────────────
import HomeScreen from '../screens/HomeScreen';
import CatalogScreen from '../screens/CatalogScreen';
import ClubDetailScreen from '../screens/ClubDetailScreen';
import KitCustomScreen from '../screens/KitCustomScreen';
import StudioScreen from '../screens/StudioScreen';
import SizeScreen from '../screens/SizeScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import PayScreen from '../screens/PayScreen';
import SuccessScreen from '../screens/SuccessScreen';
import TrackScreen from '../screens/TrackScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AddressesScreen from '../screens/AddressesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import ArPreviewScreen from '../screens/ArPreviewScreen';

export default function AppNavigator({ store, t, auth }) {
  // ─── Splash ────────────────────────────────────────────────────────────────
  const [showSplash, setShowSplash] = useState(true);

  // ─── Auth gate route ───────────────────────────────────────────────────────
  // 'onboarding' | 'phone' | 'otp' | 'reg0' | 'reg1' | 'reg2' | 'reg3' | 'reg4'
  const [authRoute, setAuthRoute] = useState('onboarding');
  // Registration data accumulated across the step screens (stays on-device).
  const [regData, setRegData] = useState({});
  // Whether the (local, development-only) OTP should show its demo hint.
  const [otpDemo, setOtpDemo] = useState(false);

  // ─── Main Route State ───────────────────────────────────────────────────────
  // Primary tabs: 'home' | 'catalog' | 'cart' | 'orders' | 'profile'
  // Sub-routes: 'club_detail' | 'kit_custom' | 'studio' | 'size' | 'checkout' |
  //             'pay' | 'success' | 'track' | 'order_detail' | 'edit_profile' |
  //             'addresses' | 'settings' | 'help' | 'ar_preview'
  const [currentRoute, setCurrentRoute] = useState('home');
  const [previousRoute, setPreviousRoute] = useState('home');

  // Sub-route contextual state
  const [selectedClub, setSelectedClub] = useState(null);
  const [selectedKit, setSelectedKit] = useState(null);
  const [customKitData, setCustomKitData] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const [arProduct, setArProduct] = useState(null);

  // Show a full-screen spinner only while the first session-restore check is
  // running — not for every login/register attempt (those have in-form state).
  const [bootstrapped, setBootstrapped] = useState(!auth?.isLoading);
  useEffect(() => {
    if (!auth?.isLoading) setBootstrapped(true);
  }, [auth?.isLoading]);

  // Whenever authentication flips to signed-in, drop any stale navigation
  // state and land straight on the dashboard. This is what guarantees that a
  // returning user goes to Home and never to a registration/club/jersey step.
  useEffect(() => {
    if (auth?.isAuthenticated) {
      setAuthRoute('onboarding');
      setRegData({});
      setOtpDemo(false);
      setCurrentRoute('home');
      setPreviousRoute('home');
      setSelectedClub(null);
      setSelectedKit(null);
      setCustomKitData(null);
      setActiveOrderId(null);
      setSelectedOrder(null);
      setCheckoutData(null);
      setArProduct(null);
    }
  }, [auth?.isAuthenticated]);

  const navigateTo = (route) => {
    setPreviousRoute(currentRoute);
    setCurrentRoute(route);
  };

  const goBack = () => {
    setCurrentRoute(previousRoute || 'home');
  };

  // ─── 1. Splash Screen ───────────────────────────────────────────────────────
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // ─── 2. Initial session restore ─────────────────────────────────────────────
  if (!bootstrapped) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // ─── 3. Auth Gate (original Antigravity flow) ──────────────────────────────
  if (!auth.isAuthenticated) {
    const mergeRegData = (patch) => setRegData((prev) => ({ ...prev, ...patch }));

    switch (authRoute) {
      case 'onboarding':
        return <OnboardingScreen onFinish={() => setAuthRoute('phone')} />;

      case 'phone':
        return (
          <PhoneScreen
            auth={auth}
            t={t}
            onBack={() => setAuthRoute('onboarding')}
            onRequestOtp={({ phone, isDemo }) => {
              mergeRegData({ phone });
              setOtpDemo(Boolean(isDemo));
              setAuthRoute('otp');
            }}
            // A successful password login flips auth.isAuthenticated; the
            // effect above then resets navigation straight to Home.
            onPasswordLogin={() => {}}
            // 'Register' link tapped: phone+OTP is the same path for new users.
            // handleProceed() in PhoneScreen sends the OTP; we just need to make
            // sure the OTP path (not password) is active, which the link already
            // ensures before calling handleProceed().
            onRegister={() => {}}
          />
        );

      case 'otp':
        return (
          <OtpScreen
            phone={regData.phone}
            auth={auth}
            t={t}
            isDemo={true}
            onBack={() => setAuthRoute('phone')}
            onVerified={() => setAuthRoute('reg0')}
          />
        );

      case 'reg0':
        return (
          <Reg0PasswordScreen
            initial={regData}
            onBack={() => setAuthRoute('otp')}
            onNext={(data) => {
              mergeRegData(data);
              setAuthRoute('reg1');
            }}
          />
        );

      case 'reg1':
        return (
          <Reg1NameScreen
            initial={regData}
            onBack={() => setAuthRoute('reg0')}
            onNext={(data) => {
              mergeRegData(data);
              setAuthRoute('reg2');
            }}
          />
        );

      case 'reg2':
        return (
          <Reg2MeasurementsScreen
            initial={regData}
            onBack={() => setAuthRoute('reg1')}
            onNext={(data) => {
              mergeRegData(data);
              setAuthRoute('reg3');
            }}
          />
        );

      case 'reg3':
        return (
          <Reg3ClubScreen
            initial={regData}
            onBack={() => setAuthRoute('reg2')}
            onNext={(data) => {
              mergeRegData(data);
              setAuthRoute('reg4');
            }}
          />
        );

      case 'reg4':
        return (
          <Reg4JerseyScreen
            registrationData={regData}
            auth={auth}
            t={t}
            onBack={() => setAuthRoute('reg3')}
            onComplete={() => {
              // register() set auth.isAuthenticated → the effect lands on Home.
              setRegData({});
            }}
          />
        );

      default:
        return <OnboardingScreen onFinish={() => setAuthRoute('phone')} />;
    }
  }

  // ─── 4. Main App Routes ─────────────────────────────────────────────────────
  let content = null;

  switch (currentRoute) {
    case 'home':
      content = (
        <HomeScreen
          auth={auth}
          t={t}
          onNavigate={(route) => navigateTo(route)}
          onOpenClub={(club) => {
            setSelectedClub(club);
            navigateTo('club_detail');
          }}
          onOpenStudio={() => navigateTo('studio')}
          onOpenTrack={(orderId) => {
            setActiveOrderId(orderId);
            navigateTo('track');
          }}
        />
      );
      break;

    case 'catalog':
      content = (
        <CatalogScreen
          store={store}
          t={t}
          onOpenClub={(club) => {
            setSelectedClub(club);
            navigateTo('club_detail');
          }}
          onOpenCustom={() => navigateTo('studio')}
        />
      );
      break;

    case 'club_detail':
      content = (
        <ClubDetailScreen
          club={selectedClub}
          store={store}
          t={t}
          onBack={goBack}
          onCustomize={(club, kit) => {
            if (club) setSelectedClub(club);
            setSelectedKit(kit || club?.kits?.[0] || null);
            navigateTo('kit_custom');
          }}
          onOpenAr={() => {
            const kit = selectedClub?.kits?.[0];
            setArProduct(
              kit
                ? {
                    color: kit.color,
                    trim: kit.trim,
                    ink: kit.ink,
                    pattern: kit.pattern,
                    crest: selectedClub.ini,
                  }
                : null,
            );
            navigateTo('ar_preview');
          }}
          onOpenCart={() => navigateTo('cart')}
        />
      );
      break;

    case 'kit_custom':
      content = (
        <KitCustomScreen
          club={selectedClub}
          kit={selectedKit}
          store={store}
          auth={auth}
          t={t}
          onBack={goBack}
          onOpenCart={() => navigateTo('cart')}
        />
      );
      break;

    case 'studio':
      content = (
        <StudioScreen
          auth={auth}
          store={store}
          t={t}
          onBack={goBack}
          onProceedToSize={(data) => {
            setCustomKitData(data);
            navigateTo('size');
          }}
          onArPreview={(product) => {
            setArProduct(product);
            navigateTo('ar_preview');
          }}
        />
      );
      break;

    case 'size':
      content = (
        <SizeScreen
          designConfig={customKitData}
          store={store}
          auth={auth}
          t={t}
          onBack={goBack}
          onOpenCart={() => navigateTo('cart')}
        />
      );
      break;

    case 'cart':
      content = (
        <CartScreen
          store={store}
          t={t}
          onBack={goBack}
          onProceedToCheckout={(data) => {
            setCheckoutData(data);
            navigateTo('checkout');
          }}
          onNavigate={(route) => navigateTo(route)}
        />
      );
      break;

    case 'checkout':
      content = (
        <CheckoutScreen
          checkoutData={checkoutData}
          store={store}
          auth={auth}
          t={t}
          onBack={goBack}
          onProceedToPay={(order) => {
            setSelectedOrder(order);
            navigateTo('pay');
          }}
          onOrderSuccess={(order) => {
            setSelectedOrder(order);
            navigateTo('success');
          }}
        />
      );
      break;

    case 'pay':
      content = (
        <PayScreen
          order={selectedOrder}
          t={t}
          onBack={goBack}
          onPaymentSuccess={(order) => {
            setSelectedOrder(order);
            navigateTo('success');
          }}
          onChangeMethod={() => navigateTo('checkout')}
        />
      );
      break;

    case 'success':
      content = (
        <SuccessScreen
          order={selectedOrder}
          t={t}
          onTrack={(orderId) => {
            setActiveOrderId(orderId);
            navigateTo('track');
          }}
          onGoHome={() => navigateTo('home')}
        />
      );
      break;

    case 'track':
      content = (
        <TrackScreen
          orderId={activeOrderId}
          t={t}
          onBack={goBack}
          onCancelOrder={() => navigateTo('orders')}
        />
      );
      break;

    case 'orders':
      content = (
        <OrdersScreen
          t={t}
          onOpenOrder={(order) => {
            setSelectedOrder(order);
            navigateTo('order_detail');
          }}
          onOpenTrack={(orderId) => {
            setActiveOrderId(orderId);
            navigateTo('track');
          }}
          onBack={previousRoute !== 'orders' ? goBack : undefined}
        />
      );
      break;

    case 'order_detail':
      content = (
        <OrderDetailScreen
          order={selectedOrder}
          store={store}
          t={t}
          onBack={goBack}
          onTrack={(orderId) => {
            setActiveOrderId(orderId);
            navigateTo('track');
          }}
          onReOrder={() => navigateTo('cart')}
        />
      );
      break;

    case 'profile':
      content = (
        <ProfileScreen
          auth={auth}
          t={t}
          onNavigate={(route) => navigateTo(route)}
          onEditProfile={() => navigateTo('edit_profile')}
          onAddresses={() => navigateTo('addresses')}
          onSettings={() => navigateTo('settings')}
          onOrders={() => navigateTo('orders')}
          onHelp={() => navigateTo('help')}
        />
      );
      break;

    case 'edit_profile':
      content = (
        <EditProfileScreen
          auth={auth}
          t={t}
          onBack={goBack}
        />
      );
      break;

    case 'addresses':
      content = (
        <AddressesScreen
          t={t}
          onBack={goBack}
        />
      );
      break;

    case 'settings':
      content = (
        <SettingsScreen
          store={store}
          auth={auth}
          t={t}
          onBack={goBack}
        />
      );
      break;

    case 'help':
      content = (
        <HelpScreen
          t={t}
          onBack={goBack}
        />
      );
      break;

    case 'ar_preview':
      content = (
        <ArPreviewScreen
          product={arProduct}
          t={t}
          onBack={goBack}
        />
      );
      break;

    default:
      content = (
        <HomeScreen
          auth={auth}
          t={t}
          onNavigate={(route) => navigateTo(route)}
          onOpenClub={(club) => {
            setSelectedClub(club);
            navigateTo('club_detail');
          }}
          onOpenStudio={() => navigateTo('studio')}
          onOpenTrack={(orderId) => {
            setActiveOrderId(orderId);
            navigateTo('track');
          }}
        />
      );
      break;
  }

  // Hide bottom tabs on sub-screens / modal workflows
  const hideTabsRoutes = [
    'club_detail',
    'kit_custom',
    'studio',
    'size',
    'checkout',
    'pay',
    'success',
    'track',
    'order_detail',
    'edit_profile',
    'addresses',
    'settings',
    'help',
    'ar_preview',
  ];
  const shouldShowTabs = !hideTabsRoutes.includes(currentRoute);

  return (
    <View style={styles.container}>
      {content}
      {shouldShowTabs && (
        <BottomTabs
          active={currentRoute}
          onChange={(tab) => navigateTo(tab)}
          t={t}
          cartCount={store.cart?.length || 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050818',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#050818',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
