import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccentColor } from "@/hooks/useAccentColor";
import { displayName, initials, isAdmin } from "@/lib/permissions/roles";
import { ROLE_LABEL } from "@/types/domain";
import { BrandMark, DesktopSidebar, NavList } from "./Sidebar";

export function AppShell() {
  const { profile, classRow, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useAccentColor(classRow?.accent_color);

  return (
    <div className="flex min-h-screen bg-navy-950">
      <DesktopSidebar />

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Tutup menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-navy-950/80"
          />
          <div className="relative flex h-full w-72 flex-col border-r border-border bg-navy-900 py-6">
            <div className="flex items-center justify-between px-3">
              <BrandMark />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="rounded-lg p-2 text-muted hover:bg-navy-800 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8 flex flex-1 flex-col">
              <NavList onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-navy-950 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu navigasi"
              className="rounded-lg p-2 text-muted hover:bg-navy-800 hover:text-ink lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm text-muted">
                {classRow?.name ?? "Kelas"}
                {classRow?.label ? ` · ${classRow.label}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-ink">{displayName(profile)}</p>
              <p className="text-xs text-muted">{profile ? ROLE_LABEL[profile.role] : ""}</p>
            </div>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan text-xs font-semibold text-navy-950"
              aria-hidden="true"
            >
              {initials(displayName(profile))}
            </div>
            <button
              onClick={() => void signOut()}
              className="rounded-lg p-2 text-muted hover:bg-navy-800 hover:text-danger"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      {isAdmin(profile) && (
        <span className="sr-only" role="status">
          Masuk sebagai admin kelas {classRow?.name}.
        </span>
      )}
    </div>
  );
}
