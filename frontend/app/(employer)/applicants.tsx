import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, ScrollView, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api, fileUrl, API_URL } from '@/src/auth';
import { theme, statusMeta } from '@/src/theme';
import { EmptyState, StatusBadge } from '@/src/ui';

const STAGES = ['all', 'applied', 'under_review', 'shortlisted', 'rejected', 'hired'];
const STAGE_LABELS: Record<string, string> = { all: 'All', applied: 'New', under_review: 'Review', shortlisted: 'Shortlisted', rejected: 'Rejected', hired: 'Hired' };
const NEXT_ACTIONS = ['under_review', 'shortlisted', 'hired', 'rejected'];

export default function Applicants() {
  const { jobId, title } = useLocalSearchParams<{ jobId: string; title: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setApps(await api(`/api/applications/job/${jobId}`, { token })); }
    catch {} finally { setLoading(false); }
  }, [jobId, token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setStatus = async (appId: string, status: string) => {
    try {
      await api(`/api/applications/${appId}/status`, { method: 'PUT', token, body: JSON.stringify({ status }) });
      setApps((p) => p.map((a) => a.id === appId ? { ...a, status } : a));
      setOpenId(null);
    } catch {}
  };

  const viewResume = (path: string) => {
    const url = `${API_URL}/api/files/${path}?token=${encodeURIComponent(token || '')}`;
    Linking.openURL(url);
  };

  const filtered = stage === 'all' ? apps : apps.filter((a) => a.status === stage);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.color.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{title || 'Applicants'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ height: 56 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STAGES.map((s) => {
            const count = s === 'all' ? apps.length : apps.filter((a) => a.status === s).length;
            return (
              <Pressable key={s} testID={`stage-${s}`} onPress={() => setStage(s)} style={[styles.chip, stage === s && styles.chipActive]}>
                <Text style={[styles.chipText, stage === s && { color: '#fff' }]}>{STAGE_LABELS[s]} ({count})</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View> : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: theme.spacing.sm, paddingBottom: 40 }}
          ListEmptyComponent={<View style={{ marginTop: 40 }}><EmptyState icon="people-outline" title="No applicants" subtitle="Candidates will appear here" /></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <View style={styles.avatar}>
                  {item.seeker_photo_path ? <Image source={{ uri: fileUrl(item.seeker_photo_path, token) }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> :
                    <Text style={styles.avatarText}>{(item.seeker_name || '?')[0].toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.candName}>{item.seeker_name}</Text>
                  <Text style={styles.candEmail}>{item.seeker_email}</Text>
                </View>
                <StatusBadge status={item.status} testID={`cand-status-${item.id}`} />
              </View>
              {item.cover_letter ? <Text style={styles.cover} numberOfLines={3}>{item.cover_letter}</Text> : null}
              <View style={styles.actionRow}>
                {item.seeker_resume_path ? (
                  <Pressable testID={`resume-${item.id}`} onPress={() => viewResume(item.seeker_resume_path)} style={styles.resumeBtn}>
                    <Ionicons name="document-text-outline" size={16} color={theme.color.brand} />
                    <Text style={styles.resumeText}>Resume</Text>
                  </Pressable>
                ) : <View style={styles.noResume}><Text style={styles.noResumeText}>No resume</Text></View>}
                <Pressable testID={`change-status-${item.id}`} onPress={() => setOpenId(openId === item.id ? null : item.id)} style={styles.statusBtn}>
                  <Text style={styles.statusBtnText}>Update Status</Text>
                  <Ionicons name={openId === item.id ? 'chevron-up' : 'chevron-down'} size={16} color="#fff" />
                </Pressable>
              </View>
              {openId === item.id && (
                <View style={styles.statusOptions}>
                  {NEXT_ACTIONS.map((s) => (
                    <Pressable key={s} testID={`set-${s}-${item.id}`} onPress={() => setStatus(item.id, s)} style={[styles.statusOpt, { backgroundColor: statusMeta[s].bg }]}>
                      <Text style={{ color: statusMeta[s].fg, fontWeight: '700', fontSize: 12 }}>{statusMeta[s].label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md },
  title: { fontSize: 18, fontWeight: '800', color: theme.color.onSurface, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  chipRow: { paddingHorizontal: theme.spacing.xl, gap: 8, alignItems: 'center' },
  chip: { flexShrink: 0, height: 36, paddingHorizontal: 14, borderRadius: theme.radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.color.border, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.color.onSurfaceSecondary },
  card: { backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.color.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.color.brandTertiary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontSize: 18, fontWeight: '800', color: theme.color.brand },
  candName: { fontSize: 15, fontWeight: '700', color: theme.color.onSurface },
  candEmail: { fontSize: 12, color: theme.color.onSurfaceSecondary, marginTop: 2 },
  cover: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginTop: theme.spacing.md, lineHeight: 19, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md, alignItems: 'center' },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.color.surfaceSecondary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border },
  resumeText: { color: theme.color.brand, fontWeight: '700', fontSize: 13 },
  noResume: { paddingHorizontal: 14, paddingVertical: 10 },
  noResumeText: { color: theme.color.onSurfaceTertiary, fontSize: 12 },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: theme.color.brandPrimary, paddingVertical: 10, borderRadius: theme.radius.md },
  statusBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md },
  statusOpt: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radius.pill },
});
