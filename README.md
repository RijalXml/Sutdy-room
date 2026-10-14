# StudyRoom — Smart Learning Hub

> Satu Kelas. Satu Ruang. Lebih Mudah Belajar.

Platform belajar privat untuk satu kelas SMP: materi, tugas, jadwal, dan
pengumuman dalam satu tempat, dengan akses lewat undangan dan diamankan oleh
PostgreSQL Row Level Security (RLS) di Supabase.

**Status rilis ini: fondasi + sebagian besar fitur inti sudah berfungsi penuh
dan tersambung ke database sungguhan. Beberapa bagian admin masih menyusul —
lihat "Status fitur" di bawah sebelum dipakai di kelas sungguhan.**

---

## 1. Ringkasan status fitur

### ✅ Selesai & tersambung ke Supabase sungguhan (bukan data palsu)

| Area | Detail |
|---|---|
| Autentikasi | Login, lupa/atur ulang kata sandi, logout. Tidak ada pendaftaran mandiri — akun hanya lewat undangan admin. |
| Skema database | Semua tabel di section 7 prompt asli + kolom branding kelas, lengkap dengan index, constraint, dan trigger `updated_at`. |
| Keamanan (RLS) | Kebijakan SELECT/INSERT/UPDATE/DELETE per tabel, role student vs admin, proteksi anti self-escalation. Lihat `docs/RLS_POLICY.md`. |
| Beranda | Ringkasan ringkas: jadwal hari ini, 3 tugas terdekat, 1 pengumuman terbaru. Sengaja TIDAK dibuat jadi dashboard statistik yang ramai. |
| Materi | Siswa: daftar + detail (terfilter mata pelajaran, hanya yang "Terbit"). Admin: CRUD penuh. |
| Tugas | Siswa: daftar + detail, status progres pribadi (belum/sedang/selesai) bisa diubah siswa sendiri. |
| Jadwal | Siswa: tampilan mingguan per hari. |
| Pengumuman | Siswa: daftar yang "Terbit". Admin: CRUD penuh (draf/terbit/arsip). |
| Profil | Lihat info akun, ubah nama sendiri. |
| Admin — Mata Pelajaran | CRUD (tambah/hapus; lihat keterbatasan di bawah). |
| Admin — Pengaturan Kelas | Nama, label, subtitle aplikasi, warna aksen (diterapkan langsung ke UI), URL logo, zona waktu, tahun ajaran, teks sambutan & banner. |
| Tema | Dark Cyan minimal — lihat `docs/DESIGN.md`-nya di bawah di README ini § 6. |
| Audit log | Tabel siap + dicatat otomatis untuk aksi admin pada Pengumuman, Materi, Mata Pelajaran, dan Pengaturan Kelas. |

### 🔜 Belum dibangun di rilis ini (tahap selanjutnya)

| Area | Alasan ditunda | Yang sudah siap |
|---|---|---|
| Admin — Kelola Tugas (CRUD) | Waktu respons terbatas; polanya identik dengan Admin Materi. | Skema `assignments` + RLS + `assignmentSchema` di `lib/validation/schemas.ts` sudah lengkap — tinggal salin `AdminMaterialsPage.tsx` dan ganti tabel/field. |
| Admin — Kelola Jadwal (CRUD) | Sama seperti di atas. | Skema `schedule_entries` + RLS + `scheduleEntrySchema` sudah lengkap. |
| Admin — Kelola Anggota (undang/nonaktifkan) | Butuh Vercel Serverless Function dengan `service_role` key (operasi istimewa, tidak boleh dari frontend) — ini mengikuti section 4 & 8 prompt asli. | Policy RLS tabel `profiles` sudah mendukung admin menonaktifkan anggota di kelasnya; tinggal buat `api/admin/invite-member.ts` + `AdminMembersPage.tsx`. |
| Upload logo (file, bukan URL) | Butuh Supabase Storage bucket + policy privat — ditandai opsional di prompt redesign ("jika stack mendukung upload aman"). | Kolom `classes.logo_url` sudah ada; Admin Settings sudah punya field URL sebagai solusi sementara. |
| Audit log di seluruh aksi admin | Baru dicontohkan di beberapa aksi. | Fungsi `logAdminAction()` di `lib/supabase/client.ts` tinggal dipanggil di handler CRUD yang tersisa. |
| Cakupan test otomatis penuh (section 11 prompt asli) | Hanya subset representatif yang dibuat di rilis ini. | Lihat § 4 di bawah untuk daftar lengkap yang masih perlu ditambahkan. |

### ⚠️ Belum pernah benar-benar dijalankan di sini

Sandbox tempat proyek ini dibuat **tidak punya akses internet** (`npm install`
butuh registry npm; Supabase & Vercel butuh koneksi API). Jadi **typecheck,
lint, unit test, E2E test, dan production build belum pernah benar-benar
dieksekusi** — kode ini ditulis & ditinjau manual dengan hati-hati, tapi
belum diverifikasi oleh tool. Jangan anggap ini "siap produksi" sebelum kamu
menjalankan sendiri perintah di § 3 dan semuanya lolos.

---

## 2. Arsitektur singkat

- **Frontend**: React 19 + TypeScript (strict mode) + Vite + Tailwind CSS v4.
- **Backend**: Supabase (Auth + PostgreSQL + RLS). Tidak ada server kustom —
  semua operasi lewat Supabase client langsung dari frontend, dilindungi RLS.
  Operasi istimewa (butuh `service_role`, seperti mengundang anggota baru)
  akan lewat Vercel Serverless Function di folder `api/` — belum ada di rilis
  ini (lihat tabel di atas).
- **Keamanan berlapis**: route guard di frontend (`RequireAuth`,
  `RequireAdmin`) HANYA untuk pengalaman navigasi. Keamanan sesungguhnya ada
  di RLS policy database — lihat `docs/RLS_POLICY.md`.

```
src/
  app/            App.tsx (routing utama)
  components/     ui/ (Button, Card, dst) · layout/ (Sidebar, AppShell) · feedback/ (Skeleton, EmptyState, dst)
  features/       auth, dashboard, materials, assignments, schedule, announcements, admin/*, profile
  hooks/          useAuth, useToast, useAccentColor
  lib/            supabase/ · validation/ (Zod) · permissions/ · dates/
  types/          database.ts (tipe Supabase) · domain.ts
supabase/
  migrations/     0001_init.sql · 0002_class_settings.sql
  seed.sql        data demonstrasi OPSIONAL
```

---

## 3. Menjalankan secara lokal

```bash
npm install
cp .env.example .env     # lalu isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:5173
```

Pemeriksaan yang tersedia (jalankan sebelum menganggap perubahan "selesai"):

```bash
npm run typecheck   # tsc -b --noEmit
npm run lint         # eslint . --max-warnings 0
npm run test          # vitest run (unit + komponen)
npm run build          # build produksi (tsc -b && vite build)
npm run test:e2e        # playwright test — butuh .env terisi & server jalan
```

---

## 4. Setup Supabase (wajib sebelum aplikasi bisa dipakai)

1. Buat project baru di [supabase.com](https://supabase.com).
2. **Jalankan migrasi**, urut sesuai nomor:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref-kamu>
   npx supabase db push    # menjalankan 0001_init.sql lalu 0002_class_settings.sql
   ```
   Atau tempel isi kedua file `supabase/migrations/*.sql` (urut nomor) ke
   **SQL Editor** di dashboard Supabase jika tidak memakai CLI.
3. **Buat baris `classes` pertama** (lewat SQL Editor dashboard, bukan lewat
   aplikasi — belum ada halaman "buat kelas baru" karena ini aplikasi
   satu-kelas):
   ```sql
   insert into public.classes (name, timezone) values ('Kelas 7A', 'Asia/Jakarta');
   ```
4. **Aktifkan Email provider** di Authentication → Providers (biasanya sudah
   aktif secara default).
5. **(Opsional) jalankan `supabase/seed.sql`** untuk data demonstrasi di
   lingkungan lokal/staging — JANGAN di project produksi yang sudah dipakai
   kelas asli. Lihat peringatan di dalam file itu.
6. Salin **Project URL** dan **anon public key** (Project Settings → API) ke
   `.env`.

### Membuat admin pertama (proses tepercaya, bukan password default)

Tidak ada admin bawaan di kode — ini disengaja (lihat prompt redesign §
Otorisasi). Langkahnya:

1. Daftarkan akunmu lewat Supabase Dashboard → Authentication → Users →
   **Add user** (atau lewat halaman `/masuk` setelah seseorang
   mem-provision akunmu lewat `supabase.auth.admin.inviteUserByEmail`, yang
   akan tersedia di fitur "Kelola Anggota" pada tahap berikutnya).
2. Trigger `handle_new_user` otomatis membuat baris `profiles` dengan
   `role = 'student'`.
3. Jadikan admin **lewat SQL Editor** (satu kali, oleh pemilik project):
   ```sql
   update public.profiles
   set role = 'admin', class_id = '<id-baris-classes-dari-langkah-3-di-atas>'
   where id = '<user-id-dari-auth.users>';
   ```
4. Login lewat `/masuk` — menu admin akan muncul otomatis di sidebar.

---

## 5. Deployment ke Vercel

1. Push repo ini ke GitHub/GitLab/Bitbucket.
2. Di Vercel: **New Project** → import repo → framework preset **Vite**
   terdeteksi otomatis.
3. **Environment Variables** (Project Settings → Environment Variables), isi
   untuk Production *dan* Preview:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - (nanti, saat fitur undang-anggota dibangun) `SUPABASE_SERVICE_ROLE_KEY`
     — **TANPA** awalan `VITE_`, supaya tidak ikut ter-bundle ke frontend.
4. Deploy. Build command default Vercel (`npm run build` / output `dist`)
   sudah sesuai `package.json`.
5. Migrasi database **tidak otomatis jalan saat deploy** — jalankan manual
   lewat `supabase db push` atau SQL Editor sebelum/pada saat deploy fitur
   baru yang butuh kolom/tabel baru. Jangan jalankan migrasi destruktif ke
   data produksi tanpa persetujuan eksplisit.

---

## 6. Arah desain

Tema: **dark cyan, minim, rapi** — lihat token warna di
`src/styles/globals.css` (`@theme`). Warna aksen bisa ditimpa per kelas lewat
halaman **Pengaturan Kelas** (admin) tanpa mengubah kode, karena semua
komponen memakai variabel CSS `--color-cyan`, bukan warna hex langsung.

Prinsip yang diikuti: aksen cyan dipakai selektif (bukan di semua elemen),
tanpa gradient/glow/glassmorphism, kartu hanya dipakai saat benar-benar
membantu, dan Beranda sengaja tidak dijadikan dashboard statistik yang
ramai.

---

## 7. Troubleshooting

| Gejala | Kemungkinan penyebab |
|---|---|
| Layar putih / error di console tentang `VITE_SUPABASE_URL` | `.env` belum diisi atau salah nama variabel. Restart `npm run dev` setelah mengubah `.env` — Vite tidak memuat ulang env secara otomatis. |
| Login berhasil tapi langsung ke halaman error / data kosong | Baris `classes` & trigger `handle_new_user` belum ada — cek § 4. |
| Admin tidak melihat menu "Admin" | Role di `profiles` masih `student`. Perbarui lewat SQL Editor (§ 4). |
| "new row violates row-level security policy" saat menyimpan | Tanda RLS bekerja sesuai desain — periksa `docs/RLS_POLICY.md` untuk tahu kebijakan mana yang menolak, dan pastikan akun yang dipakai punya role/kelas yang sesuai. |
| Tombol hapus mata pelajaran gagal | Mata pelajaran itu masih dipakai materi/tugas/jadwal (`ON DELETE RESTRICT` disengaja, lihat § 7 prompt asli "jangan menghapus data terkait secara tidak terduga"). Pindahkan/hapus dulu data yang memakainya. |
| `npm install` gagal di lingkungan ini (sandbox Claude) | Sandbox tidak terhubung internet. Jalankan di mesinmu sendiri atau lewat Claude Code dengan akses jaringan. |

---

## 8. Keamanan — ringkasan

- Tidak ada password yang pernah disimpan di luar Supabase Auth.
- `service_role` key tidak pernah ada di kode frontend atau variabel `VITE_*`
  — lihat `.env.example` untuk pemisahan jelas mana yang aman di frontend.
- Role tidak bisa dinaikkan sendiri oleh pengguna manapun — ditegakkan oleh
  trigger database (`guard_profile_update`), bukan cuma UI.
- Setiap tabel yang terekspos ke client dilindungi RLS, diuji lewat
  `docs/RLS_POLICY.md` (termasuk skenario yang SEHARUSNYA ditolak).
- Tindakan destruktif (hapus pengumuman/materi/mata pelajaran) selalu minta
  konfirmasi lewat dialog, tidak langsung terjadi saat klik pertama.

Detail lengkap kebijakan RLS per tabel: **`docs/RLS_POLICY.md`**.
