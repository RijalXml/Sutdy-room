import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { newPasswordSchema, requestResetSchema } from "@/lib/validation/schemas";
import { Button, TextField } from "@/components/ui/Primitives";
import { BrandMark } from "@/components/layout/Sidebar";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <div className="rounded-2xl border border-border bg-navy-900 p-6">{children}</div>
      </div>
    </div>
  );
}

/** Langkah 1: minta email reset. Rute: /lupa-sandi */
export function RequestPasswordResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = requestResetSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Email tidak valid.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${window.location.origin}/atur-ulang-sandi`,
    });
    setSubmitting(false);

    // Selalu tampilkan pesan sukses yang sama, agar tidak membocorkan email
    // mana yang terdaftar di sistem — kecuali error jaringan/server nyata.
    if (resetError && resetError.status && resetError.status >= 500) {
      setError("Terjadi gangguan di server. Coba lagi beberapa saat lagi.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
          <h1 className="font-display text-lg font-semibold text-ink">Periksa email kamu</h1>
          <p className="text-sm text-muted">
            Jika <strong className="text-ink">{email}</strong> terdaftar, tautan untuk mengatur
            ulang kata sandi sudah dikirim ke sana.
          </p>
          <Link to="/masuk" className="mt-2 text-sm text-cyan hover:underline">
            Kembali ke halaman masuk
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-xl font-semibold text-ink">Lupa kata sandi</h1>
      <p className="mt-1 text-sm text-muted">Masukkan email akun StudyRoom kamu.</p>
      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error ?? undefined}
          disabled={submitting}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Kirim tautan reset
        </Button>
      </form>
      <Link to="/masuk" className="mt-4 inline-block text-sm text-cyan hover:underline">
        Kembali ke halaman masuk
      </Link>
    </Shell>
  );
}

/** Langkah 2: set kata sandi baru setelah klik tautan dari email. Rute: /atur-ulang-sandi */
export function SetNewPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = newPasswordSchema.safeParse({ password, confirmPassword });
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
    const { error } = await supabase.auth.updateUser({ password: result.data.password });
    setSubmitting(false);

    if (error) {
      setFormError(
        "Tautan reset sudah kedaluwarsa atau tidak valid. Minta tautan baru lewat halaman lupa kata sandi."
      );
      return;
    }
    navigate("/beranda", { replace: true });
  }

  return (
    <Shell>
      <h1 className="font-display text-xl font-semibold text-ink">Atur kata sandi baru</h1>
      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <TextField
          label="Kata sandi baru"
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          disabled={submitting}
        />
        <TextField
          label="Konfirmasi kata sandi"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          disabled={submitting}
        />
        {formError && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" loading={submitting} className="w-full">
          Simpan kata sandi baru
        </Button>
      </form>
    </Shell>
  );
}
