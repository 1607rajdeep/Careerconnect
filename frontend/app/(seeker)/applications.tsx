import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api } from '@/src/auth';
import { theme, statusMeta } from '@/src/theme';
import { EmptyState, StatusBadge } from '@/src/ui';

export default function Applications() {
  const router = useRouter();
  const { token } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setApps(await api('/api/applications/mine', { token })); }
    catch {} finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>My Applications</Text></View>
      <FlatList
        data={apps}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={{ marginTop: 60 }}>
            <EmptyState icon="document-text-outline" title="No applications yet" subtitle="Start applying to jobs to track them here" />
            <Pressable testID="browse-jobs" onPress={() => router.push('/(seeker)/search')} style={styles.browseBtn}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Browse Jobs</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const m = statusMeta[item.status];
          return (
            <Pressable testID={`app-${item.id}`} onPress={() => router.push(`/job/${item.job_id}`)} style={styles.card}>
              <View style={styles.timeline}>
                <View style={[styles.dot, { backgroundColor: m.fg }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle} numberOfLines={1}>{item.job_title}</Text>
                <Text style={styles.company}>{item.company_name}</Text>
                <Text style={styles.date}>Applied {new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <StatusBadge status={item.status} testID={`status-${item.id}`} />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.color.border },
  timeline: { width: 20, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: theme.color.onSurface },
  company: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginTop: 2 },
  date: { fontSize: 11, color: theme.color.onSurfaceTertiary, marginTop: 4 },
  browseBtn: { backgroundColor: theme.color.brandPrimary, marginHorizontal: 40, borderRadius: theme.radius.md, paddingVertical: 14, alignItems: 'center', marginTop: theme.spacing.lg },
});
