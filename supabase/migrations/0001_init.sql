-- =============================================================================
-- StudyRoom — Migrasi Awal (0001_init.sql)
-- -----------------------------------------------------------------------------
-- Migrasi ini ditulis agar aman dijalankan ulang (idempotent):
--   * tabel & index pakai IF NOT EXISTS
--   * enum dibuat lewat DO-block yang mengecek pg_type lebih dulu
--   * fungsi pakai CREATE OR REPLACE
--   * policy di-DROP IF EXISTS lalu dibuat ulang
-- Jalankan lewat Supabase CLI: `supabase db push`, atau tempel di SQL Editor
-- dashboard Supabase. Lihat docs/RLS_POLICY.md untuk ringkasan & alasan tiap
-- kebijakan, dan docs/DEPLOYMENT.md untuk langkah penuh.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. ENUM TYPES
-- -----------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('student', 'admin');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type public.content_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'progress_status') then
    create type public.progress_status as enum ('not_started', 'in_progress', 'done');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. HELPER: updated_at trigger
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. TABLES
-- -----------------------------------------------------------------------------

-- classes ---------------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_classes_updated_at on public.classes;
create trigger trg_classes_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();

-- profiles ----------------------------------------------------------------------
-- 1:1 dengan auth.users. Dibuat otomatis lewat trigger on_auth_user_created,
-- TIDAK PERNAH lewat insert langsung dari client (lihat section 6 & RLS policy).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  class_id uuid references public.classes (id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) > 0),
  role public.user_role not null default 'student',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_class_id on public.profiles (class_id);
create index if not exists idx_profiles_role on public.profiles (role);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- subjects ----------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, name)
);

create index if not exists idx_subjects_class_id on public.subjects (class_id);

drop trigger if exists trg_subjects_updated_at on public.subjects;
create trigger trg_subjects_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

-- materials -----------------------------------------------------------------
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  title text not null check (char_length(trim(title)) > 0),
  content text not null default '',
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_materials_class_status on public.materials (class_id, status);
create index if not exists idx_materials_subject on public.materials (subject_id);

drop trigger if exists trg_materials_updated_at on public.materials;
create trigger trg_materials_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- assignments -----------------------------------------------------------------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  due_at timestamptz not null,
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assignments_class_status on public.assignments (class_id, status);
create index if not exists idx_assignments_due_at on public.assignments (due_at);

drop trigger if exists trg_assignments_updated_at on public.assignments;
create trigger trg_assignments_updated_at
  before update on public.assignments
  for each row execute function public.set_updated_at();

-- assignment_progress -----------------------------------------------------------
-- Satu baris per (assignment, siswa). Tidak adanya baris = 'not_started'.
create table if not exists public.assignment_progress (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.progress_status not null default 'not_started',
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create index if not exists idx_assignment_progress_student on public.assignment_progress (student_id);

drop trigger if exists trg_assignment_progress_updated_at on public.assignment_progress;
create trigger trg_assignment_progress_updated_at
  before update on public.assignment_progress
  for each row execute function public.set_updated_at();

-- schedule_entries ----------------------------------------------------------
create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  -- 1 = Senin ... 7 = Minggu (ISO-8601)
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists idx_schedule_class_day on public.schedule_entries (class_id, day_of_week);

drop trigger if exists trg_schedule_updated_at on public.schedule_entries;
create trigger trg_schedule_updated_at
  before update on public.schedule_entries
  for each row execute function public.set_updated_at();

-- announcements ---------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  body text not null check (char_length(trim(body)) > 0),
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_announcements_class_status_created
  on public.announcements (class_id, status, created_at desc);

drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- audit_logs --------------------------------------------------------------------
-- Log tindakan admin. TIDAK PERNAH simpan password, token, atau data sensitif
-- lain di kolom metadata — lihat lib/supabase/client.ts (fungsi logAdminAction).
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_class_created on public.audit_logs (class_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 4. RLS HELPER FUNCTIONS (SECURITY DEFINER, agar policy di tabel "profiles"
--    tidak memicu rekursi RLS tak terbatas)
-- -----------------------------------------------------------------------------

create or replace function public.current_class_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select class_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  );
$$;

-- -----------------------------------------------------------------------------
-- 5. TRIGGER: buat profil otomatis saat ada user baru di auth.users
--    Role SELALU 'student' di sini — tidak bisa diubah lewat metadata signup,
--    supaya user tidak bisa menaikkan role-nya sendiri.
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, class_id, full_name, role, is_active)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'class_id', '')::uuid,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    'student',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 6. TRIGGER: lindungi kolom istimewa pada profiles (role, class_id, is_active)
--    dari self-escalation. Siswa hanya boleh ubah full_name miliknya sendiri;
--    admin boleh ubah role/class_id/is_active untuk anggota di kelasnya.
-- -----------------------------------------------------------------------------

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean := public.is_active_admin();
  caller_class uuid := public.current_class_id();
begin
  if caller_is_admin and old.class_id is not distinct from caller_class then
    -- Admin mengubah anggota di kelasnya sendiri: diizinkan ubah field apa pun
    -- kecuali memindahkan orang itu ke kelas lain (di luar tanggung jawabnya).
    if new.class_id is distinct from old.class_id and new.class_id is distinct from caller_class then
      raise exception 'Admin hanya dapat mengelola anggota di kelasnya sendiri.';
    end if;
    return new;
  end if;

  if auth.uid() = old.id then
    -- Update profil sendiri: kunci kolom istimewa.
    if new.role is distinct from old.role
       or new.class_id is distinct from old.class_id
       or new.is_active is distinct from old.is_active then
      raise exception 'Tidak diizinkan mengubah role, kelas, atau status aktif akun sendiri.';
    end if;
    return new;
  end if;

  raise exception 'Tidak memiliki izin untuk memperbarui profil ini.';
end;
$$;

drop trigger if exists trg_guard_profile_update on public.profiles;
create trigger trg_guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- -----------------------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY — setiap tabel yang terekspos ke client
-- -----------------------------------------------------------------------------

alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.materials enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_progress enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;

-- -----------------------------------------------------------------------------
-- 8. POLICIES
-- -----------------------------------------------------------------------------

-- classes ------------------------------------------------------------------
drop policy if exists "classes_select_members" on public.classes;
create policy "classes_select_members" on public.classes
  for select
  using (id = public.current_class_id());

drop policy if exists "classes_update_admin" on public.classes;
create policy "classes_update_admin" on public.classes
  for update
  using (id = public.current_class_id() and public.is_active_admin())
  with check (id = public.current_class_id() and public.is_active_admin());
-- Tidak ada policy INSERT/DELETE untuk client: kelas dibuat sekali lewat
-- proses setup tepercaya (SQL Editor / seed), lihat docs/DEPLOYMENT.md.

-- profiles -------------------------------------------------------------------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select
  using (id = auth.uid() or (public.is_active_admin() and class_id = public.current_class_id()));

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update
  using (id = auth.uid() or public.is_active_admin())
  with check (id = auth.uid() or public.is_active_admin());
-- Kolom yang boleh berubah per-kasus ditegakkan oleh trigger guard_profile_update,
-- bukan oleh policy ini (Postgres RLS tidak membatasi per-kolom secara native).
-- Tidak ada policy INSERT (profil dibuat lewat trigger on_auth_user_created saja)
-- maupun DELETE (nonaktifkan via is_active, jangan hapus baris).

-- subjects ---------------------------------------------------------------------
drop policy if exists "subjects_select_members" on public.subjects;
create policy "subjects_select_members" on public.subjects
  for select
  using (class_id = public.current_class_id());

drop policy if exists "subjects_insert_admin" on public.subjects;
create policy "subjects_insert_admin" on public.subjects
  for insert
  with check (class_id = public.current_class_id() and public.is_active_admin());

drop policy if exists "subjects_update_admin" on public.subjects;
create policy "subjects_update_admin" on public.subjects
  for update
  using (class_id = public.current_class_id() and public.is_active_admin())
  with check (class_id = public.current_class_id() and public.is_active_admin());

drop policy if exists "subjects_delete_admin" on public.subjects;
create policy "subjects_delete_admin" on public.subjects
  for delete
  using (class_id = public.current_class_id() and public.is_active_admin());

-- materials ----------------------------------------------------------------
drop policy if exists "materials_select" on public.materials;
create policy "materials_select" on public.materials
  for select
  using (
    class_id = public.current_class_id()
    and (status = 'published' or public.is_active_admin())
  );

drop policy if exists "materials_insert_admin" on public.materials;
create policy "materials_insert_admin" on public.materials
  for insert
  with check (class_id = public.current_class_id() and public.is_active_admin());

drop policy if exists "materials_update_admin" on public.materials;
create policy "materials_update_admin" on public.materials
  for update
  using (class_id = public.current_class_id() and public.is_active_admin())
  with check (class_id = public.current_class_id() and public.is_active_admin());

drop policy if exists "materials_delete_admin" on public.materials;
create policy "materials_delete_admin" on public.materials
  for delete
  using (class_id = public.current_class_id() and public.is_active_admin());

-- assignments ----------------------------------------------------------------
drop policy if exists "assignments_select" on public.assignments;
create policy "assignments_select" on public.assignments
  for select
  using (
    class_id = public.current_class_id()
    and (status = 'published' or public.is_active_admin())
  );

drop policy if exists "assignments_insert_admin" on public.assignments;
create policy "assignments_insert_admin" on public.assignments
  for insert
  with check (class_id = public.current_class_id() and public.is_active_admin());

drop policy if exists "assignments_update_admin" on public.assignments;
create policy "assignments_update_admin" on public.assignments
  for update
  using (class_id = public.current_class_id() and public.is_active_admin())
  with check (class_id = public.current_class_id() and public.is_active_admin());

drop policy if exists "assignments_delete_admin" on public.assignments;
create policy "assignments_delete_admin" on public.assignments
  for delete
  using (class_id = public.current_class_id() and public.is_active_admin());

-- assignment_progress ------------------------------------------------------
-- Siswa HANYA boleh baca/ubah barisnya sendiri. Admin HANYA boleh membaca
-- (untuk ringkasan aktivitas) — tidak ada policy UPDATE/DELETE untuk admin,
-- sesuai aturan "siswa hanya dapat mengubah progres tugas miliknya".
drop policy if exists "assignment_progress_select" on public.assignment_progress;
create policy "assignment_progress_select" on public.assignment_progress
  for select
  using (
    student_id = auth.uid()
    or (
      public.is_active_admin()
      and exists (
        select 1 from public.assignments a
        where a.id = assignment_progress.assignment_id
          and a.class_id = public.current_class_id()
      )
    )
  );

drop policy if exists "assignment_progress_insert_own" on public.assignment_progress;
create policy "assignment_progress_insert_own" on public.assignment_progress
  for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_progress.assignment_id
        and a.class_id = public.current_class_id()
        and a.status = 'published'
    )
  );

drop policy if exists "assignment_progress_update_own" on public.assignment_progress;
create policy "assignment_progress_update_own" on public.assignment_progress
  for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- schedule_entries -----------------------------------------------------------
drop policy if exists "schedule_select_members" on public.schedule_entries;
create policy "schedule_select_members" on public.schedule_entries
  for select
  using (class_id = public.current_class_id());

drop policy if exists "schedule_insert_admin" on public.schedule_entries;
create policy "schedule_insert_admin" on public.schedule_entries
  for insert
  with check (class_id = public.current_class_id() and public.is_active_admin());

drop policy if exists "schedule_update_admin" on public.schedule_entries;
create policy "schedule_update_admin" on public.schedule_entries
  for update
  using (class_id = public.current_class_id() and public.is_active_admin())
  with check (class_id = public.current_class_id() and public.is_active_admin());

drop policy if exists "schedule_delete_admin" on public.schedule_entries;
create policy "schedule_delete_admin" on public.schedule_entries
  for delete
  using (class_id = public.current_class_id() and public.is_active_admin());

-- announcements ----------------------------------------------------------------
drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements
  for select
  using (
    class_id = public.current_class_id()
    and (status = 'published' or public.is_active_admin())
  );

drop policy if exists "announcements_insert_admin" on public.announcements;
create policy "announcements_insert_admin" on public.announcements
  for insert
  with check (class_id = public.current_class_id() and public.is_active_admin());

drop policy if exists "announcements_update_admin" on public.announcements;
create policy "announcements_update_admin" on public.announcements
  for update
  using (class_id = public.current_class_id() and public.is_active_admin())
  with check (class_id = public.current_class_id() and public.is_active_admin());

drop policy if exists "announcements_delete_admin" on public.announcements;
create policy "announcements_delete_admin" on public.announcements
  for delete
  using (class_id = public.current_class_id() and public.is_active_admin());

-- audit_logs ---------------------------------------------------------------
-- Hanya admin yang bisa melihat log kelasnya sendiri. Tidak ada UPDATE/DELETE
-- untuk siapa pun lewat client — log bersifat immutable.
drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin" on public.audit_logs
  for select
  using (public.is_active_admin() and class_id = public.current_class_id());

drop policy if exists "audit_logs_insert_admin" on public.audit_logs;
create policy "audit_logs_insert_admin" on public.audit_logs
  for insert
  with check (
    public.is_active_admin()
    and actor_id = auth.uid()
    and class_id = public.current_class_id()
  );

-- =============================================================================
-- Akhir migrasi 0001_init.sql
-- =============================================================================
