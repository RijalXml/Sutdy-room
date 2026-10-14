-- =============================================================================
-- StudyRoom — Test RLS otomatis (pgTAP)
-- -----------------------------------------------------------------------------
-- STATUS JUJUR: file ini ditulis mengikuti pola resmi Supabase untuk pgTAP,
-- tapi BELUM PERNAH dijalankan — sandbox pembuatan proyek ini tidak punya
-- instance Postgres + ekstensi pgtap maupun akses jaringan. Jalankan dengan:
--
--   supabase test db
--
-- di lingkunganmu sendiri, dan perbaiki jika ada perbedaan kecil dari versi
-- Supabase CLI yang kamu pakai (terutama bagian insert ke auth.users, yang
-- kolom wajibnya bisa berbeda antar versi). Lihat docs/RLS_POLICY.md.
-- =============================================================================

begin;
select plan(8);

-- -----------------------------------------------------------------------------
-- Setup: dua kelas, dua siswa (satu per kelas), satu admin, beberapa konten.
-- -----------------------------------------------------------------------------

insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'siswa-a@test.local', 'x', now(), 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'siswa-b@test.local', 'x', now(), 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'admin-a@test.local', 'x', now(), 'authenticated', 'authenticated');

insert into public.classes (id, name, timezone)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Kelas Uji A', 'Asia/Jakarta'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Kelas Uji B', 'Asia/Jakarta');

-- Trigger handle_new_user sudah membuat baris profiles untuk ketiganya
-- (role='student', class_id=NULL). Perbarui jadi sesuai skenario test:
update public.profiles set class_id = 'aaaaaaaa-0000-0000-0000-000000000001', role = 'student'
  where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set class_id = 'aaaaaaaa-0000-0000-0000-000000000002', role = 'student'
  where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set class_id = 'aaaaaaaa-0000-0000-0000-000000000001', role = 'admin'
  where id = '33333333-3333-3333-3333-333333333333';

insert into public.subjects (id, class_id, name)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Matematika');

insert into public.materials (id, class_id, subject_id, title, content, status)
values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001', 'Materi Uji', 'isi', 'published');

-- -----------------------------------------------------------------------------
-- 1) Siswa di Kelas A TIDAK bisa mengubah materi (hanya admin yang boleh)
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

update public.materials set title = 'Diubah paksa oleh siswa'
  where id = 'cccccccc-0000-0000-0000-000000000001';

select is(
  (select title from public.materials where id = 'cccccccc-0000-0000-0000-000000000001'),
  'Materi Uji',
  'Siswa tidak bisa mengubah judul materi — RLS menolak UPDATE'
);

reset role;

-- -----------------------------------------------------------------------------
-- 2) Siswa TIDAK bisa menaikkan role sendiri jadi admin
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111' $$,
  null,
  null,
  'Siswa mencoba menaikkan role sendiri — trigger guard_profile_update menolak dengan exception'
);

reset role;

-- -----------------------------------------------------------------------------
-- 3) Siswa Kelas B TIDAK bisa melihat materi Kelas A (beda kelas)
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select count(*)::int from public.materials where id = 'cccccccc-0000-0000-0000-000000000001'),
  0,
  'Siswa kelas lain tidak melihat materi kelas A sama sekali (RLS SELECT)'
);

reset role;

-- -----------------------------------------------------------------------------
-- 4) Admin Kelas A bisa mengubah materinya sendiri
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;

update public.materials set title = 'Diubah oleh admin'
  where id = 'cccccccc-0000-0000-0000-000000000001';

select is(
  (select title from public.materials where id = 'cccccccc-0000-0000-0000-000000000001'),
  'Diubah oleh admin',
  'Admin kelas A BERHASIL mengubah materi kelasnya sendiri'
);

-- -----------------------------------------------------------------------------
-- 5) Admin Kelas A TIDAK bisa membuat materi di Kelas B (bukan tanggung jawabnya)
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.materials (class_id, subject_id, title, content, status)
     values ('aaaaaaaa-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'Nyelonong', 'x', 'draft') $$,
  null,
  null,
  'Admin kelas A mencoba membuat materi di kelas B — RLS WITH CHECK menolak'
);

reset role;

-- -----------------------------------------------------------------------------
-- 6) Siswa hanya bisa menulis assignment_progress miliknya sendiri
-- -----------------------------------------------------------------------------
insert into public.assignments (id, class_id, subject_id, title, description, due_at, status)
values ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001', 'Tugas Uji', 'desc', now() + interval '3 days', 'published');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

insert into public.assignment_progress (assignment_id, student_id, status)
values ('dddddddd-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'in_progress');

select is(
  (select status::text from public.assignment_progress
     where assignment_id = 'dddddddd-0000-0000-0000-000000000001'
       and student_id = '11111111-1111-1111-1111-111111111111'),
  'in_progress',
  'Siswa berhasil menulis progres TUGASNYA SENDIRI'
);

select throws_ok(
  $$ insert into public.assignment_progress (assignment_id, student_id, status)
     values ('dddddddd-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'done') $$,
  null,
  null,
  'Siswa A mencoba menulis progres ATAS NAMA siswa B — RLS WITH CHECK menolak'
);

reset role;

-- -----------------------------------------------------------------------------
-- 7) Admin TIDAK punya policy UPDATE untuk assignment_progress siswa lain
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;

update public.assignment_progress set status = 'done'
  where assignment_id = 'dddddddd-0000-0000-0000-000000000001'
    and student_id = '11111111-1111-1111-1111-111111111111';

select is(
  (select status::text from public.assignment_progress
     where assignment_id = 'dddddddd-0000-0000-0000-000000000001'
       and student_id = '11111111-1111-1111-1111-111111111111'),
  'in_progress',
  'Admin TIDAK bisa mengubah progres tugas milik siswa — tetap "in_progress", bukan "done"'
);

reset role;

select * from finish();
rollback;
