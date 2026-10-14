import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  CalendarDays,
  Megaphone,
  UserCircle,
  ShieldCheck,
  Settings,
  Tag,
} from "lucide-react";
import { isAdmin } from "@/lib/permissions/roles";
import { useAuth } from "@/hooks/useAuth";

const studentNav = [
  { to: "/beranda", label: "Beranda", icon: LayoutDashboard },
  { to: "/materi", label: "Materi", icon: BookOpen },
  { to: "/tugas", label: "Tugas", icon: ClipboardList },
  { to: "/jadwal", label: "Jadwal", icon: CalendarDays },
  { to: "/pengumuman", label: "Pengumuman", icon: Megaphone },
  { to: "/profil", label: "Profil", icon: UserCircle },
];

const adminNav = [
  { to: "/admin/pengumuman", label: "Kelola Pengumuman", icon: ShieldCheck },
  { to: "/admin/materi", label: "Kelola Materi", icon: BookOpen },
  { to: "/admin/mapel", label: "Kelola Mata Pelajaran", icon: Tag },
  { to: "/admin/pengaturan", label: "Pengaturan Kelas", icon: Settings },
];

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Navigasi utama">
      {studentNav.map((item) => (
        <NavItem key={item.to} {...item} onNavigate={onNavigate} />
      ))}

      {isAdmin(profile) && (
        <>
          <p className="mt-5 mb-1 px-3 text-xs font-medium text-muted">Admin</p>
          {adminNav.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </nav>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
          isActive
            ? "bg-cyan/10 font-medium text-cyan"
            : "text-muted hover:bg-navy-800 hover:text-ink"
        }`
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {label}
    </NavLink>
  );
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0B1220" />
        <path d="M8 21V11L16 6L24 11V21L16 26L8 21Z" stroke="#22D3EE" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 16V26" stroke="#22D3EE" strokeWidth="2" strokeOpacity="0.5" strokeLinejoin="round" />
      </svg>
      <div className="leading-tight">
        <p className="font-display text-sm font-bold text-ink">StudyRoom</p>
        <p className="text-[11px] text-muted">Smart Learning Hub</p>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-navy-900/60 py-6 lg:flex">
      <BrandMark />
      <div className="mt-8 flex flex-1 flex-col">
        <NavList />
      </div>
    </aside>
  );
}
