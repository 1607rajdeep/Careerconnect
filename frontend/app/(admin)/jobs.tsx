import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api } from '@/src/auth';
import { theme } from '@/src/theme';
import { EmptyState } from '@/src/ui';

export default function AdminJobs() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setJobs(await api('/api/admin/jobs', { token })); }
    catch {} finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (id: string) => {
    try { const r = await api(`/api/admin/jobs/${id}/toggle`, { method: 'POST', token }); setJobs((p) => p.map((j) => j.id === id ? { ...j, status: r.status } : j)); } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>Manage Jobs</Text></View>
      {loading ? <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View> : (
        <FlatList
          data={jobs}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 40 }}
          ListEmptyComponent={<View style={{ marginTop: 40 }}><EmptyState icon="briefcase-outline" title="No jobs" /></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={[styles.pill, { backgroundColor: item.status === 'active' ? '#D1FAE5' : theme.color.surfaceTertiary }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: item.status === 'active' ? '#065F46' : theme.color.onSurfaceSecondary }}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>{item.company_name} • {item.applications_count} applicants</Text>
              </View>
              <Pressable testID={`toggle-job-${item.id}`} onPress={() => toggle(item.id)} hitSlop={8} style={[styles.actionBtn, { backgroundColor: item.status === 'active' ? '#FEE2E2' : '#D1FAE5' }]}>
                <Ionicons name={item.status === 'active' ? 'lock-closed' : 'lock-open'} size={18} color={item.status === 'active' ? theme.color.error : theme.color.success} />
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface },
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.color.border },
  jobTitle: { fontSize: 15, fontWeight: '700', color: theme.color.onSurface, flexShrink: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.pill },
  meta: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginTop: 4 },
  actionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
