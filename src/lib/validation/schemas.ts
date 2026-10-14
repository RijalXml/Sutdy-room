import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi.").email("Format email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const requestResetSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi.").email("Format email tidak valid."),
});
export type RequestResetInput = z.infer<typeof requestResetSchema>;

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Kata sandi minimal 8 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi kata sandi wajib diisi."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok.",
    path: ["confirmPassword"],
  });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(100, "Nama maksimal 100 karakter."),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const announcementSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(150, "Judul maksimal 150 karakter."),
  body: z.string().trim().min(10, "Isi pengumuman minimal 10 karakter."),
  status: z.enum(["draft", "published", "archived"]),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const materialSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(150, "Judul maksimal 150 karakter."),
  subject_id: z.string().uuid("Pilih mata pelajaran."),
  content: z.string().trim().min(1, "Isi materi tidak boleh kosong."),
  status: z.enum(["draft", "published", "archived"]),
});
export type MaterialInput = z.infer<typeof materialSchema>;

export const assignmentSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(150, "Judul maksimal 150 karakter."),
  subject_id: z.string().uuid("Pilih mata pelajaran."),
  description: z.string().trim().min(1, "Deskripsi tidak boleh kosong."),
  due_at: z.string().min(1, "Tenggat waktu wajib diisi."),
  status: z.enum(["draft", "published", "archived"]),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const scheduleEntrySchema = z
  .object({
    subject_id: z.string().uuid("Pilih mata pelajaran."),
    day_of_week: z.number().int().min(1).max(7),
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam mulai tidak valid."),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam selesai tidak valid."),
    room: z.string().trim().max(60, "Nama ruang maksimal 60 karakter.").optional(),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "Jam selesai harus setelah jam mulai.",
    path: ["end_time"],
  });
export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;

export const classSettingsSchema = z.object({
  name: z.string().trim().min(2, "Nama kelas minimal 2 karakter.").max(100, "Maksimal 100 karakter."),
  label: z.string().trim().max(30, "Label maksimal 30 karakter.").optional().or(z.literal("")),
  app_subtitle: z.string().trim().max(150, "Maksimal 150 karakter.").optional().or(z.literal("")),
  accent_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Gunakan format warna heksadesimal, misalnya #22D3EE."),
  logo_url: z
    .string()
    .trim()
    .url("URL logo tidak valid.")
    .optional()
    .or(z.literal("")),
  timezone: z.string().min(1, "Pilih zona waktu."),
  school_year: z.string().trim().max(20, "Maksimal 20 karakter.").optional().or(z.literal("")),
  welcome_text: z.string().trim().max(500, "Maksimal 500 karakter.").optional().or(z.literal("")),
  banner_text: z.string().trim().max(200, "Maksimal 200 karakter.").optional().or(z.literal("")),
});
export type ClassSettingsInput = z.infer<typeof classSettingsSchema>;

export const subjectSchema = z.object({
  name: z.string().trim().min(2, "Nama mata pelajaran minimal 2 karakter.").max(60, "Maksimal 60 karakter."),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Gunakan format warna heksadesimal, misalnya #22D3EE.")
    .optional()
    .or(z.literal("")),
});
export type SubjectInput = z.infer<typeof subjectSchema>;
