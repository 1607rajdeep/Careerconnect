import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api, fileUrl } from '@/src/auth';
import { theme } from '@/src/theme';
import { Button } from '@/src/ui';

export default function JobDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [cover, setCover] = useState('');
  const [applying, setApplying] = useState(false);
  const [err, setErr] = useState('');

  const isSeeker = user?.role === 'job_seeker';

  const load = useCallback(async () => {
    try {
      const j = await api(`/api/jobs/${id}`);
      setJob(j);
      if (isSeeker) {
        const [s, mine] = await Promise.all([api('/api/saved/ids', { token }), api('/api/applications/mine', { token })]);
        setSaved(s.ids.includes(id));
        setApplied(mine.some((a: any) => a.job_id === id));
      }
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [id, token, isSeeker]);

  useEffect(() => { load(); }, [load]);

  const toggleSave = async () => {
    try { const r = await api(`/api/saved/${id}`, { method: 'POST', token }); setSaved(r.saved); } catch {}
  };

  const submitApply = async () => {
    setApplying(true); setErr('');
    try {
      await api('/api/applications', { method: 'POST', token, body: JSON.stringify({ job_id: id, cover_letter: cover }) });
      setApplied(true); setShowApply(false);
    } catch (e: any) { setErr(e.message); }
    finally { setApplying(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View>;
  if (!job) return <View style={styles.center}><Text>Job not available</Text></View>;

  const logoUri = fileUrl(job.company_logo_path, token);
  const noResume = isSeeker && !user?.resume_path;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.color.onSurface} />
        </Pressable>
        {isSeeker && (
          <Pressable testID="detail-save" onPress={toggleSave} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? theme.color.brandPrimary : theme.color.onSurface} />
          </Pressable>
        )}
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: isSeeker ? 140 : 40 }}>
        <View style={styles.logoBig}>
          {logoUri ? <Image source={{ uri: logoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> :
            <Ionicons name="business" size={32} color={theme.color.brand} />}
        </View>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.company}>{job.company_name}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}><Ionicons name="location-outline" size={16} color={theme.color.onSurfaceSecondary} /><Text style={styles.metaText}>{job.location}</Text></View>
          <View style={styles.metaItem}><Ionicons name="briefcase-outline" size={16} color={theme.color.onSurfaceSecondary} /><Text style={styles.metaText}>{job.job_type}</Text></View>
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>{job.experience_level}</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>{job.category}</Text></View>
          {job.salary_min ? <View style={[styles.badge, { backgroundColor: theme.color.brandTertiary }]}><Text style={[styles.badgeText, { color: theme.color.onBrandTertiary }]}>${(job.salary_min / 1000).toFixed(0)}k - ${(job.salary_max / 1000).toFixed(0)}k</Text></View> : null}
        </View>

        {applied && <View style={styles.appliedBanner}><Ionicons name="checkmark-circle" size={18} color={theme.color.success} /><Text style={styles.appliedText}>You have applied to this job</Text></View>}

        <Section title="Job Description" body={job.description} />
        {job.requirements ? <Section title="Requirements" body={job.requirements} /> : null}
        {job.benefits ? <Section title="Benefits" body={job.benefits} /> : null}
      </ScrollView>

      {isSeeker && (
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="light" style={styles.stickyBar}>
          <SafeAreaView edges={['bottom']} style={{ padding: theme.spacing.lg, paddingTop: theme.spacing.md }}>
            {applied ? (
              <Button testID="already-applied" title="Applied ✓" disabled variant="secondary" onPress={() => {}} />
            ) : job.status !== 'active' ? (
              <Button testID="closed" title="This job is closed" disabled onPress={() => {}} />
            ) : (
              <Button testID="apply-btn" title="Apply Now" onPress={() => setShowApply(true)} />
            )}
          </SafeAreaView>
        </BlurView>
      )}

      {showApply && (
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowApply(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Apply to {job.title}</Text>
            {noResume && <Text style={styles.warn}>{'⚠ You have no resume uploaded. Add one in your profile for a stronger application.'}</Text>}
            <Text style={styles.label}>Cover letter (optional)</Text>
            <TextInput
              testID="cover-input"
              value={cover} onChangeText={setCover}
              placeholder="Why are you a great fit?"
              placeholderTextColor={theme.color.onSurfaceTertiary}
              multiline
              style={styles.coverInput}
            />
            {err ? <Text style={{ color: theme.color.error, marginBottom: 8 }}>{err}</Text> : null}
            <Button testID="submit-apply" title="Submit Application" onPress={submitApply} loading={applying} />
            <Pressable testID="cancel-apply" onPress={() => setShowApply(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: theme.color.onSurfaceSecondary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ marginTop: theme.spacing.xl }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.color.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  logoBig: { width: 64, height: 64, borderRadius: theme.radius.md, backgroundColor: theme.color.brandTertiary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface, marginTop: theme.spacing.md },
  company: { fontSize: 16, color: theme.color.brand, fontWeight: '600', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: theme.spacing.lg, marginTop: theme.spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: theme.color.onSurfaceSecondary },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: theme.spacing.md, flexWrap: 'wrap' },
  badge: { backgroundColor: theme.color.surfaceTertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.pill },
  badgeText: { fontSize: 12, fontWeight: '600', color: theme.color.onSurfaceSecondary },
  appliedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', padding: theme.spacing.md, borderRadius: theme.radius.md, marginTop: theme.spacing.lg },
  appliedText: { color: '#065F46', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: theme.color.onSurface, marginBottom: theme.spacing.sm },
  sectionBody: { fontSize: 14, color: theme.color.onSurfaceSecondary, lineHeight: 22 },
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: theme.color.border, backgroundColor: Platform.OS === 'android' ? '#fff' : 'transparent' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.color.borderStrong, alignSelf: 'center', marginBottom: theme.spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.color.onSurface, marginBottom: theme.spacing.md },
  warn: { fontSize: 12, color: theme.color.warning, backgroundColor: '#FEF3C7', padding: 10, borderRadius: theme.radius.sm, marginBottom: theme.spacing.md },
  label: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginBottom: 8, fontWeight: '600' },
  coverInput: { backgroundColor: theme.color.surfaceSecondary, borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md, padding: 12, fontSize: 14, height: 110, textAlignVertical: 'top', marginBottom: theme.spacing.md, color: theme.color.onSurface },
});
