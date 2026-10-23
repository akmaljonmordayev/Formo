import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../constants/theme';

const ToastContext = createContext({
  show: () => {},
  hide: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;
  const timerRef = useRef(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -24, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (message, type = 'info', duration = 2800) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ message, type });

      opacity.setValue(0);
      translateY.setValue(-24);

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(hide, duration);
    },
    [hide, opacity, translateY]
  );

  const getStyle = () => {
    switch (toast?.type) {
      case 'success':
        return {
          bg: '#0E2422',
          border: '#19A7A1',
          icon: 'check-circle-outline',
          iconColor: '#19A7A1',
        };
      case 'error':
        return {
          bg: '#240F18',
          border: '#B8323F',
          icon: 'alert-circle-outline',
          iconColor: '#E8543F',
        };
      case 'demo':
        return {
          bg: '#251E12',
          border: '#F2A33A',
          icon: 'shield-alert-outline',
          iconColor: '#F2A33A',
        };
      default:
        return {
          bg: '#121A42',
          border: '#2A3674',
          icon: 'information-outline',
          iconColor: '#8D95BD',
        };
    }
  };

  const currentStyle = getStyle();
  // Barqaror qiymat: toast ko'rinishi useToast() ishlatgan ekranlarni qayta chizmasin
  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.container,
            {
              top: Math.max(insets.top + 10, 20),
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={[
              styles.box,
              {
                backgroundColor: currentStyle.bg,
                borderColor: currentStyle.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={currentStyle.icon}
              size={20}
              color={currentStyle.iconColor}
              style={styles.icon}
            />
            <Text style={styles.text} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 99999,
    alignItems: 'center',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    maxWidth: 420,
    width: '100%',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    flex: 1,
    color: '#F3F5F9',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
