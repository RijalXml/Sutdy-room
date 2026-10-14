import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AssignmentWithProgress, ProgressStatus } from "@/types/domain";
import { PROGRESS_LABEL } from "@/types/domain";
import { isOverdue, relativeDueLabel } from "@/lib/dates/timezone";
import { Badge, Card } from "@/components/ui/Primitives";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/feedback/Feedback";

const PROGRESS_TONE: Record<ProgressStatus, "neutral" | "cyan" | "success"> = {
  not_started: "neutral",
  in_progress: "cyan",
  done: "success",
};

export function AssignmentsListPage() {
  const { classRow, profile } = useAuth();
  const [items, setItems] = useState<AssignmentWithProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!classRow || !profile) return;
    setError(null);

    const [assignmentsRes, progressRes] = await Promise.all([
      supabase
        .from("assignments")
        .select("*")
        .eq("class_id", classRow.id)
        .eq("status", "published")
        .order("due_at", { ascending: true }),
      supabase.from("assignment_progress").select("assignment_id, status").eq("student_id", profile.id),
    ]);

    if (assignmentsRes.error || progressRes.error) {
      setError(assignmentsRes.error?.message ?? progressRes.error?.message ?? "Gagal memuat data.");
      return;
    }

    const progressMap = new Map((progressRes.data ?? []).map((p) => [p.assignment_id, p.status]));
    setItems(
      (assignmentsRes.data ?? []).map((a) => ({
        ...a,
        progress_status: progressMap.get(a.id) ?? "not_started",
      }))
    );
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRow?.id, profile?.id]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Tugas</h1>
        <p className="mt-1 text-sm text-muted">Tugas yang sudah diterbitkan beserta status pengerjaanmu.</p>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && items === null && <CardListSkeleton rows={4} />}
      {!error && items !== null && items.length === 0 && (
        <EmptyState
          icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          title="Belum ada tugas"
          description="Tugas yang diterbitkan admin akan muncul di sini."
        />
      )}
      {!error && items !== null && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Link key={item.id} to={`/tugas/${item.id}`}>
              <Card className="transition-colors hover:border-cyan/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-base font-semibold text-ink">{item.title}</h2>
                    <p className={`mt-1 text-xs ${isOverdue(item.due_at) && item.progress_status !== "done" ? "text-danger" : "text-muted"}`}>
                      {relativeDueLabel(item.due_at)}
                    </p>
                  </div>
                  <Badge tone={PROGRESS_TONE[item.progress_status]}>{PROGRESS_LABEL[item.progress_status]}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
