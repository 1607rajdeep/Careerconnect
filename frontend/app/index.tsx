import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, api } from '@/src/auth';
import { theme, CATEGORY_TINTS } from '@/src/theme';
import { Button, JobCard } from '@/src/ui';

const POPULAR = ['Software Engineer', 'Product Designer', 'Data Scientist', 'Marketing', 'Sales'];

export default function Landing() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (user.role === 'job_seeker') router.replace('/(seeker)');
      else if (user.role === 'employer') router.replace('/(employer)');
      else router.replace('/(admin)');
    } else setReady(true);
  }, [user, loading]);

  useEffect(() => {
    (async () => {
      try {
        const [cats, jobs] = await Promise.all([api('/api/categories'), api('/api/jobs/featured')]);
        setCategories(cats); setFeatured(jobs);
      } catch {}
    })();
  }, []);

  if (loading || !ready) return <View style={styles.loadingBox}><ActivityIndicator color={theme.color.brand} /></View>;

  const totalJobs = categories.reduce((s, c) => s + (c.job_count || 0), 0);
  const goAuth = () => router.push('/auth/login');

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <LinearGradient colors={[theme.color.brand, theme.color.brandDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.navRow}>
              <View style={styles.brandRow}>
                <View style={styles.logoBox}><Ionicons name="briefcase" size={18} color={theme.color.accent} /></View>
                <Text style={styles.brandName}>CareerConnect</Text>
              </View>
              <Pressable testID="nav-signin" onPress={goAuth}>
                <Text style={styles.signIn}>Sign In</Text>
              </Pressable>
            </View>

            <View style={styles.badgePill}>
              <Ionicons name="trending-up" size={13} color="#fff" />
              <Text style={styles.badgePillText}>{totalJobs.toLocaleString()}+ active job listings</Text>
            </View>

            <Text style={styles.heroTitle}>Find Your Next{'\n'}<Text style={{ color: theme.color.accent }}>Career Move</Text></Text>
            <Text style={styles.heroSub}>Connect with top companies hiring right now. Upload your resume and get noticed by recruiters.</Text>

            {/* Search card */}
            <View style={styles.searchCard}>
              <View style={styles.searchField}>
                <Ionicons name="search" size={18} color={theme.color.onSurfaceTertiary} />
                <TextInput testID="landing-search-input" placeholder="Job title, skills, or company"
                  placeholderTextColor={theme.color.onSurfaceTertiary} value={q} onChangeText={setQ}
                  style={styles.searchInput} />
              </View>
              <View style={styles.searchDivider} />
              <View style={styles.searchField}>
                <Ionicons name="location-outline" size={18} color={theme.color.onSurfaceTertiary} />
                <TextInput testID="landing-loc-input" placeholder="City, state, or remote"
                  placeholderTextColor={theme.color.onSurfaceTertiary} value={loc} onChangeText={setLoc}
                  style={styles.searchInput} />
              </View>
              <Pressable testID="landing-search-btn" onPress={goAuth} style={styles.searchBtn}>
                <Ionicons name="search" size={16} color="#fff" />
                <Text style={styles.searchBtnText}>Search Jobs</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
              <Text style={styles.popularLabel}>Popular:</Text>
              {POPULAR.map((p) => (
                <Pressable key={p} testID={`popular-${p}`} onPress={goAuth} style={styles.popularChip}>
                  <Text style={styles.popularChipText}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.statsRow}>
              <Stat num={`${totalJobs.toLocaleString()}+`} label="Active Jobs" icon="briefcase" />
              <View style={styles.statDivider} />
              <Stat num="3,800+" label="Companies" icon="business" />
              <View style={styles.statDivider} />
              <Stat num="2.1M+" label="Job Seekers" icon="people" />
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* CATEGORIES */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>EXPLORE OPPORTUNITIES</Text>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <View style={styles.grid}>
            {categories.map((c) => {
              const tint = CATEGORY_TINTS[c.name] || { bg: theme.color.brandTertiary, fg: theme.color.brand };
              return (
                <Pressable key={c.id} testID={`cat-${c.name}`} onPress={goAuth} style={styles.catCard}>
                  <View style={[styles.catIcon, { backgroundColor: tint.bg }]}>
                    <Ionicons name={c.icon as any} size={22} color={tint.fg} />
                  </View>
                  <Text style={styles.catName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.catCount}>{c.job_count} openings</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* FEATURED */}
        <View style={[styles.section, { paddingTop: 0 }]}>
          <Text style={styles.eyebrow}>HANDPICKED FOR YOU</Text>
          <Text style={styles.sectionTitle}>Featured Jobs</Text>
          <View style={{ marginTop: theme.spacing.md }}>
            {featured.map((j) => <JobCard key={j.id} testID={`feat-${j.id}`} job={j} onPress={goAuth} />)}
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Ready to get started?</Text>
          <Text style={styles.ctaSub}>Join CareerConnect and take the next step in your career journey today.</Text>
          <Button testID="cta-signup" title="Create Free Account" variant="accent" onPress={() => router.push('/auth/register')} />
          <Pressable testID="cta-login" onPress={goAuth} style={{ marginTop: theme.spacing.md }}>
            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>I already have an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ num, label, icon }: { num: string; label: string; icon: any }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={theme.color.accent} style={{ marginBottom: 4 }} />
      <Text style={styles.statNum}>{num}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  hero: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xxl, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: theme.spacing.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  brandName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  signIn: { color: '#fff', fontWeight: '700', fontSize: 14 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: theme.radius.pill, marginTop: theme.spacing.xxl },
  badgePillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#fff', fontSize: 38, fontWeight: '800', textAlign: 'center', marginTop: theme.spacing.lg, lineHeight: 44 },
  heroSub: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: theme.spacing.md, fontSize: 14, lineHeight: 20, paddingHorizontal: theme.spacing.md },
  searchCard: { backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: theme.spacing.sm, marginTop: theme.spacing.xl, gap: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  searchField: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 4 },
  searchInput: { flex: 1, fontSize: 15, color: theme.color.onSurface, paddingVertical: 10 },
  searchDivider: { height: 1, backgroundColor: theme.color.divider, marginHorizontal: 10 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.color.brand, borderRadius: theme.radius.md, paddingVertical: 14, marginTop: 4 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  popularRow: { alignItems: 'center', gap: 8, paddingVertical: theme.spacing.lg },
  popularLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginRight: 4 },
  popularChip: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.radius.pill },
  popularChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  statNum: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  section: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xxl },
  eyebrow: { color: theme.color.accentDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface, textAlign: 'center', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: theme.spacing.lg },
  catCard: { width: '48%', backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.color.border, marginBottom: theme.spacing.md, alignItems: 'center' },
  catIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  catName: { fontSize: 14, fontWeight: '700', color: theme.color.onSurface, textAlign: 'center' },
  catCount: { fontSize: 12, color: theme.color.onSurfaceTertiary, marginTop: 2 },
  ctaCard: { marginTop: theme.spacing.lg, marginHorizontal: theme.spacing.xl, backgroundColor: theme.color.brand, borderRadius: theme.radius.xl, padding: theme.spacing.xl },
  ctaTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  ctaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: theme.spacing.lg, textAlign: 'center', lineHeight: 20 },
});
