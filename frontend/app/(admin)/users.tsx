import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api, fileUrl } from '@/src/auth';
import { theme } from '@/src/theme';
import { EmptyState } from '@/src/ui';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'job_seeker', label: 'Seekers' },
  { key: 'employer', label: 'Employers' },
];

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const q = filter === 'all' ? '' : `?role=${filter}`;
      const list = await api(`/api/admin/users${q}`, { token });
      setUsers(list.filter((u: any) => u.role !== 'admin'));
    } catch {} finally { setLoading(false); }
  }, [token, filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleActive = async (id: string) => {
    try { const r = await api(`/api/admin/users/${id}/toggle-active`, { method: 'POST', token }); setUsers((p) => p.map((u) => u.id === id ? { ...u, is_active: r.is_active } : u)); } catch {}
  };
  const approve = async (id: string) => {
    try { await api(`/api/admin/users/${id}/approve`, { method: 'POST', token }); setUsers((p) => p.map((u) => u.id === id ? { ...u, is_approved: true } : u)); } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>Manage Users</Text></View>
      <View style={{ height: 56 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map((f) => (
            <Pressable key={f.key} testID={`filter-${f.key}`} onPress={() => setFilter(f.key)} style={[styles.chip, filter === f.key && styles.chipActive]}>
              <Text style={[styles.chipText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View> : (
        <FlatList
          data={users}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: theme.spacing.sm, paddingBottom: 40 }}
          ListEmptyComponent={<View style={{ marginTop: 40 }}><EmptyState icon="people-outline" title="No users" /></View>}
          renderItem={({ item }) => {
            const photo = fileUrl(item.photo_path || item.company_logo_path, token);
            return (
              <View style={styles.card}>
                <View style={styles.avatar}>
                  {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> :
                    <Text style={styles.avatarText}>{(item.full_name || '?')[0].toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.name} numberOfLines={1}>{item.company_name || item.full_name}</Text>
                    {!item.is_active && <View style={styles.deactBadge}><Text style={styles.deactText}>INACTIVE</Text></View>}
                  </View>
                  <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                  <Text style={styles.role}>{item.role === 'job_seeker' ? 'Job Seeker' : 'Employer'}</Text>
                </View>
                <Pressable testID={`toggle-${item.id}`} onPress={() => toggleActive(item.id)} hitSlop={8} style={[styles.actionBtn, { backgroundColor: item.is_active ? '#FEE2E2' : '#D1FAE5' }]}>
                  <Ionicons name={item.is_active ? 'ban' : 'checkmark'} size={18} color={item.is_active ? theme.color.error : theme.color.success} />
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface },
  chipRow: { paddingHorizontal: theme.spacing.xl, gap: 8, alignItems: 'center' },
  chip: { flexShrink: 0, height: 36, paddingHorizontal: 16, borderRadius: theme.radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.color.border, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.color.onSurfaceSecondary },
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.color.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.color.brandTertiary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontSize: 16, fontWeight: '800', color: theme.color.brand },
  name: { fontSize: 15, fontWeight: '700', color: theme.color.onSurface, flexShrink: 1 },
  email: { fontSize: 12, color: theme.color.onSurfaceSecondary, marginTop: 2 },
  role: { fontSize: 11, color: theme.color.brandPrimary, fontWeight: '700', marginTop: 2 },
  deactBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  deactText: { fontSize: 9, fontWeight: '800', color: theme.color.error },
  actionBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
