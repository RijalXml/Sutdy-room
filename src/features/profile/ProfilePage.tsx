import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { profileSchema } from "@/lib/validation/schemas";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { initials } from "@/lib/permissions/roles";
import { ROLE_LABEL } from "@/types/domain";
import { Button, Card, TextField } from "@/components/ui/Primitives";

export function ProfilePage() {
  const { profile, session, classRow, refreshProfile } = useAuth();
  const { notify } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;

    const result = profileSchema.safeParse({ full_name: fullName });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Nama tidak valid.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: result.data.full_name })
      .eq("id", profile.id);

    setSubmitting(false);

    if (updateError) {
      notify("Gagal menyimpan: " + updateError.message, "error");
      return;
    }
    notify("Profil diperbarui.");
    await refreshProfile();
  }

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Profil</h1>
        <p className="mt-1 text-sm text-muted">Informasi akunmu di StudyRoom.</p>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan text-lg font-semibold text-navy-950" aria-hidden="true">
            {initials(profile.full_name)}
          </div>
          <div>
            <p className="font-display text-base font-semibold text-ink">{profile.full_name}</p>
            <p className="text-sm text-muted">
              {ROLE_LABEL[profile.role]} • {classRow?.name ?? "Belum ada kelas"}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-base font-semibold text-ink">Ubah nama</h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <TextField
            label="Nama lengkap"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={error ?? undefined}
            disabled={submitting}
          />
          <TextField label="Email" value={session?.user.email ?? ""} disabled readOnly hint="Email tidak bisa diubah di sini." />
          <div className="flex justify-end">
            <Button type="submit" loading={submitting}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-xs text-muted">
        Role, kelas, dan status akun hanya bisa diubah oleh admin kelasmu — ini mencegah siapa pun
        menaikkan akses miliknya sendiri.
      </p>
    </div>
  );
}
