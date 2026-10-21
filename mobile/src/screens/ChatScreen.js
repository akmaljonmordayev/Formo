import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radii, screenStyles, spacing } from '../constants/theme';
import { Header } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useChatMessages } from '../features/chat';
import { api } from '../services/api';
import { errorText } from '../utils/errors';
import { formatTime, roleLabel } from '../utils/chat';

const MAX_LENGTH = 1000;

/**
 * Suhbat ekrani. conversationId bo'lmasa: orderId bilan buyurtma suhbati,
 * ikkalasi ham yo'q bo'lsa — yordam (operator) suhbati ochiladi.
 * Xabarlarni olish suhbatdosh xabarlarini avtomatik "o'qilgan" qiladi.
 */
export default function ChatScreen({ t, conversationId, orderId, onBack }) {
  const [conversation, setConversation] = useState(null);
  const [openError, setOpenError] = useState(null);
  const [opening, setOpening] = useState(!conversationId);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState('');

  const activeId = conversationId || conversation?.id || null;

  // Suhbat id yo'q bo'lsa — ochamiz (yoki mavjudini olamiz)
  useEffect(() => {
    if (conversationId) {
      setOpening(false);
      return undefined;
    }
    let cancelled = false;
    setOpening(true);
    setOpenError(null);
    api.chat
      .open(orderId ? { orderId } : {})
      .then((data) => {
        if (!cancelled) setConversation(data);
      })
      .catch((err) => {
        if (!cancelled) setOpenError(err);
      })
      .finally(() => {
        if (!cancelled) setOpening(false);
      });
    return () => { cancelled = true; };
  }, [conversationId, orderId, attempt]);

  // Sarlavha uchun suhbatdosh ma'lumoti (id berilgan holatda ro'yxatdan olinadi)
  useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;
    api.chat
      .conversations()
      .then((list) => {
        const found = Array.isArray(list) ? list.find((c) => c.id === conversationId) : null;
        if (!cancelled && found) setConversation(found);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [conversationId]);

  const { messages, isLoading, error, sendError, sending, send, refresh } = useChatMessages(activeId);

  // Inverted ro'yxat: eng yangisi birinchi
  const data = useMemo(() => [...messages].reverse(), [messages]);

  const canSend = draft.trim().length > 0 && !sending && Boolean(activeId);
  const submit = useCallback(async () => {
    if (!canSend) return;
    const ok = await send(draft);
    if (ok) setDraft('');
  }, [canSend, send, draft]);

  const counterpart = conversation?.counterpart;
  const title = counterpart ? counterpart.name || roleLabel(t, counterpart.role) : t('chatSupport');
  const subtitle = conversation?.order ? `${t('chatOrder')} ${conversation.order.code}` : undefined;

  let body;
  if (openError) {
    body = (
      <ErrorView
        message={errorText(openError, t)}
        onRetry={() => setAttempt((n) => n + 1)}
        retryLabel={t('retry')}
      />
    );
  } else if (opening || (isLoading && messages.length === 0 && !error)) {
    body = <LoadingSpinner />;
  } else if (error && messages.length === 0) {
    body = (
      <ErrorView
        message={`${t('chatLoadError')}. ${errorText(error, t)}`}
        onRetry={() => refresh()}
        retryLabel={t('retry')}
      />
    );
  } else {
    body = (
      <FlatList
        data={data}
        inverted
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <Bubble message={item} />}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{t('chatEmpty')}</Text>
            <Text style={styles.emptyHint}>{t('chatEmptyHint')}</Text>
          </View>
        }
      />
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={screenStyles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerWrap}>
          <Header title={title} subtitle={subtitle} onBack={onBack} />
        </View>
        <View style={styles.flex}>{body}</View>

        {sendError ? <Text style={styles.error}>{t('chatSendError')}</Text> : null}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('chatPlaceholder')}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={MAX_LENGTH}
            editable={Boolean(activeId)}
          />
          <Pressable
            onPress={submit}
            disabled={!canSend}
            accessibilityLabel={t('chatSend')}
            style={({ pressed }) => [styles.sendButton, !canSend && styles.sendDisabled, pressed && canSend && styles.pressed]}
          >
            <MaterialCommunityIcons name="send" size={20} color={colors.background} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message }) {
  const mine = Boolean(message.mine);
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.text, mine && styles.textMine]}>{message.text}</Text>
      </View>
      <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerWrap: { paddingTop: 16, paddingHorizontal: spacing.xl },
  listContent: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
  row: { maxWidth: '82%' },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  textMine: { color: colors.background },
  time: { color: colors.muted, fontSize: 10, marginTop: 3 },
  emptyBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, transform: [{ scaleY: -1 }] },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  emptyHint: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  error: { color: '#E8543F', fontSize: 12, textAlign: 'center', paddingVertical: spacing.xs },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.tabBar,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radii.round,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
});
