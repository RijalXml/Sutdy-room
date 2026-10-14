import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Material, Subject } from "@/types/domain";
import { formatDateTimeInZone } from "@/lib/dates/timezone";
import { Card } from "@/components/ui/Primitives";
import { CardListSkeleton, ErrorState } from "@/components/feedback/Feedback";

type MaterialWithSubject = Material & { subject: Pick<Subject, "id" | "name" | "color"> | null };

export function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { classRow } = useAuth();
  const [item, setItem] = useState<MaterialWithSubject | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("materials")
        .select("*, subject:subjects(id, name, color)")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      setItem((data as unknown as MaterialWithSubject) ?? null);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="flex flex-col gap-4">
      <Link to="/materi" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Kembali ke Materi
      </Link>

      {error && <ErrorState message={error} />}
      {!error && item === undefined && <CardListSkeleton rows={1} />}
      {!error && item === null && (
        <Card>
          <p className="text-sm text-muted">
            Materi tidak ditemukan — mungkin sudah dihapus, diarsipkan, atau kamu tidak punya akses.
          </p>
        </Card>
      )}
      {!error && item && (
        <Card>
          <p className="text-xs font-medium text-cyan">{item.subject?.name ?? "Umum"}</p>
          <h1 className="mt-1 font-display text-xl font-bold text-ink">{item.title}</h1>
          <p className="mt-1 text-xs text-muted">Diperbarui {formatDateTimeInZone(item.updated_at, classRow?.timezone)}</p>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{item.content}</div>
        </Card>
      )}
    </div>
  );
}
