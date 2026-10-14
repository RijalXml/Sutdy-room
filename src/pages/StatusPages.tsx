import { Link } from "react-router-dom";
import { FileQuestion, ShieldAlert } from "lucide-react";

function StatusShell({
  icon,
  code,
  title,
  description,
}: {
  icon: React.ReactNode;
  code: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-navy-950 px-6 text-center">
      <div className="rounded-full bg-navy-800 p-4 text-cyan">{icon}</div>
      <p className="font-display text-sm font-semibold tracking-wide text-muted">{code}</p>
      <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      <Link
        to="/beranda"
        className="mt-2 inline-flex items-center justify-center rounded-lg border border-border bg-navy-800 px-4 py-2.5 text-sm text-ink transition-colors hover:border-cyan/50 hover:text-cyan"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <StatusShell
      icon={<FileQuestion className="h-6 w-6" aria-hidden="true" />}
      code="404"
      title="Halaman tidak ditemukan"
      description="Tautan yang kamu buka mungkin salah ketik atau sudah tidak ada."
    />
  );
}

export function ForbiddenPage() {
  return (
    <StatusShell
      icon={<ShieldAlert className="h-6 w-6" aria-hidden="true" />}
      code="403"
      title="Akses ditolak"
      description="Kamu tidak punya izin untuk membuka halaman ini. Jika menurutmu ini keliru, hubungi admin kelasmu."
    />
  );
}
