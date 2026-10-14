import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../LoginPage";

const signInWithPassword = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
    },
  },
}));

describe("LoginPage", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
  });

  it("menampilkan error validasi dan TIDAK memanggil Supabase saat form kosong", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /masuk/i }));

    expect(await screen.findByText(/email wajib diisi/i)).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("memanggil Supabase signInWithPassword dengan data yang valid", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^email$/i), "siswa@contoh.sch.id");
    await user.type(screen.getByLabelText(/kata sandi/i), "sandi-aman-123");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "siswa@contoh.sch.id",
        password: "sandi-aman-123",
      })
    );
  });

  it("menampilkan pesan ramah saat kredensial salah, bukan pesan error mentah", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/^email$/i), "siswa@contoh.sch.id");
    await user.type(screen.getByLabelText(/kata sandi/i), "salah");
    await user.click(screen.getByRole("button", { name: /masuk/i }));

    expect(await screen.findByText(/email atau kata sandi salah/i)).toBeInTheDocument();
  });
});
