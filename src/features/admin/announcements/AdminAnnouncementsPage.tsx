import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase, logAdminAction } from "@/lib/supabase/client";
import { announcementSchema, type AnnouncementInput } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Announcement } from "@/types/domain";
import { STATUS_LABEL } from "@/types/domain";
import { formatDateTimeInZone } from "@/lib/dates/timezone";
import { Badge, Button, Card, SelectField, TextAreaField, TextField } from "@/components/ui/Primitives";
import { CardListSkeleton, ConfirmDialog, EmptyState, ErrorState } from "@/components/feedback/Feedback";

const EMPTY_FORM: AnnouncementInput = { title: "", body: "", status: "draft" };

const STATUS_TONE: Record<Announcement["status"], "neutral" | "cyan" | "success"> = {
  draft: "neutral",
  published: "success",
  archived: "neutral",
};

export function AdminAnnouncementsPage() {
  const { classRow, profile } = useAuth();
  const { notify } = useToast();

  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    if (!classRow) return;
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("announcements")
      .select("*")
      .eq("class_id", classRow.id)
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

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditingId(item.id);
    setForm({ title: item.title, body: item.body, status: item.status });
    setFieldErrors({});
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!classRow || !profile) return;

    const result = announcementSchema.safeParse(form);
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
        .from("announcements")
        .update(result.data)
        .eq("id", editingId)
        .select("*")
        .single();

      setSubmitting(false);
      if (updateError) {
        notify("Gagal menyimpan perubahan: " + updateError.message, "error");
        return;
      }
      setItems((prev) => (prev ?? []).map((i) => (i.id === editingId ? data : i)));
      notify("Pengumuman diperbarui.");
      await logAdminAction({
        classId: classRow.id,
        actorId: profile.id,
        action: "announcements.update",
        entityType: "announcements",
        entityId: editingId,
        metadata: { title: data.title, status: data.status },
      });
    } else {
      const { data, error: insertError } = await supabase
        .from("announcements")
        .insert({ ...result.data, class_id: classRow.id, created_by: profile.id })
        .select("*")
        .single();

      setSubmitting(false);
      if (insertError) {
        notify("Gagal membuat pengumuman: " + insertError.message, "error");
        return;
      }
      setItems((prev) => [data, ...(prev ?? [])]);
      notify("Pengumuman dibuat.");
      await logAdminAction({
        classId: classRow.id,
        actorId: profile.id,
        action: "announcements.create",
        entityType: "announcements",
        entityId: data.id,
        metadata: { title: data.title, status: data.status },
      });
    }

    setFormOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget || !classRow || !profile) return;
    setDeleting(true);
    const { error: deleteError } = await supabase.from("announcements").delete().eq("id", deleteTarget.id);
    setDeleting(false);

    if (deleteError) {
      notify("Gagal menghapus: " + deleteError.message, "error");
      setDeleteTarget(null);
      return;
    }

    setItems((prev) => (prev ?? []).filter((i) => i.id !== deleteTarget.id));
    notify(`Pengumuman "${deleteTarget.title}" dihapus.`);
    await logAdminAction({
      classId: classRow.id,
      actorId: profile.id,
      action: "announcements.delete",
      entityType: "announcements",
      entityId: deleteTarget.id,
      metadata: { title: deleteTarget.title },
    });
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Kelola Pengumuman</h1>
          <p className="mt-1 text-sm text-muted">Siswa hanya melihat pengumuman berstatus "Terbit".</p>
        </div>
        {!formOpen && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Buat baru
          </Button>
        )}
      </div>

      {formOpen && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">
              {editingId ? "Edit pengumuman" : "Pengumuman baru"}
            </h2>
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
            <TextAreaField
              label="Isi pengumuman"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              error={fieldErrors.body}
              disabled={submitting}
            />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AnnouncementInput["status"] }))}
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
      {!error && items !== null && items.length === 0 && (
        <EmptyState title="Belum ada pengumuman" description='Klik "Buat baru" untuk membuat pengumuman pertama.' />
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
                  <p className="mt-1 text-xs text-muted">{formatDateTimeInZone(item.created_at, classRow?.timezone)}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{item.body}</p>
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
        title="Hapus pengumuman ini?"
        description={`"${deleteTarget?.title}" akan dihapus permanen dan tidak bisa dikembalikan.`}
        pending={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
