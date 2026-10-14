const FALLBACK_TIMEZONE = "Asia/Jakarta";

/** Format timestamptz (ISO string, selalu UTC di database) ke "Sen, 12 Okt 2026 • 14.30". */
export function formatDateTimeInZone(isoString: string, timezone: string | null | undefined): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";

  const formatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: timezone || FALLBACK_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return formatted.replace(/\./g, ".").replace(",", " •");
}

/** Format tanggal saja, tanpa jam: "12 Okt 2026". */
export function formatDateInZone(isoString: string, timezone: string | null | undefined): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: timezone || FALLBACK_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Selisih waktu relatif, ringkas, dalam Bahasa Indonesia: "2 hari lagi", "Terlambat 3 jam". */
export function relativeDueLabel(isoString: string): string {
  const due = new Date(isoString).getTime();
  if (Number.isNaN(due)) return "-";

  const now = Date.now();
  const diffMs = due - now;
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3_600_000);
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    if (overdueHours < 24) return `Terlambat ${Math.max(1, overdueHours)} jam`;
    return `Terlambat ${Math.abs(diffDays)} hari`;
  }

  if (diffMinutes < 60) return diffMinutes <= 1 ? "Kurang dari 1 jam lagi" : `${diffMinutes} menit lagi`;
  if (diffHours < 24) return `${diffHours} jam lagi`;
  return `${diffDays} hari lagi`;
}

export function isOverdue(isoString: string): boolean {
  return new Date(isoString).getTime() < Date.now();
}

/** "14.30" dari kolom time Postgres ("14:30:00"). */
export function formatTimeLabel(time: string): string {
  const [h = "00", m = "00"] = time.split(":");
  return `${h}.${m}`;
}
