import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase, logAdminAction } from "@/lib/supabase/client";
import { subjectSchema } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Subject } from "@/types/domain";
import { Button, Card, TextField } from "@/components/ui/Primitives";
import { CardListSkeleton, ConfirmDialog, EmptyState, ErrorState } from "@/components/feedback/Feedback";

const DEFAULT_COLOR = "#22D3EE";

export function AdminSubjectsPage() {
  const { classRow, profile } = useAuth();
  const { notify } = useToast();

  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!classRow) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("subjects")
      .select("*")
      .eq("class_id", classRow.id)
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setSubjects(data ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRow?.id]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!classRow || !profile) return;

    const result = subjectSchema.safeParse({ name, color });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Data tidak valid.");
      return;
    }
    setFieldError(null);
    setSubmitting(true);

    const { data, error: insertError } = await supabase
      .from("subjects")
      .insert({ class_id: classRow.id, name: result.data.name, color: result.data.color || null })
      .select("*")
      .single();

    setSubmitting(false);

    if (insertError) {
      const message = insertError.message.includes("duplicate")
        ? "Mata pelajaran dengan nama itu sudah ada."
        : "Gagal menambahkan: " + insertError.message;
      notify(message, "error");
      return;
    }

    setSubjects((prev) => [...(prev ?? []), data].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setColor(DEFAULT_COLOR);
    notify(`Mata pelajaran "${data.name}" ditambahkan.`);

    await logAdminAction({
      classId: classRow.id,
      actorId: profile.id,
      action: "subjects.create",
      entityType: "subjects",
      entityId: data.id,
      metadata: { name: data.name },
    });
  }

  async function handleDelete() {
    if (!deleteTarget || !classRow || !profile) return;
    setDeleting(true);

    const { error: deleteError } = await supabase.from("subjects").delete().eq("id", deleteTarget.id);

    setDeleting(false);

    if (deleteError) {
      const message = deleteError.message.includes("foreign key")
        ? "Tidak bisa dihapus: masih ada materi, tugas, atau jadwal yang memakai mata pelajaran ini."
        : "Gagal menghapus: " + deleteError.message;
      notify(message, "error");
      setDeleteTarget(null);
      return;
    }

    setSubjects((prev) => (prev ?? []).filter((s) => s.id !== deleteTarget.id));
    notify(`Mata pelajaran "${deleteTarget.name}" dihapus.`);

    await logAdminAction({
      classId: classRow.id,
      actorId: profile.id,
      action: "subjects.delete",
      entityType: "subjects",
      entityId: deleteTarget.id,
      metadata: { name: deleteTarget.name },
    });
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Kelola Mata Pelajaran</h1>
        <p className="mt-1 text-sm text-muted">
          Mata pelajaran dipakai saat membuat materi, tugas, dan jadwal.
        </p>
      </div>

      <Card>
        <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField
              label="Nama mata pelajaran"
              placeholder="contoh: Matematika"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldError ?? undefined}
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="subject-color" className="text-sm font-medium text-ink">
              Warna
            </label>
            <input
              id="subject-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              disabled={submitting}
              className="h-[42px] w-14 cursor-pointer rounded-lg border border-border bg-navy-950 p-1"
            />
          </div>
          <Button type="submit" loading={submitting} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah
          </Button>
        </form>
      </Card>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && subjects === null && <CardListSkeleton rows={3} />}
      {!error && subjects !== null && subjects.length === 0 && (
        <EmptyState
          title="Belum ada mata pelajaran"
          description="Tambahkan mata pelajaran pertama lewat formulir di atas."
        />
      )}
      {!error && subjects !== null && subjects.length > 0 && (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {subjects.map((subject) => (
              <li key={subject.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color ?? "#8b93ad" }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-ink">{subject.name}</span>
                </div>
                <button
                  onClick={() => setDeleteTarget(subject)}
                  aria-label={`Hapus mata pelajaran ${subject.name}`}
                  className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus mata pelajaran ini?"
        description={`"${deleteTarget?.name}" akan dihapus permanen. Ini tidak bisa dibatalkan, dan akan gagal jika masih dipakai oleh materi/tugas/jadwal yang ada.`}
        confirmLabel="Hapus"
        pending={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
