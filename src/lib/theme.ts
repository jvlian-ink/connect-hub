const KEY = "flared:theme";

export type Theme = "dark" | "light";

export function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
}
