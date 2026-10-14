/**
 * Tipe ini ditulis manual agar cocok dengan supabase/migrations/0001_init.sql.
 *
 * Setelah project Supabase tersambung, sebaiknya generate ulang otomatis supaya
 * selalu sinkron dengan skema asli:
 *
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 *
 * (butuh Supabase CLI + koneksi internet — tidak bisa dijalankan di sandbox ini,
 * lihat README "Yang belum bisa dijalankan di sini".)
 */

export type UserRole = "student" | "admin";
export type ContentStatus = "draft" | "published" | "archived";
export type ProgressStatus = "not_started" | "in_progress" | "done";

export interface Database {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          label: string | null;
          app_subtitle: string;
          accent_color: string;
          logo_url: string | null;
          school_year: string | null;
          welcome_text: string | null;
          banner_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["classes"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["classes"]["Row"]>;
      };
      profiles: {
        Row: {
          id: string;
          class_id: string | null;
          full_name: string;
          role: UserRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // dibuat lewat trigger on_auth_user_created saja
        Update: Partial<
          Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "role" | "class_id" | "is_active">
        >;
      };
      subjects: {
        Row: {
          id: string;
          class_id: string;
          name: string;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subjects"]["Row"]> & {
          class_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["subjects"]["Row"]>;
      };
      materials: {
        Row: {
          id: string;
          class_id: string;
          subject_id: string;
          title: string;
          content: string;
          status: ContentStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["materials"]["Row"]> & {
          class_id: string;
          subject_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["materials"]["Row"]>;
      };
      assignments: {
        Row: {
          id: string;
          class_id: string;
          subject_id: string;
          title: string;
          description: string;
          due_at: string;
          status: ContentStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["assignments"]["Row"]> & {
          class_id: string;
          subject_id: string;
          title: string;
          due_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Row"]>;
      };
      assignment_progress: {
        Row: {
          id: string;
          assignment_id: string;
          student_id: string;
          status: ProgressStatus;
          updated_at: string;
        };
        Insert: {
          assignment_id: string;
          student_id: string;
          status?: ProgressStatus;
        };
        Update: Partial<Pick<Database["public"]["Tables"]["assignment_progress"]["Row"], "status">>;
      };
      schedule_entries: {
        Row: {
          id: string;
          class_id: string;
          subject_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          room: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["schedule_entries"]["Row"]> & {
          class_id: string;
          subject_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_entries"]["Row"]>;
      };
      announcements: {
        Row: {
          id: string;
          class_id: string;
          title: string;
          body: string;
          status: ContentStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["announcements"]["Row"]> & {
          class_id: string;
          title: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["announcements"]["Row"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          class_id: string | null;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          class_id: string;
          actor_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: never;
      };
    };
  };
}
