import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, Role } from '@/src/auth';
import { theme } from '@/src/theme';
import { Button, Input } from '@/src/ui';

const DEMO = [
  { role: 'Job Seeker', email: 'seeker@careerconnect.com', password: 'Seeker123!' },
  { role: 'Employer', email: 'employer@careerconnect.com', password: 'Employer123!' },
  { role: 'Admin', email: 'admin@careerconnect.com', password: 'Admin123!' },
];

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [roleTab, setRoleTab] = useState<Role>('job_seeker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(''); setLoading(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role === 'job_seeker') router.replace('/(seeker)');
      else if (u.role === 'employer') router.replace('/(employer)');
      else router.replace('/(admin)');
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const applyDemo = (d: typeof DEMO[0]) => { setEmail(d.email); setPassword(d.password); setErr(''); };

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
              <Text style={styles.heroTitle}>Your Next Career{'\n'}Opportunity Awaits</Text>
              <Text style={styles.heroSub}>Join the fastest-growing job portal. Discover opportunities that match your skills.</Text>
            </SafeAreaView>
          </LinearGradient>

          <View style={styles.body}>
            <View style={styles.segment}>
              <Pressable testID="tab-signin" style={[styles.segBtn, styles.segBtnActive]}>
                <Text style={[styles.segText, { color: '#fff' }]}>Sign In</Text>
              </Pressable>
              <Pressable testID="tab-register" onPress={() => router.replace('/auth/register')} style={styles.segBtn}>
                <Text style={styles.segText}>Create Account</Text>
              </Pressable>
            </View>

            <View style={styles.roleRow}>
              {([['job_seeker', 'Job Seeker', 'person'], ['employer', 'Employer', 'business']] as const).map(([r, label, icon]) => (
                <Pressable key={r} testID={`role-${r}`} onPress={() => setRoleTab(r as Role)}
                  style={[styles.roleBtn, roleTab === r && styles.roleBtnActive]}>
                  <Ionicons name={icon as any} size={16} color={roleTab === r ? theme.color.brand : theme.color.onSurfaceTertiary} />
                  <Text style={[styles.roleText, roleTab === r && { color: theme.color.brand }]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.welcome}>Welcome back</Text>
            <Text style={styles.welcomeSub}>Sign in to your CareerConnect account</Text>

            <View style={{ marginTop: theme.spacing.lg }}>
              <Input testID="login-email" label="Email Address" value={email} onChangeText={setEmail}
                autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
              <Input testID="login-password" label="Password" value={password} onChangeText={setPassword}
                secureTextEntry={!show} placeholder="Enter your password"
                right={<Pressable testID="toggle-pass" onPress={() => setShow((s) => !s)} hitSlop={10}><Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={theme.color.onSurfaceTertiary} /></Pressable>} />
              {err ? <Text style={{ color: theme.color.error, marginBottom: 8 }}>{err}</Text> : null}
              <Button testID="login-submit" title="Sign In to CareerConnect" icon="log-in-outline" onPress={submit} loading={loading} />
            </View>

            <Text style={styles.switchLine}>
              No account yet?{' '}
              <Text testID="go-register" onPress={() => router.replace('/auth/register')} style={{ color: theme.color.brand, fontWeight: '800' }}>Create one free</Text>
            </Text>

            <View style={styles.demoBox}>
              <View style={styles.demoHead}>
                <Ionicons name="checkmark-circle" size={16} color={theme.color.success} />
                <Text style={styles.demoTitle}>Demo Credentials</Text>
              </View>
              {DEMO.map((d) => (
                <View key={d.role} style={styles.demoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.demoRole}>{d.role}</Text>
                    <Text style={styles.demoEmail}>{d.email}</Text>
                  </View>
                  <Pressable testID={`use-${d.role}`} onPress={() => applyDemo(d)} style={styles.useBtn}>
                    <Ionicons name="copy-outline" size={13} color={theme.color.brand} />
                    <Text style={styles.useText}>Use</Text>
                  </Pressable>
                </View>
              ))}
            </View>
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
  roleRow: { flexDirection: 'row', gap: 10, marginTop: theme.spacing.lg },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.color.border, backgroundColor: '#fff' },
  roleBtnActive: { borderColor: theme.color.brand, backgroundColor: theme.color.brandTertiary },
  roleText: { fontWeight: '700', color: theme.color.onSurfaceSecondary, fontSize: 14 },
  welcome: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface, marginTop: theme.spacing.xl },
  welcomeSub: { fontSize: 14, color: theme.color.onSurfaceSecondary, marginTop: 4 },
  switchLine: { textAlign: 'center', color: theme.color.onSurfaceSecondary, marginTop: theme.spacing.lg, fontSize: 14 },
  demoBox: { marginTop: theme.spacing.xl, padding: theme.spacing.md, backgroundColor: theme.color.surfaceSecondary, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.border },
  demoHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm },
  demoTitle: { fontWeight: '800', color: theme.color.onSurface, fontSize: 13 },
  demoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.color.divider },
  demoRole: { fontWeight: '700', color: theme.color.onSurface, fontSize: 13 },
  demoEmail: { color: theme.color.onSurfaceSecondary, fontSize: 12, marginTop: 1 },
  useBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.color.brandTertiary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.radius.sm },
  useText: { color: theme.color.brand, fontWeight: '700', fontSize: 12 },
});
