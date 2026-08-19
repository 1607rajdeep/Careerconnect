import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth, api } from '@/src/auth';
import { theme } from '@/src/theme';

export default function AdminCategories() {
  const { token } = useAuth();
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try { setCats(await api('/api/categories')); }
    catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    if (!name.trim()) return;
    setAdding(true); setErr('');
    try {
      const c = await api('/api/admin/categories', { method: 'POST', token, body: JSON.stringify({ name: name.trim(), icon: 'briefcase' }) });
      setCats((p) => [...p, c]); setName('');
    } catch (e: any) { setErr(e.message); }
    finally { setAdding(false); }
  };

  const remove = async (id: string) => {
    try { await api(`/api/admin/categories/${id}`, { method: 'DELETE', token }); setCats((p) => p.filter((c) => c.id !== id)); } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}><Text style={styles.title}>Job Categories</Text></View>
        <View style={styles.addRow}>
          <TextInput
            testID="cat-input"
            value={name} onChangeText={setName}
            placeholder="New category name"
            placeholderTextColor={theme.color.onSurfaceTertiary}
            style={styles.input}
            onSubmitEditing={add}
          />
          <Pressable testID="add-cat" onPress={add} style={styles.addBtn}>
            {adding ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={24} color="#fff" />}
          </Pressable>
        </View>
        {err ? <Text style={styles.err}>{err}</Text> : null}
        {loading ? <View style={styles.center}><ActivityIndicator color={theme.color.brand} /></View> : (
          <FlatList
            data={cats}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ padding: theme.spacing.xl, paddingTop: theme.spacing.sm, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.iconBox}><Ionicons name={item.icon as any} size={18} color={theme.color.brand} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{item.name}</Text>
                  <Text style={styles.catCount}>{item.job_count} active jobs</Text>
                </View>
                <Pressable testID={`del-cat-${item.id}`} onPress={() => remove(item.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={theme.color.error} />
                </Pressable>
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface },
  addRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.xl, marginBottom: theme.spacing.sm },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.color.border, borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.color.onSurface },
  addBtn: { width: 48, height: 48, borderRadius: theme.radius.md, backgroundColor: theme.color.brandPrimary, alignItems: 'center', justifyContent: 'center' },
  err: { color: theme.color.error, paddingHorizontal: theme.spacing.xl, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.color.border },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.color.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 15, fontWeight: '700', color: theme.color.onSurface },
  catCount: { fontSize: 12, color: theme.color.onSurfaceSecondary, marginTop: 2 },
});
