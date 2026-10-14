# Kebijakan Row Level Security (RLS) — StudyRoom

Dokumen ini menjelaskan **setiap** kebijakan RLS di `supabase/migrations/0001_init.sql`
dan **mengapa** kebijakan itu ditulis seperti itu. Route guard di frontend
(`RequireAuth`, `RequireAdmin`) hanya mengatur navigasi — baris di bawah ini
adalah lapisan keamanan yang sesungguhnya.

Cara verifikasi: lihat § "Cara menguji sendiri" di bagian bawah, dan jalankan
test pgTAP di `supabase/tests/database/rls.test.sql` (lihat catatan jujur di
bagian itu tentang status eksekusinya).

## Prinsip umum

- Setiap tabel yang terekspos ke client (`anon`/`authenticated`) di-`ENABLE ROW LEVEL SECURITY`.
- Tidak ada policy untuk sebuah operasi = operasi itu DITOLAK secara default (Postgres RLS "deny by default").
- Dua fungsi `SECURITY DEFINER` (`current_class_id()`, `is_active_admin()`) dipakai di hampir semua policy, supaya policy di tabel `profiles` sendiri tidak memicu rekursi RLS tak terbatas (pola standar yang didokumentasikan Supabase).
- Admin selalu dibatasi ke kelasnya sendiri (`class_id = current_class_id()`) — sesuai aturan "Admin hanya dapat mengelola kelas yang menjadi tanggung jawabnya".

## Per tabel

### `classes`
| Operasi | Siapa | Alasan |
|---|---|---|
| SELECT | Anggota kelas itu sendiri | Siswa tidak perlu melihat kelas lain. |
| UPDATE | Admin aktif, hanya kelasnya sendiri | Dipakai oleh halaman Pengaturan Kelas. |
| INSERT/DELETE | Tidak ada policy client | Kelas dibuat sekali lewat proses setup tepercaya (lihat README § 4), bukan dari aplikasi — ini aplikasi satu-kelas. |

### `profiles`
| Operasi | Siapa | Alasan |
|---|---|---|
| SELECT | Baris sendiri, ATAU admin aktif melihat anggota di kelasnya | Siswa tidak melihat profil siswa lain (privasi anak di bawah umur), admin perlu melihat roster. |
| UPDATE | Baris sendiri ATAU admin pada anggota kelasnya | **Kolom mana yang boleh berubah ditegakkan trigger `guard_profile_update`, bukan policy ini** — siswa hanya boleh ubah `full_name`, tidak bisa ubah `role`/`class_id`/`is_active` miliknya sendiri, bahkan lewat request API langsung. |
| INSERT | Tidak ada policy client | Baris dibuat **otomatis** oleh trigger `handle_new_user` (`SECURITY DEFINER`, jalan sebagai pemilik tabel, melewati RLS) saat ada user baru di `auth.users`. Role SELALU di-hardcode `'student'` di trigger ini — metadata signup tidak bisa dipakai memalsukan role. |
| DELETE | Tidak ada policy client | Nonaktifkan lewat `is_active = false`, jangan hapus baris (riwayat tugas/progres tetap valid). |

### `subjects`, `materials`, `assignments`, `schedule_entries`, `announcements`
Pola yang sama di kelimanya:

| Operasi | Siapa |
|---|---|
| SELECT | Anggota kelas — untuk `materials`/`assignments`/`announcements`, siswa hanya lihat `status = 'published'`; admin lihat semua status (termasuk draf). `subjects`/`schedule_entries` tidak punya status, semua anggota kelas lihat semua baris. |
| INSERT / UPDATE / DELETE | Admin aktif, dan baris harus berada di kelasnya sendiri (`class_id = current_class_id()`) |

### `assignment_progress`
Yang paling ketat, karena ini data pribadi tiap siswa:

| Operasi | Siapa | Alasan |
|---|---|---|
| SELECT | Siswa pemilik baris, ATAU admin aktif (hanya untuk tugas di kelasnya) | Admin boleh *melihat* ringkasan progres untuk memantau kelas. |
| INSERT / UPDATE | HANYA siswa pemilik (`student_id = auth.uid()`), dan hanya untuk tugas yang `status = 'published'` di kelasnya | **Tidak ada policy UPDATE untuk admin sama sekali** — sesuai aturan "siswa hanya dapat mengubah progres tugas miliknya", admin tidak bisa mengubah progres siswa lain walau lewat SQL Editor dengan role `authenticated` biasa. |
| DELETE | Tidak ada policy | Baris progres tidak pernah dihapus, hanya diubah statusnya. |

### `audit_logs`
| Operasi | Siapa | Alasan |
|---|---|---|
| SELECT | Admin aktif, hanya log kelasnya | Log adalah data sensitif administratif. |
| INSERT | Admin aktif, dan `actor_id` harus dirinya sendiri | Mencegah admin "memalsukan" log atas nama admin lain. |
| UPDATE / DELETE | Tidak ada policy — SENGAJA | Log harus *immutable*. Tidak ada cara mengubah/menghapus log lewat API biasa sama sekali. |

## Kolom metadata yang TIDAK boleh ada di `audit_logs.metadata`

Fungsi `logAdminAction()` di `src/lib/supabase/client.ts` hanya dipanggil
secara manual dari kode admin dengan ringkasan non-sensitif (judul, status).
Jangan pernah menambahkan password, token, isi pesan pribadi siswa, atau data
sensitif lain ke parameter `metadata` di pemanggilan manapun.

## Cara menguji sendiri (manual, lewat SQL Editor dashboard)

Cara tercepat untuk membuktikan RLS benar-benar menolak akses tak sah tanpa
perlu pgTAP: buat dua user test (satu siswa, satu admin kelas LAIN), lalu di
SQL Editor:

```sql
-- Simulasikan sesi siswa "siswa-a" (ganti UUID dengan id user asli)
select set_config('request.jwt.claims', '{"sub":"<uuid-siswa-a>","role":"authenticated"}', true);
set local role authenticated;

-- Harus GAGAL (0 baris terupdate, tanpa error "permission denied" eksplisit —
-- RLS membuatnya tampak seperti baris tidak ada):
update public.materials set title = 'Diubah paksa' where id = '<id-materi-apa-saja>';

-- Harus GAGAL juga (siswa tidak boleh menaikkan role sendiri):
update public.profiles set role = 'admin' where id = '<uuid-siswa-a>';
```

Jika query di atas mengubah 0 baris (bukan error, karena RLS membuat baris
"tidak terlihat" bagi role yang tidak berhak) — RLS bekerja sesuai desain.

## Test otomatis (pgTAP) — status jujur

`supabase/tests/database/rls.test.sql` berisi test pgTAP yang mengenkode
skenario-skenario di atas secara otomatis (siswa gagal mengubah materi orang
lain, siswa gagal menaikkan role sendiri, admin kelas lain gagal mengelola
kelas yang bukan miliknya, dst). **Test ini ditulis dengan hati-hati
mengikuti pola resmi Supabase (`supabase test db`), tapi BELUM PERNAH
dijalankan di sandbox ini** — sandbox tidak punya instance Postgres dengan
Supabase Auth + ekstensi `pgtap` terpasang maupun akses jaringan. Jalankan:

```bash
supabase test db
```

di lingkunganmu sendiri (atau lewat Claude Code yang tersambung ke project
Supabase-mu) untuk benar-benar memverifikasinya, dan laporkan jika ada yang
gagal — kemungkinan besar perlu penyesuaian kecil pada cara membuat user uji
coba sesuai versi CLI Supabase yang kamu pakai.
