import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api, fileUrl } from '@/src/auth';
import { theme } from '@/src/theme';
import { JobCard, EmptyState } from '@/src/ui';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
const LEVELS = ['Entry', 'Mid', 'Senior', 'Lead'];

export default function Search() {
  const router = useRouter();
  const { token } = useAuth();
  const [q, setQ] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (activeCat) params.set('category', activeCat);
      if (activeType) params.set('job_type', activeType);
      if (activeLevel) params.set('experience_level', activeLevel);
      const [j, s] = await Promise.all([
        api(`/api/jobs?${params.toString()}`),
        api('/api/saved/ids', { token }),
      ]);
      setJobs(j); setSavedIds(s.ids);
    } catch {}
    finally { setLoading(false); }
  }, [q, activeCat, activeType, activeLevel, token]);

  useEffect(() => {
    api('/api/categories').then(setCategories).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { search(); }, [activeCat, activeType, activeLevel]));

  const toggleSave = async (id: string) => {
    try {
      const r = await api(`/api/saved/${id}`, { method: 'POST', token });
      setSavedIds((p) => r.saved ? [...p, id] : p.filter((x) => x !== id));
    } catch {}
  };

  const Chip = ({ label, active, onPress, testID }: any) => (
    <Pressable testID={testID} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Jobs</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={theme.color.onSurfaceTertiary} />
          <TextInput
            testID="search-input"
            placeholder="Job title, company, keyword"
            placeholderTextColor={theme.color.onSurfaceTertiary}
            value={q} onChangeText={setQ} onSubmitEditing={search} returnKeyType="search"
            style={{ flex: 1, fontSize: 15, color: theme.color.onSurface }}
          />
          {q ? <Pressable testID="clear-q" onPress={() => { setQ(''); }}><Ionicons name="close-circle" size={18} color={theme.color.onSurfaceTertiary} /></Pressable> : null}
        </View>
      </View>

      <View style={{ height: 48 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip testID="cat-all" label="All" active={!activeCat} onPress={() => setActiveCat(null)} />
          {categories.map((c) => (
            <Chip key={c.id} testID={`cat-${c.name}`} label={c.name} active={activeCat === c.name} onPress={() => setActiveCat(activeCat === c.name ? null : c.name)} />
          ))}
        </ScrollView>
      </View>
      <View style={{ height: 48 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {JOB_TYPES.map((t) => (
            <Chip key={t} testID={`type-${t}`} label={t} active={activeType === t} onPress={() => setActiveType(activeType === t ? null : t)} />
          ))}
          {LEVELS.map((l) => (
            <Chip key={l} testID={`level-${l}`} label={l} active={activeLevel === l} onPress={() => setActiveLevel(activeLevel === l ? null : l)} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: 40 }}
          ListEmptyComponent={<EmptyState icon="search-outline" title="No jobs found" subtitle="Try adjusting your filters" />}
          renderItem={({ item }) => (
            <JobCard testID={`job-${item.id}`} job={item}
              logoUri={fileUrl(item.company_logo_path, token)}
              saved={savedIds.includes(item.id)}
              onToggleSave={() => toggleSave(item.id)}
              onPress={() => router.push(`/job/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface, marginBottom: theme.spacing.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: theme.color.border },
  chipRow: { paddingHorizontal: theme.spacing.xl, gap: 8, alignItems: 'center' },
  chip: { flexShrink: 0, height: 36, paddingHorizontal: 14, borderRadius: theme.radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.color.border, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.color.onSurfaceSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
