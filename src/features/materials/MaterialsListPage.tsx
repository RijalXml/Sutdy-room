import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Material, Subject } from "@/types/domain";
import { formatDateInZone } from "@/lib/dates/timezone";
import { Card } from "@/components/ui/Primitives";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/feedback/Feedback";

type MaterialWithSubject = Material & { subject: Pick<Subject, "id" | "name" | "color"> | null };

export function MaterialsListPage() {
  const { classRow } = useAuth();
  const [items, setItems] = useState<MaterialWithSubject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  async function load() {
    if (!classRow) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("materials")
      .select("*, subject:subjects(id, name, color)")
      .eq("class_id", classRow.id)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setItems((data as unknown as MaterialWithSubject[]) ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRow?.id]);

  const subjects = useMemo(() => {
    const map = new Map<string, Pick<Subject, "id" | "name" | "color">>();
    for (const item of items ?? []) {
      if (item.subject) map.set(item.subject.id, item.subject);
    }
    return Array.from(map.values());
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (subjectFilter === "all") return items;
    return items.filter((i) => i.subject?.id === subjectFilter);
  }, [items, subjectFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Materi</h1>
        <p className="mt-1 text-sm text-muted">Materi pelajaran yang sudah diterbitkan admin.</p>
      </div>

      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter mata pelajaran">
          <FilterChip active={subjectFilter === "all"} onClick={() => setSubjectFilter("all")} label="Semua" />
          {subjects.map((s) => (
            <FilterChip key={s.id} active={subjectFilter === s.id} onClick={() => setSubjectFilter(s.id)} label={s.name} />
          ))}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && filtered === null && <CardListSkeleton rows={4} />}
      {!error && filtered !== null && filtered.length === 0 && (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}
          title="Belum ada materi"
          description="Materi yang diterbitkan admin akan muncul di sini."
        />
      )}
      {!error && filtered !== null && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <Link key={item.id} to={`/materi/${item.id}`}>
              <Card className="transition-colors hover:border-cyan/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-base font-semibold text-ink">{item.title}</h2>
                    <p className="mt-1 text-xs text-muted">
                      {item.subject?.name ?? "Umum"} • {formatDateInZone(item.created_at, classRow?.timezone)}
                    </p>
                  </div>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.subject?.color ?? "#9aaab8" }}
                    aria-hidden="true"
                  />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-border text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
