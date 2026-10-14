import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase, logAdminAction } from "@/lib/supabase/client";
import { classSettingsSchema } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button, Card, SelectField, TextAreaField, TextField } from "@/components/ui/Primitives";
import { CardListSkeleton, ErrorState } from "@/components/feedback/Feedback";

const TIMEZONES = [
  { value: "Asia/Jakarta", label: "WIB — Asia/Jakarta" },
  { value: "Asia/Makassar", label: "WITA — Asia/Makassar" },
  { value: "Asia/Jayapura", label: "WIT — Asia/Jayapura" },
];

interface FormState {
  name: string;
  label: string;
  app_subtitle: string;
  accent_color: string;
  logo_url: string;
  timezone: string;
  school_year: string;
  welcome_text: string;
  banner_text: string;
}

export function AdminSettingsPage() {
  const { classRow, profile, refreshProfile } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!classRow) return;
    setForm({
      name: classRow.name,
      label: classRow.label ?? "",
      app_subtitle: classRow.app_subtitle,
      accent_color: classRow.accent_color,
      logo_url: classRow.logo_url ?? "",
      timezone: classRow.timezone,
      school_year: classRow.school_year ?? "",
      welcome_text: classRow.welcome_text ?? "",
      banner_text: classRow.banner_text ?? "",
    });
  }, [classRow]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !classRow || !profile) return;

    const result = classSettingsSchema.safeParse(form);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      notify("Periksa kembali isian yang belum sesuai.", "error");
      return;
    }
    setErrors({});
    setSubmitting(true);

    const payload = result.data;
    const { error } = await supabase
      .from("classes")
      .update({
        name: payload.name,
        label: payload.label || null,
        app_subtitle: payload.app_subtitle || "Satu Kelas. Satu Ruang. Lebih Mudah Belajar.",
        accent_color: payload.accent_color,
        logo_url: payload.logo_url || null,
        timezone: payload.timezone,
        school_year: payload.school_year || null,
        welcome_text: payload.welcome_text || null,
        banner_text: payload.banner_text || null,
      })
      .eq("id", classRow.id);

    setSubmitting(false);

    if (error) {
      notify("Gagal menyimpan pengaturan: " + error.message, "error");
      return;
    }

    await logAdminAction({
      classId: classRow.id,
      actorId: profile.id,
      action: "classes.update_settings",
      entityType: "classes",
      entityId: classRow.id,
      metadata: { name: payload.name },
    });

    notify("Pengaturan kelas berhasil disimpan.");
    await refreshProfile();
  }

  if (loadError) return <ErrorState message={loadError} onRetry={() => setLoadError(null)} />;
  if (!form) return <CardListSkeleton rows={1} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Pengaturan Kelas</h1>
        <p className="mt-1 text-sm text-muted">
          Ubah identitas dan tampilan StudyRoom untuk kelasmu. Perubahan langsung tersimpan ke
          database dan terlihat oleh semua anggota kelas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <h2 className="font-display text-base font-semibold text-ink">Identitas kelas</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Nama kelas"
              name="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              error={errors.name}
              disabled={submitting}
            />
            <TextField
              label="Label kelas (opsional)"
              name="label"
              placeholder="contoh: 7A"
              value={form.label}
              onChange={(e) => update("label", e.target.value)}
              error={errors.label}
              disabled={submitting}
            />
            <TextField
              label="Subtitle aplikasi"
              name="app_subtitle"
              value={form.app_subtitle}
              onChange={(e) => update("app_subtitle", e.target.value)}
              error={errors.app_subtitle}
              disabled={submitting}
              className="sm:col-span-2"
            />
            <TextField
              label="Tahun ajaran (opsional)"
              name="school_year"
              placeholder="contoh: 2026/2027"
              value={form.school_year}
              onChange={(e) => update("school_year", e.target.value)}
              error={errors.school_year}
              disabled={submitting}
            />
            <SelectField
              label="Zona waktu kelas"
              name="timezone"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              error={errors.timezone}
              disabled={submitting}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </SelectField>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-base font-semibold text-ink">Tampilan</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="accent_color" className="text-sm font-medium text-ink">
                Warna aksen utama
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Pilih warna aksen"
                  value={/^#[0-9A-Fa-f]{6}$/.test(form.accent_color) ? form.accent_color : "#22D3EE"}
                  onChange={(e) => update("accent_color", e.target.value.toUpperCase())}
                  disabled={submitting}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-navy-950 p-1"
                />
                <input
                  id="accent_color"
                  name="accent_color"
                  value={form.accent_color}
                  onChange={(e) => update("accent_color", e.target.value)}
                  disabled={submitting}
                  aria-invalid={Boolean(errors.accent_color)}
                  className="w-full rounded-lg border border-border bg-navy-950 px-3.5 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                />
              </div>
              {errors.accent_color ? (
                <p role="alert" className="text-xs text-danger">
                  {errors.accent_color}
                </p>
              ) : (
                <p className="text-xs text-muted">Default: #22D3EE. Dipakai untuk tombol utama, tautan, dan status aktif.</p>
              )}
            </div>
            <TextField
              label="URL logo (opsional)"
              name="logo_url"
              placeholder="https://..."
              value={form.logo_url}
              onChange={(e) => update("logo_url", e.target.value)}
              error={errors.logo_url}
              hint="Unggah file langsung belum didukung di rilis ini — tempel tautan gambar untuk saat ini."
              disabled={submitting}
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-base font-semibold text-ink">Beranda siswa</h2>
          <div className="mt-4 flex flex-col gap-4">
            <TextAreaField
              label="Teks sambutan (opsional)"
              name="welcome_text"
              rows={3}
              placeholder="Selamat datang di kelas kita!"
              value={form.welcome_text}
              onChange={(e) => update("welcome_text", e.target.value)}
              error={errors.welcome_text}
              disabled={submitting}
            />
            <TextField
              label="Teks banner pengumuman singkat (opsional)"
              name="banner_text"
              placeholder="contoh: Ujian tengah semester mulai 20 Oktober"
              value={form.banner_text}
              onChange={(e) => update("banner_text", e.target.value)}
              error={errors.banner_text}
              hint="Kosongkan untuk menyembunyikan banner di Beranda."
              disabled={submitting}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() =>
              classRow &&
              setForm({
                name: classRow.name,
                label: classRow.label ?? "",
                app_subtitle: classRow.app_subtitle,
                accent_color: classRow.accent_color,
                logo_url: classRow.logo_url ?? "",
                timezone: classRow.timezone,
                school_year: classRow.school_year ?? "",
                welcome_text: classRow.welcome_text ?? "",
                banner_text: classRow.banner_text ?? "",
              })
            }
          >
            Batal
          </Button>
          <Button type="submit" loading={submitting}>
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
