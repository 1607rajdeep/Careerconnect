import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput as RNTI, TextInputProps } from 'react-native';
import { theme, statusMeta, avatarColor, initials, timeAgo, salaryText } from './theme';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

export function Button({ title, onPress, variant = 'primary', loading, disabled, testID, style, icon }: any) {
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isAccent = variant === 'accent';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isAccent && { backgroundColor: theme.color.accent },
        isSecondary && styles.btnSecondary,
        isGhost && styles.btnGhost,
        (disabled || loading) && { opacity: 0.6 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={isSecondary || isGhost ? theme.color.brand : '#fff'} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={18} color={isSecondary || isGhost ? theme.color.brand : '#fff'} /> : null}
          <Text style={[styles.btnText, (isSecondary || isGhost) && { color: theme.color.brand }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Input({ label, error, testID, right, ...props }: TextInputProps & { label?: string; error?: string; testID?: string; right?: React.ReactNode }) {
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, error ? { borderColor: theme.color.error } : null]}>
        <RNTI
          testID={testID}
          placeholderTextColor={theme.color.onSurfaceTertiary}
          {...props}
          style={[styles.input, props.style as any]}
        />
        {right}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function StatusBadge({ status, testID }: { status: string; testID?: string }) {
  const m = statusMeta[status] || { label: status, bg: theme.color.surfaceTertiary, fg: theme.color.onSurface };
  return (
    <View testID={testID} style={[styles.badge, { backgroundColor: m.bg }]}>
      <Text style={{ color: m.fg, fontSize: 11, fontWeight: '700' }}>{m.label}</Text>
    </View>
  );
}

export function CompanyAvatar({ name, logoUri, size = 48 }: { name: string; logoUri?: string; size?: number }) {
  if (logoUri) {
    return (
      <View style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.color.surfaceTertiary }}>
        <Image source={{ uri: logoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: avatarColor(name), alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.34 }}>{initials(name)}</Text>
    </View>
  );
}

const tagsFrom = (job: any): string[] => {
  const src = (job.requirements || '') as string;
  const parts = src.split(/[.,\n]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 22);
  return parts.slice(0, 3);
};

export function JobCard({ job, onPress, saved, onToggleSave, logoUri, testID, showApply = true }: any) {
  const sal = salaryText(job.salary_min, job.salary_max);
  const isRemote = job.job_type === 'Remote' || /remote/i.test(job.location || '');
  const tags = tagsFrom(job);
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <CompanyAvatar name={job.company_name} logoUri={logoUri} />
        <View style={{ flex: 1 }}>
          <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.jobCompany} numberOfLines={1}>{job.company_name}</Text>
        </View>
        {onToggleSave ? (
          <Pressable testID={`save-${job.id}`} onPress={onToggleSave} hitSlop={10}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? theme.color.brand : theme.color.onSurfaceTertiary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.metaLine}>
        <View style={styles.metaItem}><Ionicons name="location-outline" size={14} color={theme.color.onSurfaceTertiary} /><Text style={styles.metaText} numberOfLines={1}>{job.location}</Text></View>
        {sal ? <View style={styles.metaItem}><Ionicons name="cash-outline" size={14} color={theme.color.onSurfaceTertiary} /><Text style={styles.metaText}>{sal}</Text></View> : null}
        <View style={styles.metaItem}><Ionicons name="time-outline" size={14} color={theme.color.onSurfaceTertiary} /><Text style={styles.metaText}>{job.experience_level}</Text></View>
      </View>

      <View style={styles.chipRow}>
        <View style={[styles.jobTypeChip, isRemote && { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.jobTypeChipText, isRemote && { color: '#16A34A' }]}>{job.job_type}</Text>
        </View>
        {tags.map((t: string, i: number) => (
          <View key={i} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.ago}>{timeAgo(job.created_at)}</Text>
        {showApply ? (
          <View style={styles.applyLink}>
            <Text style={styles.applyText}>View & Apply</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.color.brand} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={40} color={theme.color.brand} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: theme.color.brand,
    paddingVertical: 15, paddingHorizontal: 20, borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center', minHeight: 52,
  },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: theme.color.brand },
  btnGhost: { backgroundColor: 'transparent' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, color: theme.color.onSurface, marginBottom: 6, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: theme.color.border,
    borderRadius: theme.radius.md, paddingHorizontal: 14, minHeight: 52,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: theme.color.onSurface },
  errorText: { color: theme.color.error, fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.pill, alignSelf: 'flex-start' },
  card: {
    backgroundColor: '#fff', borderRadius: theme.radius.lg,
    padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.color.border,
    marginBottom: theme.spacing.md,
  },
  jobTitle: { fontSize: 16, fontWeight: '800', color: theme.color.onSurface },
  jobCompany: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginTop: 2, fontWeight: '600' },
  metaLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: theme.color.onSurfaceSecondary, fontWeight: '500' },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  jobTypeChip: { backgroundColor: theme.color.brandTertiary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.sm },
  jobTypeChipText: { fontSize: 11, color: theme.color.brand, fontWeight: '700' },
  tag: { backgroundColor: theme.color.surfaceTertiary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radius.sm },
  tagText: { fontSize: 11, color: theme.color.onSurfaceSecondary, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.color.divider },
  ago: { fontSize: 12, color: theme.color.onSurfaceTertiary },
  applyLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  applyText: { fontSize: 13, color: theme.color.brand, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxxl, gap: theme.spacing.md },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.color.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: theme.color.onSurface, textAlign: 'center' },
  emptySub: { fontSize: 13, color: theme.color.onSurfaceSecondary, textAlign: 'center' },
});
