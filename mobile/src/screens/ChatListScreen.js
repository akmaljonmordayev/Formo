import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing } from '../constants/theme';
import { Button, Card, Header, Screen } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useConversations } from '../features/chat';
import { api } from '../services/api';
import { errorText } from '../utils/errors';
import { formatRelative, roleLabel } from '../utils/chat';

// Suhbatlar ro'yxati: GET /api/chat/conversations; "Yordamga yozish" — POST {} (operator)
export default function ChatListScreen({ t, onBack, onOpenChat }) {
  const { items, isLoading, error, refresh } = useConversations();
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(null);

  const writeSupport = async () => {
    setOpening(true);
    setOpenError(null);
    try {
      const conversation = await api.chat.open({});
      onOpenChat(conversation.id);
    } catch (err) {
      setOpenError(errorText(err, t));
    } finally {
      setOpening(false);
    }
  };

  return (
    <Screen scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && items.length > 0}
            onRefresh={refresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <Header title={t('chats')} onBack={onBack} />

        <Button disabled={opening} onPress={writeSupport} style={styles.support}>
          {t('writeSupport')}
        </Button>
        {openError ? <Text style={styles.error}>{openError}</Text> : null}

        {error && items.length === 0 ? (
          <ErrorView message={errorText(error, t)} onRetry={refresh} retryLabel={t('retry')} />
        ) : isLoading && items.length === 0 ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="message-text-outline" size={36} color={colors.muted} />
            <Text style={styles.emptyTitle}>{t('chatEmpty')}</Text>
            <Text style={styles.emptyHint}>{t('chatEmptyHint')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <ConversationRow key={item.id} item={item} t={t} onPress={() => onOpenChat(item.id)} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ConversationRow({ item, t, onPress }) {
  const { counterpart, order, lastMessage, unread } = item;
  const name = counterpart?.name || roleLabel(t, counterpart?.role);
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.item}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="headset" size={20} color={colors.accent} />
        </View>
        <View style={styles.body}>
          <View style={styles.topLine}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {lastMessage ? <Text style={styles.time}>{formatRelative(lastMessage.createdAt)}</Text> : null}
          </View>
          <View style={styles.chipLine}>
            <Text style={styles.role}>{roleLabel(t, counterpart?.role)}</Text>
            {order ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{`${t('chatOrder')} ${order.code}`}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.previewLine}>
            <Text style={styles.preview} numberOfLines={1}>
              {lastMessage ? `${lastMessage.mine ? `${t('chatYou')}: ` : ''}${lastMessage.text}` : ''}
            </Text>
            {unread > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingHorizontal: spacing.xl, paddingBottom: 110 },
  support: { marginBottom: spacing.lg },
  error: { color: '#E8543F', fontSize: 12, marginBottom: spacing.md },
  list: { gap: spacing.md },
  item: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.round,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 3 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '800' },
  time: { color: colors.muted, fontSize: 11 },
  chipLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  role: { color: colors.muted, fontSize: 11 },
  chip: { backgroundColor: colors.chip, borderRadius: radii.round, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { color: colors.accent, fontSize: 10, fontWeight: '700' },
  previewLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  preview: { flex: 1, color: colors.muted, fontSize: 12 },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radii.round,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.background, fontSize: 11, fontWeight: '800' },
  emptyBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  emptyHint: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
