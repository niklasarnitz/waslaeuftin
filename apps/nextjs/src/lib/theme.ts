export type ThemeMode = "light" | "dark" | "system";

// Kept self-contained so the same function can run in <head> before paint.
export function applyTheme(mode?: string | null): ThemeMode {
  if (!mode) {
    try {
      mode = localStorage.getItem("theme-mode");
    } catch {
      // System mode still works when browser storage is unavailable.
    }
  }

  const preference = mode === "light" || mode === "dark" ? mode : "system";
  const dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.themeMode = preference;
  return preference;
}
