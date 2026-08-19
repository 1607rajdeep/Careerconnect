import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, Role } from '@/src/auth';
import { theme } from '@/src/theme';
import { Button, Input } from '@/src/ui';

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [role, setRole] = useState<Role>('job_seeker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr('');
    if (!email || !password || !name) return setErr('Please fill all required fields');
    if (role === 'employer' && !company) return setErr('Company name is required');
    if (password.length < 6) return setErr('Password must be at least 6 characters');
    setLoading(true);
    try {
      const u = await register({ email: email.trim(), password, full_name: name, role, company_name: company || undefined });
      if (u.role === 'job_seeker') router.replace('/(seeker)');
      else router.replace('/(employer)');
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={[theme.color.brand, theme.color.brandDark]} style={styles.hero}>
            <SafeAreaView edges={['top']}>
              <Pressable testID="back-btn" onPress={() => router.replace('/')} hitSlop={12} style={{ marginBottom: theme.spacing.lg }}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </Pressable>
              <View style={styles.brandRow}>
                <View style={styles.logoBox}><Ionicons name="briefcase" size={18} color={theme.color.accent} /></View>
                <Text style={styles.brandName}>CareerConnect</Text>
              </View>
              <Text style={styles.heroTitle}>Create your{'\n'}free account</Text>
              <Text style={styles.heroSub}>Join thousands of professionals building their careers.</Text>
            </SafeAreaView>
          </LinearGradient>

          <View style={styles.body}>
            <View style={styles.segment}>
              <Pressable testID="tab-signin" onPress={() => router.replace('/auth/login')} style={styles.segBtn}>
                <Text style={styles.segText}>Sign In</Text>
              </Pressable>
              <Pressable testID="tab-register" style={[styles.segBtn, styles.segBtnActive]}>
                <Text style={[styles.segText, { color: '#fff' }]}>Create Account</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>I am a</Text>
            <View style={styles.roleRow}>
              {([['job_seeker', 'Job Seeker', 'person'], ['employer', 'Employer', 'business']] as const).map(([r, label, icon]) => (
                <Pressable key={r} testID={`role-${r}`} onPress={() => setRole(r as Role)}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}>
                  <Ionicons name={icon as any} size={16} color={role === r ? theme.color.brand : theme.color.onSurfaceTertiary} />
                  <Text style={[styles.roleText, role === r && { color: theme.color.brand }]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ marginTop: theme.spacing.lg }}>
              <Input testID="reg-name" label="Full name" value={name} onChangeText={setName} placeholder="Jane Doe" />
              {role === 'employer' && <Input testID="reg-company" label="Company name" value={company} onChangeText={setCompany} placeholder="Acme Inc." />}
              <Input testID="reg-email" label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@company.com" />
              <Input testID="reg-password" label="Password" value={password} onChangeText={setPassword} secureTextEntry={!show} placeholder="At least 6 characters"
                right={<Pressable testID="toggle-pass" onPress={() => setShow((s) => !s)} hitSlop={10}><Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={theme.color.onSurfaceTertiary} /></Pressable>} />
              {err ? <Text style={{ color: theme.color.error, marginBottom: 8 }}>{err}</Text> : null}
              <Button testID="reg-submit" title="Create Account" onPress={submit} loading={loading} />
            </View>

            <Text style={styles.switchLine}>
              Already have an account?{' '}
              <Text testID="go-login" onPress={() => router.replace('/auth/login')} style={{ color: theme.color.brand, fontWeight: '800' }}>Sign In</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  brandName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: theme.spacing.lg, lineHeight: 32 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: theme.spacing.sm, lineHeight: 20 },
  body: { padding: theme.spacing.xl, marginTop: -theme.spacing.lg, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  segment: { flexDirection: 'row', backgroundColor: theme.color.surfaceTertiary, borderRadius: theme.radius.md, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: theme.radius.sm },
  segBtnActive: { backgroundColor: theme.color.brand },
  segText: { fontWeight: '700', color: theme.color.onSurfaceSecondary, fontSize: 14 },
  label: { fontSize: 13, color: theme.color.onSurface, marginTop: theme.spacing.lg, marginBottom: 8, fontWeight: '700' },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.color.border, backgroundColor: '#fff' },
  roleBtnActive: { borderColor: theme.color.brand, backgroundColor: theme.color.brandTertiary },
  roleText: { fontWeight: '700', color: theme.color.onSurfaceSecondary, fontSize: 14 },
  switchLine: { textAlign: 'center', color: theme.color.onSurfaceSecondary, marginTop: theme.spacing.lg, fontSize: 14 },
});
