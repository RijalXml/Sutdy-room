import { useEffect } from "react";

const DEFAULT_ACCENT = "#22D3EE";
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Menerapkan warna aksen kustom kelas (diatur lewat Admin Settings) ke seluruh
 * UI dengan menimpa variabel CSS --color-cyan di :root. Semua utility Tailwind
 * (bg-cyan, text-cyan, border-cyan, dst.) otomatis ikut berubah karena Tailwind
 * v4 men-generate-nya sebagai var(--color-cyan, ...) — tidak perlu mengubah
 * satu pun className di komponen.
 */
export function useAccentColor(accentColor: string | null | undefined): void {
  useEffect(() => {
    const value = accentColor && HEX_PATTERN.test(accentColor) ? accentColor : DEFAULT_ACCENT;
    document.documentElement.style.setProperty("--color-cyan", value);

    return () => {
      document.documentElement.style.removeProperty("--color-cyan");
    };
  }, [accentColor]);
}
