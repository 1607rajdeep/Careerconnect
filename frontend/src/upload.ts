import { Platform } from 'react-native';
import { API_URL } from './auth';

export async function uploadToBackend(
  endpoint: string,
  file: { uri: string; name: string; mimeType?: string; type?: string },
  token: string | null,
): Promise<{ path: string }> {
  const form = new FormData();
  const mime = file.mimeType || file.type || 'application/octet-stream';
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, file.name);
  } else {
    form.append('file', { uri: file.uri, name: file.name, type: mime } as any);
  }
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { detail: text }; }
  if (!res.ok) throw new Error(data.detail || 'Upload failed');
  return data;
}
