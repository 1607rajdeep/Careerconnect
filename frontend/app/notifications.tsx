import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api } from '@/src/auth';
import { theme } from '@/src/theme';
import { EmptyState } from '@/src/ui';

const ICONS: Record<string, any> = { new_application: 'person-add', status_update: 'sync-circle' };

export default function Notifications() {
  const router = useRouter();
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setItems(await api('/api/notifications', { token })); }
    catch {} finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (id: string) => {
    setItems((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
    try { await api(`/api/notifications/${id}/read`, { method: 'POST', token }); } catch {}
  };
  const markAll = async () => {
    setItems((p) => p.map((n) => ({ ...n, read: true })));
    try { await api('/api/notifications/read-all', { method: 'POST', token }); } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.color.onSurface} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable testID="mark-all" onPress={markAll} hitSlop={10}>
          <Text style={styles.link}>Read all</Text>
        </Pressable>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 40 }}
          ListEmptyComponent={<View style={{ marginTop: 60 }}><EmptyState icon="notifications-outline" title="You're all caught up!" subtitle="No new notifications" /></View>}
          renderItem={({ item }) => (
            <Pressable testID={`notif-${item.id}`} onPress={() => markRead(item.id)}
              style={[styles.row, !item.read && { backgroundColor: theme.color.brandTertiary }]}>
              <View style={styles.icon}><Ionicons name={ICONS[item.type] || 'notifications'} size={20} color={theme.color.brand} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.body}</Text>
                <Text style={styles.notifDate}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: theme.color.onSurface },
  link: { color: theme.color.brandPrimary, fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', gap: theme.spacing.md, backgroundColor: '#fff', borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.color.surfaceTertiary, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: 14, fontWeight: '700', color: theme.color.onSurface },
  notifBody: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginTop: 2 },
  notifDate: { fontSize: 11, color: theme.color.onSurfaceTertiary, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.brandPrimary },
});
