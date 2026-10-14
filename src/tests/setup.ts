import "@testing-library/jest-dom/vitest";

// jsdom tidak mengimplementasikan matchMedia — dipakai oleh CSS
// `prefers-reduced-motion` di beberapa komponen/utility di masa depan.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}
