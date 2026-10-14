import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase, logAdminAction } from "@/lib/supabase/client";
import { materialSchema, type MaterialInput } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Material, Subject } from "@/types/domain";
import { STATUS_LABEL } from "@/types/domain";
import { formatDateInZone } from "@/lib/dates/timezone";
import { Badge, Button, Card, SelectField, TextAreaField, TextField } from "@/components/ui/Primitives";
import { CardListSkeleton, ConfirmDialog, EmptyState, ErrorState } from "@/components/feedback/Feedback";
import { Link } from "react-router-dom";

type MaterialWithSubject = Material & { subject: Pick<Subject, "id" | "name"> | null };

const STATUS_TONE: Record<Material["status"], "neutral" | "cyan" | "success"> = {
  draft: "neutral",
  published: "success",
  archived: "neutral",
};

function emptyForm(firstSubjectId: string): MaterialInput {
  return { title: "", subject_id: firstSubjectId, content: "", status: "draft" };
}

export function AdminMaterialsPage() {
  const { classRow, profile } = useAuth();
  const { notify } = useToast();

  const [items, setItems] = useState<MaterialWithSubject[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialInput>(emptyForm(""));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaterialWithSubject | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!classRow) return;
    setError(null);
    const [materialsRes, subjectsRes] = await Promise.all([
      supabase
        .from("materials")
        .select("*, subject:subjects(id, name)")
        .eq("class_id", classRow.id)
        .order("created_at", { ascending: false }),
      supabase.from("subjects").select("*").eq("class_id", classRow.id).order("name"),
    ]);

    if (materialsRes.error || subjectsRes.error) {
      setError(materialsRes.error?.message ?? subjectsRes.error?.message ?? "Gagal memuat data.");
      return;
    }
    setItems((materialsRes.data as unknown as MaterialWithSubject[]) ?? []);
    setSubjects(subjectsRes.data ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classRow?.id]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(subjects?.[0]?.id ?? ""));
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(item: MaterialWithSubject) {
    setEditingId(item.id);
    setForm({ title: item.title, subject_id: item.subject_id, content: item.content, status: item.status });
    setFieldErrors({});
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!classRow || !profile) return;

    const result = materialSchema.safeParse(form);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from("materials")
        .update(result.data)
        .eq("id", editingId)
        .select("*, subject:subjects(id, name)")
        .single();
      setSubmitting(false);
      if (updateError) {
        notify("Gagal menyimpan perubahan: " + updateError.message, "error");
        return;
      }
      setItems((prev) => (prev ?? []).map((i) => (i.id === editingId ? (data as unknown as MaterialWithSubject) : i)));
      notify("Materi diperbarui.");
      await logAdminAction({
        classId: classRow.id,
        actorId: profile.id,
        action: "materials.update",
        entityType: "materials",
        entityId: editingId,
        metadata: { title: data.title, status: data.status },
      });
    } else {
      const { data, error: insertError } = await supabase
        .from("materials")
        .insert({ ...result.data, class_id: classRow.id, created_by: profile.id })
        .select("*, subject:subjects(id, name)")
        .single();
      setSubmitting(false);
      if (insertError) {
        notify("Gagal membuat materi: " + insertError.message, "error");
        return;
      }
      setItems((prev) => [data as unknown as MaterialWithSubject, ...(prev ?? [])]);
      notify("Materi dibuat.");
      await logAdminAction({
        classId: classRow.id,
        actorId: profile.id,
        action: "materials.create",
        entityType: "materials",
        entityId: data.id,
        metadata: { title: data.title, status: data.status },
      });
    }

    setFormOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget || !classRow || !profile) return;
    setDeleting(true);
    const { error: deleteError } = await supabase.from("materials").delete().eq("id", deleteTarget.id);
    setDeleting(false);

    if (deleteError) {
      notify("Gagal menghapus: " + deleteError.message, "error");
      setDeleteTarget(null);
      return;
    }
    setItems((prev) => (prev ?? []).filter((i) => i.id !== deleteTarget.id));
    notify(`Materi "${deleteTarget.title}" dihapus.`);
    await logAdminAction({
      classId: classRow.id,
      actorId: profile.id,
      action: "materials.delete",
      entityType: "materials",
      entityId: deleteTarget.id,
      metadata: { title: deleteTarget.title },
    });
    setDeleteTarget(null);
  }

  const noSubjects = subjects !== null && subjects.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Kelola Materi</h1>
          <p className="mt-1 text-sm text-muted">Siswa hanya melihat materi berstatus "Terbit".</p>
        </div>
        {!formOpen && !noSubjects && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Buat baru
          </Button>
        )}
      </div>

      {noSubjects && (
        <Card className="border-warning/30 bg-warning/5">
          <p className="text-sm text-ink">
            Belum ada mata pelajaran di kelas ini. Tambahkan dulu di{" "}
            <Link to="/admin/mapel" className="text-cyan hover:underline">
              Kelola Mata Pelajaran
            </Link>{" "}
            sebelum membuat materi.
          </p>
        </Card>
      )}

      {formOpen && subjects && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">{editingId ? "Edit materi" : "Materi baru"}</h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="Tutup formulir"
              className="rounded-lg p-1.5 text-muted hover:bg-navy-800 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField
              label="Judul"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              error={fieldErrors.title}
              disabled={submitting}
            />
            <SelectField
              label="Mata pelajaran"
              value={form.subject_id}
              onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
              error={fieldErrors.subject_id}
              disabled={submitting}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
            <TextAreaField
              label="Isi materi"
              rows={8}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              error={fieldErrors.content}
              disabled={submitting}
            />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MaterialInput["status"] }))}
              disabled={submitting}
            >
              <option value="draft">Draf — belum terlihat siswa</option>
              <option value="published">Terbit — terlihat siswa</option>
              <option value="archived">Arsip — disembunyikan</option>
            </SelectField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && items === null && <CardListSkeleton rows={3} />}
      {!error && items !== null && items.length === 0 && !noSubjects && (
        <EmptyState title="Belum ada materi" description='Klik "Buat baru" untuk menambahkan materi pertama.' />
      )}
      {!error && items !== null && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-sm font-semibold text-ink">{item.title}</h3>
                    <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {item.subject?.name ?? "Umum"} • {formatDateInZone(item.created_at, classRow?.timezone)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(item)}
                    aria-label={`Edit ${item.title}`}
                    className="rounded-lg p-2 text-muted hover:bg-navy-800 hover:text-cyan"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    aria-label={`Hapus ${item.title}`}
                    className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus materi ini?"
        description={`"${deleteTarget?.title}" akan dihapus permanen dan tidak bisa dikembalikan.`}
        pending={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
