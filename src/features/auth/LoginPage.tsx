import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validation/schemas";
import { Button, TextField } from "@/components/ui/Primitives";
import { BrandMark } from "@/components/layout/Sidebar";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const result = loginSchema.safeParse({ email, password });
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

    const { error } = await supabase.auth.signInWithPassword(result.data);

    setSubmitting(false);

    if (error) {
      setFormError(
        error.message.includes("Invalid login credentials")
          ? "Email atau kata sandi salah. Periksa kembali, lalu coba lagi."
          : "Gagal masuk: " + error.message
      );
      return;
    }

    const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? "/beranda";
    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>

        <div className="rounded-2xl border border-border bg-navy-900 p-6">
          <h1 className="font-display text-xl font-semibold text-ink">Masuk ke StudyRoom</h1>
          <p className="mt-1 text-sm text-muted">Satu Kelas. Satu Ruang. Lebih Mudah Belajar.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              disabled={submitting}
            />
            <TextField
              label="Kata sandi"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              disabled={submitting}
            />

            {formError && (
              <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            )}

            <Button type="submit" loading={submitting} className="mt-1 w-full">
              Masuk
            </Button>
          </form>

          <div className="mt-4 flex justify-between text-sm">
            <Link to="/lupa-sandi" className="text-cyan hover:underline">
              Lupa kata sandi?
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Akun StudyRoom hanya bisa dibuat lewat undangan admin kelasmu — tidak ada pendaftaran
          mandiri.
        </p>
      </div>
    </div>
  );
}
