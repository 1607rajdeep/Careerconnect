export const theme = {
  color: {
    surface: '#FFFFFF',
    onSurface: '#0F172A',
    surfaceSecondary: '#F8FAFC',
    onSurfaceSecondary: '#475569',
    surfaceTertiary: '#F1F5F9',
    onSurfaceTertiary: '#64748B',
    surfaceInverse: '#0F172A',
    onSurfaceInverse: '#F8FAFC',
    brand: '#2540C0',
    brandDark: '#1E3A8A',
    brandPrimary: '#2540C0',
    onBrandPrimary: '#FFFFFF',
    brandSecondary: '#1E40AF',
    brandTertiary: '#EEF2FF',
    onBrandTertiary: '#2540C0',
    accent: '#F0A028',
    accentDark: '#D98A15',
    onAccent: '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    divider: '#F1F5F9',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 6, md: 12, lg: 16, xl: 22, pill: 999 },
  text: { sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, xxxl: 30 },
};

export const statusMeta: Record<string, { label: string; bg: string; fg: string }> = {
  applied: { label: 'Applied', bg: '#DBEAFE', fg: '#1E40AF' },
  under_review: { label: 'Under Review', bg: '#FEF3C7', fg: '#B45309' },
  shortlisted: { label: 'Shortlisted', bg: '#E0E7FF', fg: '#3730A3' },
  rejected: { label: 'Rejected', bg: '#FEE2E2', fg: '#B91C1C' },
  hired: { label: 'Hired', bg: '#D1FAE5', fg: '#065F46' },
};

const AVATAR_COLORS = ['#2540C0', '#7C3AED', '#EA6A2B', '#0F9D8C', '#3B82F6', '#DB2777', '#0891B2', '#CA8A04'];
export function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
export function initials(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const CATEGORY_TINTS: Record<string, { bg: string; fg: string }> = {
  'Software Engineering': { bg: '#EEF2FF', fg: '#2540C0' },
  'Design': { bg: '#FDF2F8', fg: '#DB2777' },
  'Marketing': { bg: '#FEF2F2', fg: '#EA580C' },
  'Sales': { bg: '#F0FDF4', fg: '#16A34A' },
  'Data Science': { bg: '#F5F3FF', fg: '#7C3AED' },
  'Customer Support': { bg: '#ECFEFF', fg: '#0891B2' },
  'Finance': { bg: '#F0FDF4', fg: '#15803D' },
  'Operations': { bg: '#FFF7ED', fg: '#C2410C' },
};

export function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1 day ago';
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  return m === 1 ? '1 month ago' : `${m} months ago`;
}

export function salaryText(min?: number | null, max?: number | null) {
  if (!min && !max) return null;
  const k = (n: number) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${k(min)} - ${k(max)}`;
  return k((min || max)!);
}
