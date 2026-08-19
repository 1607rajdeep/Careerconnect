import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api } from '@/src/auth';
import { theme } from '@/src/theme';
import { EmptyState } from '@/src/ui';

export default function EmployerDashboard() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [j, n] = await Promise.all([api('/api/employer/jobs', { token }), api('/api/notifications', { token })]);
      setJobs(j); setUnread(n.filter((x: any) => !x.read).length);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const totalApps = jobs.reduce((s, j) => s + (j.applications_count || 0), 0);

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Welcome back,</Text>
            <Text style={styles.name}>{user?.company_name || user?.full_name}</Text>
          </View>
          <Pressable testID="notif-bell" onPress={() => router.push('/notifications')} style={styles.bell}>
            <Ionicons name="notifications-outline" size={22} color={theme.color.onSurface} />
            {unread > 0 && <View style={styles.dot}><Text style={styles.dotText}>{unread}</Text></View>}
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.color.brand }]}>
            <Text style={styles.statNum}>{activeJobs}</Text>
            <Text style={styles.statLbl}>Active Jobs</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.color.brandPrimary }]}>
            <Text style={styles.statNum}>{totalApps}</Text>
            <Text style={styles.statLbl}>Total Applicants</Text>
          </View>
        </View>

        <Pressable testID="post-job-cta" onPress={() => router.push('/(employer)/post')} style={styles.postCta}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.postCtaText}>Post a New Job</Text>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Job Posts</Text>
          {jobs.length === 0 ? (
            <View style={{ marginTop: 30 }}><EmptyState icon="briefcase-outline" title="No jobs posted yet" subtitle="Post your first job to start receiving applications" /></View>
          ) : jobs.map((j) => (
            <Pressable key={j.id} testID={`emp-job-${j.id}`} onPress={() => router.push(`/(employer)/applicants?jobId=${j.id}&title=${encodeURIComponent(j.title)}`)} style={styles.jobCard}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.jobTitle} numberOfLines={1}>{j.title}</Text>
                  <View style={[styles.statusPill, { backgroundColor: j.status === 'active' ? '#D1FAE5' : theme.color.surfaceTertiary }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: j.status === 'active' ? '#065F46' : theme.color.onSurfaceSecondary }}>{j.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.jobMeta}>{j.location} • {j.job_type}</Text>
                <View style={styles.appsCount}>
                  <Ionicons name="people" size={14} color={theme.color.brandPrimary} />
                  <Text style={styles.appsCountText}>{j.applications_count} applicant{j.applications_count !== 1 ? 's' : ''}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.color.onSurfaceTertiary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.md },
  hello: { fontSize: 14, color: theme.color.onSurfaceSecondary },
  name: { fontSize: 22, fontWeight: '800', color: theme.color.onSurface },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.color.border },
  dot: { position: 'absolute', top: 6, right: 6, backgroundColor: theme.color.error, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  dotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl },
  statCard: { flex: 1, borderRadius: theme.radius.md, padding: theme.spacing.lg },
  statNum: { color: '#fff', fontSize: 26, fontWeight: '800' },
  statLbl: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  postCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.color.brandPrimary, marginHorizontal: theme.spacing.xl, marginTop: theme.spacing.lg, borderRadius: theme.radius.md, paddingVertical: 14 },
  postCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  section: { marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.color.onSurface, marginBottom: theme.spacing.md },
  jobCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.color.border },
  jobTitle: { fontSize: 15, fontWeight: '700', color: theme.color.onSurface, flexShrink: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.pill },
  jobMeta: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginTop: 4 },
  appsCount: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  appsCountText: { fontSize: 12, color: theme.color.brandPrimary, fontWeight: '700' },
});
