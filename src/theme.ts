import { create } from 'zustand';

export type Theme = 'dark' | 'light';
const KEY = 'cs-theme';

const initial = (): Theme => {
  try { const s = localStorage.getItem(KEY); if (s === 'dark' || s === 'light') return s; } catch { /* storage unavailable */ }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export const apply = (t: Theme) => {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f3f5fc' : '#090b13');
};

export const useTheme = create<{ theme: Theme; toggle(): void }>((set, get) => ({
  theme: initial(),
  toggle: () => { const t: Theme = get().theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(KEY, t); } catch { /* ignore */ } apply(t); set({ theme: t }); },
}));

apply(useTheme.getState().theme);   // before first paint, so there is no flash of the wrong theme
