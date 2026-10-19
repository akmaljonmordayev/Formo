import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '../constants/theme';
import { Card, Header, Screen } from '../components/ui/Common';
import ErrorView from '../components/ui/ErrorView';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import useNotifications from '../features/notifications';
import { errorText } from '../utils/errors';
import { formatDate } from '../utils/formatters';

// Bildirishnomalar: GET /api/notifications (Superadmin "Kampaniyalar" push xabarlari)
export default function NotificationsScreen({ t, onBack }) {
  const { items, isLoading, error, refetch } = useNotifications();

  return (
    <Screen scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && items.length > 0}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <Header title={t('notifications')} onBack={onBack} />
        {error && items.length === 0 ? (
          <ErrorView message={errorText(error, t)} onRetry={refetch} retryLabel={t('retry')} />
        ) : isLoading && items.length === 0 ? (
          <LoadingSpinner />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>{t('noNotifications')}</Text>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <Card key={item.id} style={styles.item}>
                <MaterialCommunityIcons name="bell-outline" size={20} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.date}>{formatDate(item.sentAt)}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingHorizontal: spacing.xl, paddingBottom: 110 },
  list: { gap: spacing.md },
  item: { flexDirection: 'row', gap: spacing.md },
  title: { color: colors.text, fontSize: 14, fontWeight: '800' },
  message: { color: '#D5DAF2', fontSize: 12, lineHeight: 18, marginTop: 4 },
  date: { color: colors.muted, fontSize: 10, marginTop: 6 },
  empty: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.xl },
});
