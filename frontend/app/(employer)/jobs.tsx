import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api } from '@/src/auth';
import { theme } from '@/src/theme';
import { EmptyState } from '@/src/ui';

export default function EmployerJobs() {
  const router = useRouter();
  const { token } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setJobs(await api('/api/employer/jobs', { token })); }
    catch {} finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const closeJob = async (id: string) => {
    setMenuFor(null);
    try { await api(`/api/jobs/${id}/close`, { method: 'POST', token }); load(); } catch {}
  };
  const deleteJob = async (id: string) => {
    setMenuFor(null);
    try { await api(`/api/jobs/${id}`, { method: 'DELETE', token }); setJobs((p) => p.filter((j) => j.id !== id)); } catch {}
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Jobs</Text>
        <Pressable testID="new-job" onPress={() => router.push('/(employer)/post')} style={styles.addBtn}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>
      <FlatList
        data={jobs}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 40 }}
        ListEmptyComponent={<View style={{ marginTop: 60 }}><EmptyState icon="briefcase-outline" title="No jobs posted" subtitle="Tap + to post your first job" /></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable testID={`job-${item.id}`} onPress={() => router.push(`/(employer)/applicants?jobId=${item.id}&title=${encodeURIComponent(item.title)}`)} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.statusPill, { backgroundColor: item.status === 'active' ? '#D1FAE5' : theme.color.surfaceTertiary }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: item.status === 'active' ? '#065F46' : theme.color.onSurfaceSecondary }}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.jobMeta}>{item.location} • {item.job_type}</Text>
              <View style={styles.appsRow}>
                <Ionicons name="people" size={14} color={theme.color.brand} />
                <Text style={styles.appsText}>{item.applications_count} applicant{item.applications_count !== 1 ? 's' : ''}</Text>
              </View>
            </Pressable>
            <Pressable testID={`menu-${item.id}`} onPress={() => setMenuFor(menuFor === item.id ? null : item.id)} hitSlop={10} style={styles.menuBtn}>
              <Ionicons name="ellipsis-vertical" size={18} color={theme.color.onSurfaceTertiary} />
            </Pressable>
            {menuFor === item.id && (
              <View style={styles.menu}>
                {item.status === 'active' && (
                  <Pressable testID={`close-${item.id}`} onPress={() => closeJob(item.id)} style={styles.menuItem}>
                    <Ionicons name="lock-closed-outline" size={16} color={theme.color.onSurface} />
                    <Text style={styles.menuText}>Close job</Text>
                  </Pressable>
                )}
                <Pressable testID={`delete-${item.id}`} onPress={() => deleteJob(item.id)} style={styles.menuItem}>
                  <Ionicons name="trash-outline" size={16} color={theme.color.error} />
                  <Text style={[styles.menuText, { color: theme.color.error }]}>Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.color.brand, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.color.border },
  jobTitle: { fontSize: 15, fontWeight: '700', color: theme.color.onSurface, flexShrink: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.pill },
  jobMeta: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginTop: 4 },
  appsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  appsText: { fontSize: 12, color: theme.color.brand, fontWeight: '700' },
  menuBtn: { padding: 4 },
  menu: { position: 'absolute', right: 12, top: 44, backgroundColor: '#fff', borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border, paddingVertical: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 6, zIndex: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  menuText: { fontSize: 13, color: theme.color.onSurface, fontWeight: '600' },
});
