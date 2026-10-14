import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { displayName } from "@/lib/permissions/roles";
import { DAY_LABEL, type Announcement, type AssignmentWithProgress, type ScheduleEntry, type Subject } from "@/types/domain";
import { formatTimeLabel, relativeDueLabel } from "@/lib/dates/timezone";
import { Badge, Card } from "@/components/ui/Primitives";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/feedback/Feedback";

interface TodayEntry extends ScheduleEntry {
  subject: Pick<Subject, "id" | "name" | "color"> | null;
}

export function BerandaPage() {
  const { profile, classRow } = useAuth();

  const [todaySchedule, setTodaySchedule] = useState<TodayEntry[] | null>(null);
  const [upcoming, setUpcoming] = useState<AssignmentWithProgress[] | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classRow) return;
    let cancelled = false;

    async function load() {
      if (!classRow) return;
      setError(null);
      const todayIso = new Date().getDay(); // 0=Minggu..6=Sabtu (JS)
      const dayOfWeek = todayIso === 0 ? 7 : todayIso; // konversi ke 1=Senin..7=Minggu

      const [scheduleRes, assignmentsRes, announcementRes] = await Promise.all([
        supabase
          .from("schedule_entries")
          .select("*, subject:subjects(id, name, color)")
          .eq("class_id", classRow.id)
          .eq("day_of_week", dayOfWeek)
          .order("start_time", { ascending: true }),
        supabase
          .from("assignments")
          .select("*")
          .eq("class_id", classRow.id)
          .eq("status", "published")
          .order("due_at", { ascending: true })
          .limit(3),
        supabase
          .from("announcements")
          .select("*")
          .eq("class_id", classRow.id)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (scheduleRes.error || assignmentsRes.error || announcementRes.error) {
        setError(
          scheduleRes.error?.message ?? assignmentsRes.error?.message ?? announcementRes.error?.message ?? "Gagal memuat data."
        );
        return;
      }

      setTodaySchedule((scheduleRes.data as unknown as TodayEntry[]) ?? []);
      setUpcoming((assignmentsRes.data ?? []).map((a) => ({ ...a, progress_status: "not_started" as const })));
      setLatestAnnouncement(announcementRes.data ?? null);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [classRow]);

  const loading = todaySchedule === null || upcoming === null || latestAnnouncement === undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Halo, {displayName(profile)}</h1>
        <p className="mt-1 text-sm text-muted">
          {new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: classRow?.timezone }).format(new Date())}
        </p>
      </div>

      {classRow?.banner_text && (
        <div className="rounded-xl border border-cyan/30 bg-cyan/5 px-4 py-3 text-sm text-ink">{classRow.banner_text}</div>
      )}

      {classRow?.welcome_text && <p className="text-sm text-muted">{classRow.welcome_text}</p>}

      {error && <ErrorState message={error} />}

      {!error && loading && <CardListSkeleton rows={3} />}

      {!error && !loading && (
        <>
          <section>
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">Jadwal hari ini</h2>
            {todaySchedule && todaySchedule.length > 0 ? (
              <Card className="p-0">
                <ul className="divide-y divide-border">
                  {todaySchedule.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.subject?.color ?? "#9aaab8" }}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-medium text-ink">{entry.subject?.name ?? "Mata pelajaran"}</p>
                          {entry.room && <p className="text-xs text-muted">{entry.room}</p>}
                        </div>
                      </div>
                      <span className="text-sm text-muted">
                        {formatTimeLabel(entry.start_time)}–{formatTimeLabel(entry.end_time)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <EmptyState icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />} title="Tidak ada jadwal hari ini" />
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink">Tugas mendatang</h2>
              <Link to="/tugas" className="text-xs text-cyan hover:underline">
                Lihat semua
              </Link>
            </div>
            {upcoming && upcoming.length > 0 ? (
              <Card className="p-0">
                <ul className="divide-y divide-border">
                  {upcoming.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <span className="text-sm text-ink">{a.title}</span>
                      <Badge tone="cyan">{relativeDueLabel(a.due_at)}</Badge>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <EmptyState title="Tidak ada tugas mendatang" />
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">Pengumuman terbaru</h2>
            {latestAnnouncement ? (
              <Card>
                <div className="flex items-start gap-3">
                  <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-ink">{latestAnnouncement.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{latestAnnouncement.body}</p>
                    <Link to="/pengumuman" className="mt-2 inline-block text-xs text-cyan hover:underline">
                      Baca semua pengumuman
                    </Link>
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState title="Belum ada pengumuman" />
            )}
          </section>
        </>
      )}
    </div>
  );
}
