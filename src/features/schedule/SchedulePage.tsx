import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ScheduleEntry, Subject } from "@/types/domain";
import { DAY_LABEL } from "@/types/domain";
import { formatTimeLabel } from "@/lib/dates/timezone";
import { Card } from "@/components/ui/Primitives";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/feedback/Feedback";

type EntryWithSubject = ScheduleEntry & { subject: Pick<Subject, "id" | "name" | "color"> | null };

export function SchedulePage() {
  const { classRow } = useAuth();
  const [entries, setEntries] = useState<EntryWithSubject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!classRow) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("schedule_entries")
      .select("*, subject:subjects(id, name, color)")
      .eq("class_id", classRow.id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setEntries((data as unknown as EntryWithSubject[]) ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRow?.id]);

  const byDay = useMemo(() => {
    const groups = new Map<number, EntryWithSubject[]>();
    for (const entry of entries ?? []) {
      const list = groups.get(entry.day_of_week) ?? [];
      list.push(entry);
      groups.set(entry.day_of_week, list);
    }
    return groups;
  }, [entries]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Jadwal</h1>
        <p className="mt-1 text-sm text-muted">Jadwal pelajaran mingguan kelasmu.</p>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && entries === null && <CardListSkeleton rows={3} />}
      {!error && entries !== null && entries.length === 0 && (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
          title="Jadwal belum diatur"
          description="Admin kelasmu belum menambahkan jadwal pelajaran."
        />
      )}
      {!error && entries !== null && entries.length > 0 && (
        <div className="flex flex-col gap-5">
          {[1, 2, 3, 4, 5, 6, 7]
            .filter((day) => byDay.has(day))
            .map((day) => (
              <section key={day}>
                <h2 className="mb-2 font-display text-sm font-semibold text-ink">{DAY_LABEL[day]}</h2>
                <Card className="p-0">
                  <ul className="divide-y divide-border">
                    {(byDay.get(day) ?? []).map((entry) => (
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
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
