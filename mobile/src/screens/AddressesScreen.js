import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AddressModal, ConfirmModal } from '../components/ui/Modals';
import { useToast } from '../components/ui/Toast';
import { colors, radii } from '../constants/theme';
import { api } from '../services/api';

const DEFAULT_ADDRESSES = [
  { id: '1', title: 'Uy', address: 'Toshkent sh., Yunusobod tumani, 4-mavze, 12-uy, 34-xonadon', isDefault: true },
  { id: '2', title: 'Ishxona', address: 'Toshkent sh., Mirobod tumani, Amir Temur ko‘chasi, 107-bino', isDefault: false },
];

export default function AddressesScreen({
  t,
  onBack,
}) {
  const toast = useToast();
  const [addresses, setAddresses] = useState(DEFAULT_ADDRESSES);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const mapAddress = (a, index = 0) => ({
    id: String(a.id ?? index + 1),
    title: a.label || a.title || (index === 0 ? 'Uy' : 'Ishxona'),
    address: [a.address, a.apartment].filter(Boolean).join(', ') || 'Toshkent shahri',
    isDefault: Boolean(a.isDefault),
  });

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const res = await api.addresses.list().catch(() => null);
      if (Array.isArray(res) && res.length > 0) {
        setAddresses(res.map(mapAddress));
      } else {
        setAddresses(DEFAULT_ADDRESSES);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchAddresses() {
      if (cancelled) return;
      await loadAddresses();
    }

    fetchAddresses();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveAddress = async (data) => {
    try {
      if (editingAddress) {
        const updated = await api.addresses.update(Number(editingAddress.id), {
          label: data.title,
          address: data.address,
          isDefault: editingAddress.isDefault,
        });
        setAddresses((prev) =>
          prev.map((a) => (String(a.id) === String(editingAddress.id) ? mapAddress(updated) : a))
        );
        toast.show('Manzil yangilandi', 'success');
      } else {
        const created = await api.addresses.create({
          label: data.title,
          address: data.address,
          isDefault: addresses.length === 0,
        });
        setAddresses((prev) => [...prev, mapAddress(created, prev.length)]);
        toast.show('Yangi manzil qo‘shildi', 'success');
      }
      setModalVisible(false);
      setEditingAddress(null);
    } catch (err) {
      toast.show(err?.message || 'Manzilni saqlashda xatolik', 'error');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.addresses.update(Number(id), { isDefault: true });
      await loadAddresses();
      toast.show('Asosiy manzil belgilandi', 'success');
    } catch (err) {
      toast.show(err?.message || 'Asosiy manzilni o‘rnatishda xatolik', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.addresses.remove(Number(deletingId));
      await loadAddresses();
      setDeletingId(null);
      toast.show('Manzil o‘chirildi', 'info');
    } catch (err) {
      toast.show(err?.message || 'Manzilni o‘chirishda xatolik', 'error');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#F3F5F9" />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Saqlangan manzillar</Text>
          <Text style={styles.sub}>Yetkazib berish nuqtalari</Text>
        </View>
        <Pressable
          onPress={() => {
            setEditingAddress(null);
            setModalVisible(true);
          }}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="plus" size={24} color={colors.accent} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {addresses.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <MaterialCommunityIcons
                    name={item.title === 'Uy' ? 'home-outline' : 'briefcase-outline'}
                    size={20}
                    color={item.isDefault ? colors.accent : colors.teal}
                  />
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>ASOSIY</Text>
                    </View>
                  )}
                </View>

                <View style={styles.headerActions}>
                  <Pressable
                    onPress={() => {
                      setEditingAddress(item);
                      setModalVisible(true);
                    }}
                    hitSlop={8}
                    style={styles.actionBtn}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={18} color="#8D95BD" />
                  </Pressable>
                  <Pressable
                    onPress={() => setDeletingId(item.id)}
                    hitSlop={8}
                    style={styles.actionBtn}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#E8543F" />
                  </Pressable>
                </View>
              </View>

              <Text style={styles.addressText}>{item.address}</Text>

              {!item.isDefault && (
                <Pressable
                  onPress={() => handleSetDefault(item.id)}
                  style={styles.setDefaultBtn}
                >
                  <Text style={styles.setDefaultText}>Asosiy manzil qilish</Text>
                </Pressable>
              )}
            </View>
          ))}

          {/* Add New Button Card */}
          <Pressable
            onPress={() => {
              setEditingAddress(null);
              setModalVisible(true);
            }}
            style={styles.addCard}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={24} color={colors.accent} />
            <Text style={styles.addCardText}>Yangi manzil qo‘shish</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Edit/Create Address Modal */}
      <AddressModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initial={editingAddress ? { title: editingAddress.title, address: editingAddress.address } : null}
        onSave={handleSaveAddress}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        visible={Boolean(deletingId)}
        title="Manzilni o‘chirish"
        message="Haqiqatan ham bu manzilni ro‘yxatdan o‘chirmoqchimisiz?"
        confirmText="O‘chirish"
        confirmColor="#E8543F"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  sub: {
    fontSize: 11,
    color: '#8D95BD',
    marginTop: 2,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 245, 249, 0.12)',
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F3F5F9',
  },
  defaultBadge: {
    backgroundColor: 'rgba(242, 163, 58, 0.15)',
    borderRadius: radii.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(242, 163, 58, 0.35)',
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.accent,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#A9B0D0',
    lineHeight: 18,
  },
  setDefaultBtn: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(243, 245, 249, 0.08)',
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0E1A3F',
    borderRadius: radii.xl,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(242, 163, 58, 0.35)',
    marginTop: 6,
  },
  addCardText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
  },
});
