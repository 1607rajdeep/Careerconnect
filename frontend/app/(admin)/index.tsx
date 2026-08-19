import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api } from '@/src/auth';
import { theme } from '@/src/theme';

const CARDS = [
  { key: 'seekers', label: 'Job Seekers', icon: 'person', color: '#1E3A8A' },
  { key: 'employers', label: 'Employers', icon: 'business', color: '#0D9488' },
  { key: 'jobs', label: 'Total Jobs', icon: 'briefcase', color: '#1E40AF' },
  { key: 'active_jobs', label: 'Active Jobs', icon: 'checkmark-circle', color: '#10B981' },
  { key: 'applications', label: 'Applications', icon: 'document-text', color: '#F59E0B' },
  { key: 'pending_employers', label: 'Pending', icon: 'time', color: '#EF4444' },
];

export default function AdminOverview() {
  const { user, token, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setStats(await api('/api/admin/stats', { token })); }
    catch {} finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.hello}>Admin Panel</Text>
            <Text style={styles.name}>{user?.full_name}</Text>
          </View>
          <Pressable testID="logout-btn" onPress={logout} hitSlop={10}>
            <Ionicons name="log-out-outline" size={24} color={theme.color.error} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Platform Statistics</Text>
        <View style={styles.grid}>
          {CARDS.map((c) => (
            <View key={c.key} testID={`stat-${c.key}`} style={styles.card}>
              <View style={[styles.iconBox, { backgroundColor: c.color }]}>
                <Ionicons name={c.icon as any} size={20} color="#fff" />
              </View>
              <Text style={styles.statNum}>{stats?.[c.key] ?? 0}</Text>
              <Text style={styles.statLbl}>{c.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xl },
  hello: { fontSize: 14, color: theme.color.onSurfaceSecondary },
  name: { fontSize: 22, fontWeight: '800', color: theme.color.onSurface },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.color.onSurface, marginBottom: theme.spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.color.border },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  statNum: { fontSize: 28, fontWeight: '800', color: theme.color.onSurface },
  statLbl: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginTop: 2 },
});
