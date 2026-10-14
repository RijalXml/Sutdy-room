-- =============================================================================
-- StudyRoom — Seed DEMONSTRASI (OPSIONAL)
-- -----------------------------------------------------------------------------
-- PERINGATAN: file ini berisi DATA DEMONSTRASI, bukan data kelas sungguhan.
-- Jangan jalankan file ini di project Supabase PRODUKSI yang sudah dipakai
-- kelas asli — ia akan menambahkan satu baris "classes" baru bernama
-- "[DEMO] Kelas Percobaan" beserta isinya.
--
-- Cara pakai (lokal / staging saja):
--   supabase db reset        -- menjalankan migrations lalu seed ini otomatis, ATAU
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Seed ini TIDAK membuat akun auth.users (tidak ada password demo yang
-- tersimpan di repo). Materi & pengumuman demo dibuat tanpa created_by
-- (NULL) supaya tidak berpura-pura berasal dari admin sungguhan.
-- Untuk mencoba alur admin, undang dirimu sendiri lewat proses invite lalu
-- jadikan admin mengikuti docs/DEPLOYMENT.md § "Membuat admin pertama".
-- =============================================================================

do $$
declare
  v_class_id uuid;
  v_subject_matematika uuid;
  v_subject_bindo uuid;
  v_subject_ipa uuid;
begin
  insert into public.classes (name, timezone)
  values ('[DEMO] Kelas Percobaan', 'Asia/Jakarta')
  returning id into v_class_id;

  insert into public.subjects (class_id, name, color)
  values (v_class_id, 'Matematika', '#22D3EE')
  returning id into v_subject_matematika;

  insert into public.subjects (class_id, name, color)
  values (v_class_id, 'Bahasa Indonesia', '#6D5BFF')
  returning id into v_subject_bindo;

  insert into public.subjects (class_id, name, color)
  values (v_class_id, 'IPA', '#34D399')
  returning id into v_subject_ipa;

  insert into public.schedule_entries (class_id, subject_id, day_of_week, start_time, end_time, room)
  values
    (v_class_id, v_subject_matematika, 1, '07:30', '09:00', 'Ruang 7A'),
    (v_class_id, v_subject_bindo, 1, '09:15', '10:45', 'Ruang 7A'),
    (v_class_id, v_subject_ipa, 3, '07:30', '09:00', 'Lab IPA');

  insert into public.materials (class_id, subject_id, title, content, status)
  values (
    v_class_id,
    v_subject_matematika,
    '[DEMO] Pengenalan Pecahan',
    'Materi contoh untuk menunjukkan tampilan halaman Materi. Ganti dengan materi asli dari admin kelasmu.',
    'published'
  );

  insert into public.announcements (class_id, title, body, status)
  values (
    v_class_id,
    '[DEMO] Selamat datang di StudyRoom',
    'Ini adalah pengumuman contoh. Hapus atau arsipkan setelah kelas sungguhan mulai dikelola oleh admin.',
    'published'
  );

  insert into public.assignments (class_id, subject_id, title, description, due_at, status)
  values (
    v_class_id,
    v_subject_bindo,
    '[DEMO] Ringkasan Bab 1',
    'Tugas contoh untuk menunjukkan halaman Tugas & status progres.',
    now() + interval '7 days',
    'published'
  );
end $$;
