import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/hooks/useToast";
import { ErrorBoundary } from "@/pages/ErrorBoundary";
import { ForbiddenPage, NotFoundPage } from "@/pages/StatusPages";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { RequestPasswordResetPage, SetNewPasswordPage } from "@/features/auth/AccountRecoveryPage";
import { RedirectIfAuthed, RequireAdmin, RequireAuth } from "@/features/auth/RouteGuards";
import { BerandaPage } from "@/features/dashboard/BerandaPage";
import { MaterialsListPage } from "@/features/materials/MaterialsListPage";
import { MaterialDetailPage } from "@/features/materials/MaterialDetailPage";
import { AssignmentsListPage } from "@/features/assignments/AssignmentsListPage";
import { AssignmentDetailPage } from "@/features/assignments/AssignmentDetailPage";
import { SchedulePage } from "@/features/schedule/SchedulePage";
import { AnnouncementsPage } from "@/features/announcements/AnnouncementsPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { AdminAnnouncementsPage } from "@/features/admin/announcements/AdminAnnouncementsPage";
import { AdminMaterialsPage } from "@/features/admin/materials/AdminMaterialsPage";
import { AdminSubjectsPage } from "@/features/admin/AdminSubjectsPage";
import { AdminSettingsPage } from "@/features/admin/AdminSettingsPage";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Publik — dialihkan ke /beranda jika sudah login */}
              <Route
                path="/masuk"
                element={
                  <RedirectIfAuthed>
                    <LoginPage />
                  </RedirectIfAuthed>
                }
              />
              <Route
                path="/lupa-sandi"
                element={
                  <RedirectIfAuthed>
                    <RequestPasswordResetPage />
                  </RedirectIfAuthed>
                }
              />
              {/* Tidak dibungkus RedirectIfAuthed: Supabase membuat sesi pemulihan
                  sementara saat tautan email dibuka, sebelum kata sandi baru disimpan. */}
              <Route path="/atur-ulang-sandi" element={<SetNewPasswordPage />} />

              {/* Terproteksi — harus login & akun aktif */}
              <Route
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route path="/beranda" element={<BerandaPage />} />
                <Route path="/materi" element={<MaterialsListPage />} />
                <Route path="/materi/:id" element={<MaterialDetailPage />} />
                <Route path="/tugas" element={<AssignmentsListPage />} />
                <Route path="/tugas/:id" element={<AssignmentDetailPage />} />
                <Route path="/jadwal" element={<SchedulePage />} />
                <Route path="/pengumuman" element={<AnnouncementsPage />} />
                <Route path="/profil" element={<ProfilePage />} />

                {/* Admin saja — RequireAuth di atas sudah memastikan login */}
                <Route
                  path="/admin/pengumuman"
                  element={
                    <RequireAdmin>
                      <AdminAnnouncementsPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/materi"
                  element={
                    <RequireAdmin>
                      <AdminMaterialsPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/mapel"
                  element={
                    <RequireAdmin>
                      <AdminSubjectsPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/pengaturan"
                  element={
                    <RequireAdmin>
                      <AdminSettingsPage />
                    </RequireAdmin>
                  }
                />
              </Route>

              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="/" element={<Navigate to="/beranda" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
