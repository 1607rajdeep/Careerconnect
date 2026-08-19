import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api, fileUrl } from '@/src/auth';
import { theme, statusMeta } from '@/src/theme';
import { JobCard, EmptyState } from '@/src/ui';

export default function SeekerHome() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [j, a, s, n] = await Promise.all([
        api('/api/jobs/featured'),
        api('/api/applications/mine', { token }),
        api('/api/saved/ids', { token }),
        api('/api/notifications', { token }),
      ]);
      setJobs(j); setApps(a); setSavedIds(s.ids); setUnread(n.filter((x: any) => !x.read).length);
    } catch {}
    finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleSave = async (id: string) => {
    try {
      const r = await api(`/api/saved/${id}`, { method: 'POST', token });
      setSavedIds((p) => r.saved ? [...p, id] : p.filter((x) => x !== id));
    } catch {}
  };

  const activeCount = apps.filter((a) => !['rejected', 'hired'].includes(a.status)).length;

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Hello,</Text>
            <Text style={styles.name}>{user?.full_name} 👋</Text>
          </View>
          <Pressable testID="notif-bell" onPress={() => router.push('/notifications')} style={styles.bell}>
            <Ionicons name="notifications-outline" size={22} color={theme.color.onSurface} />
            {unread > 0 && <View style={styles.dot}><Text style={styles.dotText}>{unread}</Text></View>}
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.color.brand }]}>
            <Text style={styles.statNum}>{apps.length}</Text>
            <Text style={styles.statLbl}>Applications</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.color.brandPrimary }]}>
            <Text style={styles.statNum}>{activeCount}</Text>
            <Text style={styles.statLbl}>In Progress</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.color.surfaceInverse }]}>
            <Text style={styles.statNum}>{savedIds.length}</Text>
            <Text style={styles.statLbl}>Saved</Text>
          </View>
        </View>

        {apps.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent Applications</Text>
              <Pressable onPress={() => router.push('/(seeker)/applications')}>
                <Text style={styles.link}>See all</Text>
              </Pressable>
            </View>
            {apps.slice(0, 2).map((a) => {
              const m = statusMeta[a.status];
              return (
                <View key={a.id} style={styles.appRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appTitle} numberOfLines={1}>{a.job_title}</Text>
                    <Text style={styles.appCompany}>{a.company_name}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: m.bg }]}>
                    <Text style={{ color: m.fg, fontSize: 11, fontWeight: '700' }}>{m.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Jobs For You</Text>
            <Pressable onPress={() => router.push('/(seeker)/search')}>
              <Text style={styles.link}>Browse</Text>
            </Pressable>
          </View>
          {jobs.length === 0 ? (
            <EmptyState icon="briefcase-outline" title="No jobs yet" subtitle="Check back soon for new opportunities" />
          ) : jobs.map((j) => (
            <JobCard key={j.id} testID={`job-${j.id}`} job={j}
              logoUri={fileUrl(j.company_logo_path, token)}
              saved={savedIds.includes(j.id)}
              onToggleSave={() => toggleSave(j.id)}
              onPress={() => router.push(`/job/${j.id}`)} />
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
  statCard: { flex: 1, borderRadius: theme.radius.md, padding: theme.spacing.md },
  statNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statLbl: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  section: { marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.xl },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.color.onSurface },
  link: { color: theme.color.brandPrimary, fontWeight: '700', fontSize: 13 },
  appRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.color.border },
  appTitle: { fontSize: 14, fontWeight: '700', color: theme.color.onSurface },
  appCompany: { fontSize: 12, color: theme.color.onSurfaceSecondary, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill },
});
