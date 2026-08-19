import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAuth, api, fileUrl } from '@/src/auth';
import { uploadToBackend } from '@/src/upload';
import { theme } from '@/src/theme';
import { Button, Input } from '@/src/ui';

export default function CompanyProfile() {
  const { user, token, refresh, logout } = useAuth();
  const [name, setName] = useState(user?.full_name || '');
  const [company, setCompany] = useState(user?.company_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setMsg('Photo permission needed'); if (!perm.canAskAgain) Linking.openSettings(); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (res.canceled) return;
    const a = res.assets[0];
    setUploading(true);
    try { await uploadToBackend('/api/uploads/logo', { uri: a.uri, name: a.fileName || 'logo.jpg', mimeType: a.mimeType || 'image/jpeg' }, token); await refresh(); setMsg('Logo updated'); }
    catch (e: any) { setMsg(e.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true); setMsg('');
    try { await api('/api/auth/me', { method: 'PUT', token, body: JSON.stringify({ full_name: name, company_name: company, bio, location }) }); await refresh(); setMsg('Profile saved'); }
    catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  const logoUri = fileUrl(user?.company_logo_path, token);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={styles.title}>Company Profile</Text>
          <Pressable testID="logout-btn" onPress={logout} hitSlop={10}>
            <Ionicons name="log-out-outline" size={24} color={theme.color.error} />
          </Pressable>
        </View>

        <View style={styles.avatarWrap}>
          <Pressable testID="pick-logo" onPress={pickLogo} style={styles.logo}>
            {uploading ? <ActivityIndicator color={theme.color.brand} /> :
              logoUri ? <Image source={{ uri: logoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> :
                <Ionicons name="camera" size={28} color={theme.color.brand} />}
          </Pressable>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <Input testID="cp-company" label="Company name" value={company} onChangeText={setCompany} />
        <Input testID="cp-name" label="Contact name" value={name} onChangeText={setName} />
        <Input testID="cp-location" label="Location" value={location} onChangeText={setLocation} placeholder="City, Country" />
        <Input testID="cp-bio" label="About company" value={bio} onChangeText={setBio} multiline style={{ height: 90, textAlignVertical: 'top' }} placeholder="Describe your company" />

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
        <Button testID="save-company" title="Save Changes" onPress={save} loading={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface },
  avatarWrap: { alignItems: 'center', marginVertical: theme.spacing.xl },
  logo: { width: 96, height: 96, borderRadius: theme.radius.lg, backgroundColor: theme.color.brandTertiary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  email: { marginTop: 10, color: theme.color.onSurfaceSecondary, fontSize: 13 },
  msg: { color: theme.color.brandPrimary, marginVertical: theme.spacing.md, textAlign: 'center', fontWeight: '600' },
});
