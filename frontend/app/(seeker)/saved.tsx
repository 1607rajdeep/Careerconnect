import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, api, fileUrl } from '@/src/auth';
import { theme } from '@/src/theme';
import { JobCard, EmptyState } from '@/src/ui';

export default function Saved() {
  const router = useRouter();
  const { token } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setJobs(await api('/api/saved', { token })); }
    catch {} finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = async (id: string) => {
    try { await api(`/api/saved/${id}`, { method: 'POST', token }); setJobs((p) => p.filter((j) => j.id !== id)); } catch {}
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>Saved Jobs</Text></View>
      <FlatList
        data={jobs}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 40 }}
        ListEmptyComponent={<View style={{ marginTop: 60 }}><EmptyState icon="bookmark-outline" title="No saved jobs yet" subtitle="Bookmark jobs to view them here later" /></View>}
        renderItem={({ item }) => (
          <JobCard testID={`saved-${item.id}`} job={item}
            logoUri={fileUrl(item.company_logo_path, token)}
            saved onToggleSave={() => remove(item.id)}
            onPress={() => router.push(`/job/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface },
});
