import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ConfirmModal } from '../components/ui/Modals';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';
import { formatUzPhone } from '../utils/phone';

export default function ProfileScreen({
  auth,
  t,
  onNavigate,
  onEditProfile,
  onAddresses,
  onSettings,
  onOrders,
  onHelp,
}) {
  const toast = useToast();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Refresh user data from server when profile screen opens
  useEffect(() => {
    if (auth?.isAuthenticated && auth?.refreshUser) {
      auth.refreshUser().catch(() => null);
    }
  }, [auth?.isAuthenticated]);

  const user = auth?.user || {};
  const name = user.fullName || 'Mehmon Foydalanuvchi';
  const phone = user.phone ? formatUzPhone(user.phone) : '+998 90 000-00-00';
  const avatarInitial = (user.fullName || 'F')[0].toUpperCase();

  const handleShareApp = () => {
    toast.show('Ulashish havolasi nusxalandi: https://formo.uz', 'success');
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    auth?.logout?.();
    toast.show('Tizimdan chiqildi', 'info');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Profil</Text>
        <Pressable onPress={onSettings} hitSlop={10} style={styles.iconBtn}>
          <MaterialCommunityIcons name="cog-outline" size={22} color="#F3F5F9" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.userPhone}>{phone}</Text>
            <Text style={styles.memberBadge}>Formo Club a‘zosi</Text>
          </View>
          <Pressable onPress={onEditProfile} hitSlop={8} style={styles.editBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.accent} />
          </Pressable>
        </View>

        {/* Stats Chips */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="gender-male-female" size={18} color={colors.teal} />
            <Text style={styles.statVal}>{user.gender === 'FEMALE' ? 'Ayol' : 'Erkak'}</Text>
            <Text style={styles.statLabel}>Jinsi</Text>
          </View>

          <View style={styles.statChip}>
            <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.accent} />
            <Text style={styles.statVal}>{user.age ? `${user.age}` : '—'}</Text>
            <Text style={styles.statLabel}>Yoshi</Text>
          </View>

          <View style={styles.statChip}>
            <MaterialCommunityIcons name="human-male" size={18} color={colors.teal} />
            <Text style={styles.statVal}>{user.height ? `${user.height} sm` : '—'}</Text>
            <Text style={styles.statLabel}>Bo‘yi</Text>
          </View>

          <View style={styles.statChip}>
            <MaterialCommunityIcons name="weight-kilogram" size={18} color={colors.accent} />
            <Text style={styles.statVal}>{user.weight ? `${user.weight} kg` : '—'}</Text>
            <Text style={styles.statLabel}>Vazni</Text>
          </View>
        </View>

        {/* Menu Section 1 */}
        <View style={styles.menuGroup}>
          <MenuItem
            icon="account-edit-outline"
            iconColor={colors.accent}
            title="Mening ma‘lumotlarim"
            sub="Ism, yosh, bo‘y va vazn ko‘rsatkichlari"
            onPress={onEditProfile}
          />
          <MenuItem
            icon="map-marker-radius-outline"
            iconColor={colors.teal}
            title="Saqlangan manzillar"
            sub="Yetkazib berish manzillari"
            onPress={onAddresses}
          />
          <MenuItem
            icon="clipboard-list-outline"
            iconColor={colors.accent}
            title="Mening buyurtmalarim"
            sub="Barcha buyurtmalar va kuzatuv"
            onPress={onOrders}
            last
          />
        </View>

        {/* Menu Section 2 */}
        <View style={styles.menuGroup}>
          <MenuItem
            icon="cog-outline"
            iconColor="#8D95BD"
            title="Sozlamalar"
            sub="Bildirishnomalar va til"
            onPress={onSettings}
          />
          <MenuItem
            icon="help-circle-outline"
            iconColor={colors.teal}
            title="Yordam va FAQ"
            sub="Ko‘p beriladigan savollar va qo‘llab-quvvatlash"
            onPress={onHelp}
          />
          <MenuItem
            icon="share-variant-outline"
            iconColor={colors.accent}
            title="Ilovani ulashish"
            sub="Do‘stlarga tavsiya qilish"
            onPress={handleShareApp}
            last
          />
        </View>

        {/* Logout Button */}
        <Pressable onPress={() => setShowLogoutModal(true)} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={20} color="#E8543F" />
          <Text style={styles.logoutBtnText}>Tizimdan chiqish</Text>
        </Pressable>

        <Text style={styles.versionText}>Formo Mobile v1.0.0 (Expo 57)</Text>
      </ScrollView>

      {/* Logout confirm modal */}
      <ConfirmModal
        visible={showLogoutModal}
        title="Tizimdan chiqish"
        message="Haqiqatan ham o‘z hisobingizdan chiqmoqchimisiz?"
        confirmText="Chiqish"
        confirmColor="#E8543F"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </SafeAreaView>
  );
}

function MenuItem({ icon, iconColor, title, sub, onPress, last }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.menuItem, last && { borderBottomWidth: 0 }]}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(243, 245, 249, 0.05)' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        {Boolean(sub) && <Text style={styles.menuSub}>{sub}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color="#6F77A0" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050818',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F3F5F9',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: '#0E1A3F',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 16,
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '900',
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  userPhone: {
    fontSize: 12,
    color: '#8D95BD',
    marginTop: 3,
  },
  memberBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.teal,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#121A42',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.3)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#0E1A3F',
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.08)',
    gap: 2,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F3F5F9',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#8D95BD',
  },
  menuGroup: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 245, 249, 0.08)',
    gap: 12,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F3F5F9',
  },
  menuSub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(232, 84, 63, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 84, 63, 0.35)',
    borderRadius: radii.md,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E8543F',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#6F77A0',
    marginBottom: 16,
  },
});
