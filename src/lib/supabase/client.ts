import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Gagal cepat & jelas daripada membiarkan setiap query gagal diam-diam.
  // eslint-disable-next-line no-console
  console.error(
    "[StudyRoom] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. " +
      "Salin .env.example menjadi .env dan isi dengan nilai dari dashboard Supabase."
  );
}

export const supabase = createClient<Database>(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Mencatat satu tindakan admin ke tabel audit_logs. Dipanggil dari sisi client
 * setelah mutasi admin berhasil — RLS tabel audit_logs memastikan hanya admin
 * aktif yang bisa menulis, dan hanya atas namanya sendiri (actor_id = auth.uid()).
 *
 * JANGAN PERNAH memasukkan password, token, atau data pribadi sensitif ke
 * `metadata`. Simpan ringkasan non-sensitif saja (mis. judul yang diubah).
 */
export async function logAdminAction(params: {
  classId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    class_id: params.classId,
    actor_id: params.actorId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    // Jangan gagalkan keseluruhan aksi admin hanya karena logging gagal —
    // cukup catat ke console agar mudah diperhatikan saat development.
    // eslint-disable-next-line no-console
    console.error("[StudyRoom] Gagal mencatat audit log:", error.message);
  }
}
