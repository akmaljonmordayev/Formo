import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, screenStyles, spacing, themedStyles } from '../constants/theme';
import { Header } from '../components/ui/Common';
import { KeyboardAvoider } from '../components/ui/KeyboardAware';
import ErrorView from '../components/ui/ErrorView';
import { api } from '../services/api';
import { errorText } from '../utils/errors';

const POLL_MS = 5000;
const MAX_LEN = 1000;

const timeOf = (iso) => {
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === new Date().toDateString()) return hm;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${hm}`;
};

/**
 * Qo'llab-quvvatlash chati: mijoz ↔ operator (GET/POST /api/support/messages).
 * Ekran ochiq va ilova faol bo'lganda har 5 soniyada yangi xabarlar (`after`) so'raladi.
 */
export default function SupportChatScreen({ t, onBack }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const lastIdRef = useRef(0);
  const listRef = useRef(null);
  const mounted = useRef(true);
  const busy = useRef(false);

  const append = useCallback((items) => {
    if (!items?.length) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const fresh = items.filter((m) => !known.has(m.id));
      if (!fresh.length) return prev;
      lastIdRef.current = Math.max(lastIdRef.current, ...fresh.map((m) => m.id));
      return [...prev, ...fresh];
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.support.messages();
      if (!mounted.current) return;
      lastIdRef.current = (res.items || []).reduce((mx, m) => Math.max(mx, m.id), 0);
      setMessages(res.items || []);
    } catch (err) {
      if (mounted.current) setError(err);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const poll = useCallback(async () => {
    // Sekin tarmoqda so'rovlar ustma-ust yig'ilmasin
    if (!mounted.current || busy.current) return;
    busy.current = true;
    try {
      const res = await api.support.messages(lastIdRef.current || undefined);
      if (mounted.current) append(res.items);
    } catch {
      // keyingi poll qayta urinadi
    } finally {
      busy.current = false;
    }
  }, [append]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  // Faqat ilova oldingi planda bo'lganda polling (fon rejimida batareya/tarmoq sarflanmaydi)
  useEffect(() => {
    let timer = null;
    const start = () => {
      if (!timer) timer = setInterval(poll, POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        poll();
        start();
      } else stop();
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [poll]);

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const msg = await api.support.send(value);
      if (!mounted.current) return;
      setText('');
      append([msg]);
    } catch (err) {
      if (mounted.current) setSendError(err);
    } finally {
      if (mounted.current) setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const mine = item.fromWorkshop; // mijoz tomonidan yozilgan
    return (
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {!mine ? <Text style={styles.author}>{t('supportOperator')}</Text> : null}
        <Text style={[styles.text, mine && styles.textMine]}>{item.text}</Text>
        <Text style={[styles.time, mine && styles.timeMine]}>{timeOf(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={screenStyles.safe}>
      <KeyboardAvoider>
        <View style={styles.head}>
          <Header title={t('supportChat')} subtitle={t('supportChatSub')} onBack={onBack} />
        </View>

        {loading && messages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : error && messages.length === 0 ? (
          <View style={styles.center}>
            <ErrorView message={errorText(error, t)} onRetry={load} retryLabel={t('retry')} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.list}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, messages.length === 0 && styles.center]}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews
            initialNumToRender={20}
            windowSize={7}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons name="message-text-outline" size={36} color={colors.muted} />
                <Text style={styles.emptyTitle}>{t('supportEmpty')}</Text>
                <Text style={styles.emptySub}>{t('supportEmptySub')}</Text>
              </View>
            }
          />
        )}

        {sendError ? <Text style={styles.sendError}>{errorText(sendError, t)}</Text> : null}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('supportPlaceholder')}
            placeholderTextColor={colors.muted}
            maxLength={MAX_LEN}
            multiline
            editable={!sending}
          />
          <Pressable
            onPress={send}
            disabled={sending || !text.trim()}
            style={[styles.sendBtn, (sending || !text.trim()) && styles.sendBtnOff]}
            accessibilityRole="button"
            accessibilityLabel={t('supportSend')}
            hitSlop={6}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color={colors.primaryDark} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  head: { paddingHorizontal: spacing.lg, paddingTop: 12 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 8 },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.lg || 14 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  author: { color: colors.teal, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  text: { color: colors.text, fontSize: 15, lineHeight: 20 },
  textMine: { color: colors.primaryDark },
  time: { color: colors.muted, fontSize: 10, alignSelf: 'flex-end', marginTop: 2 },
  timeMine: { color: 'rgba(8,12,36,0.65)' },
  empty: { alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  sendError: { color: colors.danger, fontSize: 12, paddingHorizontal: spacing.lg, paddingBottom: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.45 },
}));
