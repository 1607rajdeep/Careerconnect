import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { useAuth, api, fileUrl } from '@/src/auth';
import { uploadToBackend } from '@/src/upload';
import { theme } from '@/src/theme';
import { Button, Input } from '@/src/ui';

const LEVELS = ['Entry', 'Mid', 'Senior', 'Lead'];

export default function SeekerProfile() {
  const { user, token, refresh, logout } = useAuth();
  const [name, setName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [level, setLevel] = useState(user?.experience_level || 'Entry');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [msg, setMsg] = useState('');

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setMsg('Photo permission needed');
      if (!perm.canAskAgain) Linking.openSettings();
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (res.canceled) return;
    const a = res.assets[0];
    setUploadingPhoto(true);
    try {
      await uploadToBackend('/api/uploads/photo', { uri: a.uri, name: a.fileName || 'photo.jpg', mimeType: a.mimeType || 'image/jpeg' }, token);
      await refresh(); setMsg('Photo updated');
    } catch (e: any) { setMsg(e.message); }
    finally { setUploadingPhoto(false); }
  };

  const pickResume = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] });
    if (res.canceled) return;
    const a = res.assets[0];
    setUploadingResume(true);
    try {
      await uploadToBackend('/api/uploads/resume', { uri: a.uri, name: a.name, mimeType: a.mimeType }, token);
      await refresh(); setMsg('Resume uploaded');
    } catch (e: any) { setMsg(e.message); }
    finally { setUploadingResume(false); }
  };

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await api('/api/auth/me', { method: 'PUT', token, body: JSON.stringify({ full_name: name, bio, location, experience_level: level }) });
      await refresh(); setMsg('Profile saved');
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  const photoUri = fileUrl(user?.photo_path, token);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.surfaceSecondary }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Profile</Text>
          <Pressable testID="logout-btn" onPress={logout} hitSlop={10}>
            <Ionicons name="log-out-outline" size={24} color={theme.color.error} />
          </Pressable>
        </View>

        <View style={styles.avatarWrap}>
          <Pressable testID="pick-photo" onPress={pickPhoto} style={styles.avatar}>
            {uploadingPhoto ? <ActivityIndicator color={theme.color.brand} /> :
              photoUri ? <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> :
                <Ionicons name="camera" size={28} color={theme.color.brand} />}
          </Pressable>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <Input testID="pf-name" label="Full name" value={name} onChangeText={setName} />
        <Input testID="pf-location" label="Location" value={location} onChangeText={setLocation} placeholder="City, Country" />
        <Input testID="pf-bio" label="Bio" value={bio} onChangeText={setBio} placeholder="Tell employers about yourself" multiline style={{ height: 90, textAlignVertical: 'top' }} />

        <Text style={styles.label}>Experience level</Text>
        <View style={styles.levelRow}>
          {LEVELS.map((l) => (
            <Pressable key={l} testID={`level-${l}`} onPress={() => setLevel(l)} style={[styles.levelChip, level === l && styles.levelChipActive]}>
              <Text style={[styles.levelText, level === l && { color: '#fff' }]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.resumeCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Ionicons name="document-text" size={24} color={user?.resume_path ? theme.color.brandPrimary : theme.color.onSurfaceTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeTitle}>Resume</Text>
              <Text style={styles.resumeSub}>{user?.resume_path ? 'Uploaded ✓' : 'PDF, DOC, DOCX'}</Text>
            </View>
          </View>
          <Pressable testID="pick-resume" onPress={pickResume} style={styles.resumeBtn}>
            {uploadingResume ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{user?.resume_path ? 'Replace' : 'Upload'}</Text>}
          </Pressable>
        </View>

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
        <View style={{ marginTop: theme.spacing.lg }}>
          <Button testID="save-profile" title="Save Changes" onPress={save} loading={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: theme.color.onSurface },
  avatarWrap: { alignItems: 'center', marginVertical: theme.spacing.xl },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.color.brandTertiary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#fff' },
  email: { marginTop: 10, color: theme.color.onSurfaceSecondary, fontSize: 13 },
  label: { fontSize: 13, color: theme.color.onSurfaceSecondary, marginBottom: 8, fontWeight: '600' },
  levelRow: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md },
  levelChip: { flex: 1, paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.color.border, alignItems: 'center' },
  levelChipActive: { backgroundColor: theme.color.brand, borderColor: theme.color.brand },
  levelText: { fontSize: 13, fontWeight: '600', color: theme.color.onSurfaceSecondary },
  resumeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: theme.radius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.color.border, marginTop: theme.spacing.sm },
  resumeTitle: { fontSize: 14, fontWeight: '700', color: theme.color.onSurface },
  resumeSub: { fontSize: 12, color: theme.color.onSurfaceSecondary, marginTop: 2 },
  resumeBtn: { backgroundColor: theme.color.brandPrimary, borderRadius: theme.radius.md, paddingHorizontal: 16, paddingVertical: 10, minWidth: 80, alignItems: 'center' },
  msg: { color: theme.color.brandPrimary, marginTop: theme.spacing.md, textAlign: 'center', fontWeight: '600' },
});
