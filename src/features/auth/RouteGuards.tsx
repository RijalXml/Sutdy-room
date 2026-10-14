import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isAdmin } from "@/lib/permissions/roles";
import { FullPageSpinner } from "@/components/feedback/Feedback";

/**
 * PENTING: komponen di file ini mengatur PENGALAMAN NAVIGASI saja (menyembunyikan
 * tautan, mengarahkan ke halaman yang tepat). Mereka BUKAN lapisan keamanan.
 * Keamanan sesungguhnya ditegakkan oleh RLS policy di database — lihat
 * supabase/migrations/0001_init.sql. Bahkan jika seseorang melewati guard ini
 * (mis. lewat DevTools), setiap query ke Supabase tetap ditolak oleh RLS.
 */

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner label="Memeriksa sesi..." />;

  if (!session) {
    return <Navigate to="/masuk" replace state={{ from: location }} />;
  }

  if (profile && !profile.is_active) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return <FullPageSpinner label="Memeriksa akses..." />;

  if (!isAdmin(profile)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <FullPageSpinner label="Memuat..." />;
  if (session) return <Navigate to="/beranda" replace />;

  return <>{children}</>;
}
