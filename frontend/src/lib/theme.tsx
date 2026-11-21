import { useCallback, useEffect, useState } from 'react';

export type Theme = 'day' | 'night';

const STORAGE_KEY = 'pl_theme';
export const DEFAULT_THEME: Theme = 'day';

function isTheme(v: unknown): v is Theme {
  return v === 'day' || v === 'night';
}

/** 读取当前主题：localStorage 优先，其次读取 DOM 上已写入的属性，最后回落默认日间模式 */
export function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    /* localStorage 不可用时忽略 */
  }
  const attr = document.documentElement.getAttribute('data-theme');
  return isTheme(attr) ? attr : DEFAULT_THEME;
}

/** 应用主题：写入 <html data-theme> 与 theme-color，保证原生控件与移动端状态栏同步 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme === 'day' ? 'light' : 'dark';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'day' ? '#FFF9F1' : '#0A0B14');
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* 忽略写入失败 */
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === 'day' ? 'night' : 'day'));
  }, []);

  return { theme, setTheme, toggle };
}
