import type { Profile } from "@/types/domain";

/**
 * Fungsi-fungsi ini HANYA untuk pengalaman navigasi (menyembunyikan menu,
 * mengarahkan ke halaman 403, dsb). Mereka BUKAN lapisan keamanan — keamanan
 * sesungguhnya ditegakkan oleh RLS policy di database (lihat
 * supabase/migrations/0001_init.sql dan docs/RLS_POLICY.md). Bahkan jika kode
 * di bawah ini punya bug, RLS tetap menolak akses yang tidak sah.
 */

export function isAdmin(profile: Profile | null | undefined): boolean {
  return Boolean(profile && profile.role === "admin" && profile.is_active);
}

export function isActiveMember(profile: Profile | null | undefined): boolean {
  return Boolean(profile && profile.is_active);
}

export function canManageClassContent(profile: Profile | null | undefined, classId: string | null | undefined): boolean {
  if (!profile || !classId) return false;
  return isAdmin(profile) && profile.class_id === classId;
}

export function displayName(profile: Profile | null | undefined): string {
  if (!profile) return "Pengguna";
  return profile.full_name.trim() || "Pengguna";
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}
