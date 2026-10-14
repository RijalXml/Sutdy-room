import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Announcement } from "@/types/domain";
import { formatDateTimeInZone } from "@/lib/dates/timezone";
import { Card } from "@/components/ui/Primitives";
import { CardListSkeleton, EmptyState, ErrorState } from "@/components/feedback/Feedback";

export function AnnouncementsPage() {
  const { classRow } = useAuth();
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!classRow) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("announcements")
      .select("*")
      .eq("class_id", classRow.id)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setItems(data ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRow?.id]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Pengumuman</h1>
        <p className="mt-1 text-sm text-muted">Info terbaru dari admin kelasmu.</p>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && items === null && <CardListSkeleton rows={4} />}
      {!error && items !== null && items.length === 0 && (
        <EmptyState
          icon={<Megaphone className="h-5 w-5" aria-hidden="true" />}
          title="Belum ada pengumuman"
          description="Pengumuman dari admin akan muncul di sini."
        />
      )}
      {!error && items !== null && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <h2 className="font-display text-base font-semibold text-ink">{item.title}</h2>
              <p className="mt-1 text-xs text-muted">{formatDateTimeInZone(item.created_at, classRow?.timezone)}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink/90">{item.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
