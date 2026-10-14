import type { ContentStatus, Database, ProgressStatus, UserRole } from "./database";

export type ClassRow = Database["public"]["Tables"]["classes"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Subject = Database["public"]["Tables"]["subjects"]["Row"];
export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type AssignmentProgress = Database["public"]["Tables"]["assignment_progress"]["Row"];
export type ScheduleEntry = Database["public"]["Tables"]["schedule_entries"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];

export type AssignmentWithProgress = Assignment & {
  progress_status: ProgressStatus;
};

export const ROLE_LABEL: Record<UserRole, string> = {
  student: "Siswa",
  admin: "Admin",
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

export const PROGRESS_LABEL: Record<ProgressStatus, string> = {
  not_started: "Belum dikerjakan",
  in_progress: "Sedang dikerjakan",
  done: "Selesai",
};

export const DAY_LABEL: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

export const DAY_LABEL_SHORT: Record<number, string> = {
  1: "Sen",
  2: "Sel",
  3: "Rab",
  4: "Kam",
  5: "Jum",
  6: "Sab",
  7: "Min",
};
