import { test, expect } from "@playwright/test";

/**
 * Tes ini butuh:
 *   1. Server dev berjalan dengan .env terisi (Supabase project asli).
 *   2. Satu akun siswa uji coba, emailnya di E2E_STUDENT_EMAIL dan
 *      sandinya di E2E_STUDENT_PASSWORD (jangan commit nilai asli ke repo —
 *      isi lewat shell/CI secret saat menjalankan `npm run test:e2e`).
 * Tanpa dua hal itu, tes ini akan di-skip (lihat test.skip di bawah) alih-alih
 * gagal membingungkan.
 */

const email = process.env.E2E_STUDENT_EMAIL;
const password = process.env.E2E_STUDENT_PASSWORD;

test.describe("Alur masuk & proteksi rute", () => {
  test("rute terproteksi mengarahkan pengguna belum login ke /masuk", async ({ page }) => {
    await page.goto("/beranda");
    await expect(page).toHaveURL(/\/masuk/);
  });

  test("form kosong menampilkan error validasi, tidak mengirim apa pun", async ({ page }) => {
    await page.goto("/masuk");
    await page.getByRole("button", { name: /masuk/i }).click();
    await expect(page.getByText(/email wajib diisi/i)).toBeVisible();
  });

  test.skip(!email || !password, "Set E2E_STUDENT_EMAIL & E2E_STUDENT_PASSWORD untuk menjalankan tes login sungguhan.");
  test("siswa valid berhasil masuk dan melihat Beranda", async ({ page }) => {
    await page.goto("/masuk");
    await page.getByLabel(/^email$/i).fill(email ?? "");
    await page.getByLabel(/kata sandi/i).fill(password ?? "");
    await page.getByRole("button", { name: /masuk/i }).click();

    await expect(page).toHaveURL(/\/beranda/);
    await expect(page.getByRole("heading", { name: /^halo,/i })).toBeVisible();
  });

  test.skip(!email || !password, "Set E2E_STUDENT_EMAIL & E2E_STUDENT_PASSWORD untuk menjalankan tes ini.");
  test("siswa biasa diarahkan ke /403 saat membuka halaman admin", async ({ page }) => {
    await page.goto("/masuk");
    await page.getByLabel(/^email$/i).fill(email ?? "");
    await page.getByLabel(/kata sandi/i).fill(password ?? "");
    await page.getByRole("button", { name: /masuk/i }).click();
    await expect(page).toHaveURL(/\/beranda/);

    await page.goto("/admin/pengaturan");
    await expect(page).toHaveURL(/\/403/);
  });
});
