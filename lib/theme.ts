export const THEME_STORAGE_KEY = "meritmun-theme";

export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";

/**
 * Runs blocking in <head> before first paint so the correct theme is on
 * <html> before any stylesheet-dependent pixel is drawn. This is the only
 * sanctioned `dangerouslySetInnerHTML` in the codebase.
 */
export const THEME_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing or storage disabled — the toggle still works for the
    // session, it just will not be remembered. Not worth surfacing.
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}
