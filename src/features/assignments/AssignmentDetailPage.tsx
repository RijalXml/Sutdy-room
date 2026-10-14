import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Assignment, ProgressStatus, Subject } from "@/types/domain";
import { PROGRESS_LABEL } from "@/types/domain";
import { formatDateTimeInZone, isOverdue, relativeDueLabel } from "@/lib/dates/timezone";
import { Badge, Card } from "@/components/ui/Primitives";
import { CardListSkeleton, ErrorState } from "@/components/feedback/Feedback";

type AssignmentWithSubject = Assignment & { subject: Pick<Subject, "id" | "name"> | null };

const OPTIONS: ProgressStatus[] = ["not_started", "in_progress", "done"];

export function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { classRow, profile } = useAuth();
  const { notify } = useToast();

  const [item, setItem] = useState<AssignmentWithSubject | null | undefined>(undefined);
  const [progress, setProgress] = useState<ProgressStatus>("not_started");
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id || !profile) return;
    let cancelled = false;

    async function load() {
      if (!profile || !id) return;
      setError(null);
      const [assignmentRes, progressRes] = await Promise.all([
        supabase.from("assignments").select("*, subject:subjects(id, name)").eq("id", id).maybeSingle(),
        supabase
          .from("assignment_progress")
          .select("status")
          .eq("assignment_id", id)
          .eq("student_id", profile.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      if (assignmentRes.error) {
        setError(assignmentRes.error.message);
        return;
      }
      setItem((assignmentRes.data as unknown as AssignmentWithSubject) ?? null);
      setProgress(progressRes.data?.status ?? "not_started");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, profile?.id]);

  async function updateProgress(next: ProgressStatus) {
    if (!profile || !id || next === progress) return;
    setUpdating(true);
    const { error: upsertError } = await supabase
      .from("assignment_progress")
      .upsert({ assignment_id: id, student_id: profile.id, status: next }, { onConflict: "assignment_id,student_id" });
    setUpdating(false);

    if (upsertError) {
      notify("Gagal memperbarui status: " + upsertError.message, "error");
      return;
    }
    setProgress(next);
    notify("Status progres disimpan.");
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/tugas" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke Tugas
      </Link>

      {error && <ErrorState message={error} />}
      {!error && item === undefined && <CardListSkeleton rows={1} />}
      {!error && item === null && (
        <Card>
          <p className="text-sm text-muted">Tugas tidak ditemukan atau kamu tidak punya akses.</p>
        </Card>
      )}
      {!error && item && (
        <>
          <Card>
            <p className="text-xs font-medium text-cyan">{item.subject?.name ?? "Umum"}</p>
            <h1 className="mt-1 font-display text-xl font-bold text-ink">{item.title}</h1>
            <p className={`mt-1 text-xs ${isOverdue(item.due_at) && progress !== "done" ? "text-danger" : "text-muted"}`}>
              Tenggat: {formatDateTimeInZone(item.due_at, classRow?.timezone)} ({relativeDueLabel(item.due_at)})
            </p>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{item.description}</div>
          </Card>

          <Card>
            <h2 className="font-display text-sm font-semibold text-ink">Status pengerjaanmu</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => void updateProgress(option)}
                  disabled={updating}
                  aria-pressed={progress === option}
                  className={`rounded-lg border px-3.5 py-2 text-sm transition-colors disabled:opacity-60 ${
                    progress === option
                      ? "border-cyan/40 bg-cyan/10 text-cyan"
                      : "border-border text-muted hover:text-ink"
                  }`}
                >
                  {PROGRESS_LABEL[option]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              Status ini hanya terlihat olehmu dan adminmu, dan hanya kamu yang bisa mengubahnya.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
