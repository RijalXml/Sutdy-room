-- =============================================================================
-- StudyRoom — Migrasi 0002: Pengaturan & branding kelas
-- -----------------------------------------------------------------------------
-- Menambah kolom pada "classes" agar admin bisa mengubah identitas kelas
-- (nama, label, subtitle aplikasi, warna aksen, logo, tahun ajaran, teks
-- sambutan & banner) lewat halaman Admin Settings — tanpa menyentuh kode.
--
-- Tidak ada policy RLS baru yang dibutuhkan: policy "classes_update_admin"
-- dari 0001_init.sql sudah mengizinkan admin mengubah kolom apa pun pada baris
-- kelasnya sendiri (lihat docs/RLS_POLICY.md).
--
-- Aman dijalankan ulang: setiap ALTER TABLE memakai IF NOT EXISTS.
-- =============================================================================

alter table public.classes
  add column if not exists label text,
  add column if not exists app_subtitle text not null default 'Satu Kelas. Satu Ruang. Lebih Mudah Belajar.',
  add column if not exists accent_color text not null default '#22D3EE'
    constraint classes_accent_color_format check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists logo_url text,
  add column if not exists school_year text,
  add column if not exists welcome_text text,
  add column if not exists banner_text text;

comment on column public.classes.label is 'Label singkat kelas, mis. "7A" — ditampilkan di samping nama kelas.';
comment on column public.classes.app_subtitle is 'Tagline yang tampil di bawah logo (login & sidebar). Default: tagline resmi StudyRoom.';
comment on column public.classes.accent_color is 'Warna aksen utama UI untuk kelas ini, format heksadesimal. Default #22D3EE (dark-cyan).';
comment on column public.classes.logo_url is 'URL gambar logo kelas (opsional). Upload file langsung belum didukung di rilis ini — lihat README.';
comment on column public.classes.welcome_text is 'Teks sambutan opsional yang tampil di Beranda siswa.';
comment on column public.classes.banner_text is 'Teks banner pengumuman singkat opsional di atas Beranda (kosong = tidak tampil).';

-- =============================================================================
-- Akhir migrasi 0002_class_settings.sql
-- =============================================================================
