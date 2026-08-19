import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, api } from '@/src/auth';
import { theme } from '@/src/theme';
import { Button, Input } from '@/src/ui';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
const LEVELS = ['Entry', 'Mid', 'Senior', 'Lead'];

export default function PostJob() {
  const router = useRouter();
  const { token } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('Full-time');
  const [level, setLevel] = useState('Mid');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [benefits, setBenefits] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api('/api/categories').then((c) => { setCategories(c); if (c[0]) setCategory(c[0].name); }).catch(() => {}); }, []);

  const reset = () => {
    setTitle(''); setLocation(''); setSalaryMin(''); setSalaryMax('');
    setDescription(''); setRequirements(''); setBenefits('');
  };

  const submit = async () => {
    setErr('');
    if (!title || !category || !location || !description) return setErr('Please fill title, category, location and description');
    setSaving(true);
    try {
      await api('/api/jobs', {
        method: 'POST', token,
        body: JSON.stringify({
          title, category, location, job_type: jobType, experience_level: level,
          salary_min: salaryMin ? parseInt(salaryMin) : null,
          salary_max: salaryMax ? parseInt(salaryMax) : null,
          description, requirements, benefits,
        }),
      });
      reset();
      router.replace('/(employer)/jobs');
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const Pill = ({ label, active, onPress, testID }: any) => (
    <Pressable testID={testID} onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Post a Job</Text>

          <Input testID="job-title" label="Job title" value={title} onChangeText={setTitle} placeholder="e.g. Senior Engineer" />

          <Text style={styles.label}>Category</Text>
          <View style={styles.pillRow}>
            {categories.map((c) => <Pill key={c.id} testID={`cat-${c.name}`} label={c.name} active={category === c.name} onPress={() => setCategory(c.name)} />)}
          </View>

          <Input testID="job-location" label="Location" value={location} onChangeText={setLocation} placeholder="e.g. Remote / New York, NY" />

          <Text style={styles.label}>Job type</Text>
          <View style={styles.pillRow}>
            {JOB_TYPES.map((t) => <Pill key={t} testID={`type-${t}`} label={t} active={jobType === t} onPress={() => setJobType(t)} />)}
          </View>

          <Text style={styles.label}>Experience level</Text>
          <View style={styles.pillRow}>
            {LEVELS.map((l) => <Pill key={l} testID={`level-${l}`} label={l} active={level === l} onPress={() => setLevel(l)} />)}
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}><Input testID="salary-min" label="Salary min ($)" value={salaryMin} onChangeText={setSalaryMin} keyboardType="numeric" placeholder="80000" /></View>
            <View style={{ flex: 1 }}><Input testID="salary-max" label="Salary max ($)" value={salaryMax} onChangeText={setSalaryMax} keyboardType="numeric" placeholder="120000" /></View>
          </View>

          <Input testID="job-desc" label="Description" value={description} onChangeText={setDescription} multiline style={{ height: 100, textAlignVertical: 'top' }} placeholder="Describe the role" />
          <Input testID="job-req" label="Requirements" value={requirements} onChangeText={setRequirements} multiline style={{ height: 80, textAlignVertical: 'top' }} placeholder="Skills and qualifications" />
          <Input testID="job-benefits" label="Benefits" value={benefits} onChangeText={setBenefits} multiline style={{ height: 80, textAlignVertical: 'top' }} placeholder="Perks and benefits" />

          {err ? <Text style={{ color: theme.color.error, marginBottom: 8 }}>{err}</Text> : null}
          <Button testID="publish-job" title="Publish Job" onPress={submit} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface, marginBottom: theme.spacing.lg },
  label: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginBottom: 8, fontWeight: '600' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.color.border },
  pillActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  pillText: { fontSize: 13, fontWeight: '600', color: theme.color.onSurfaceSecondary },
});
