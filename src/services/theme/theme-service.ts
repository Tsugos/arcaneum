/**
 * Arcaneum Theme Engine Service
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/THEME_ENGINE.md
 */

import { globalServiceRegistry } from '@/core/service-registry';

export type ThemeMode = 'dark' | 'light' | 'system' | 'cyberpunk';

export interface ThemeConfig {
  mode: ThemeMode;
  accentColor: string; // Hex color
  fontSize: 'sm' | 'md' | 'lg';
}

const STORAGE_KEY = 'arcaneum_theme_config';

export const defaultThemeConfig: ThemeConfig = {
  mode: 'dark',
  accentColor: '#6366f1',
  fontSize: 'md',
};

export class ThemeService {
  private currentConfig: ThemeConfig;

  constructor() {
    this.currentConfig = this.loadSavedConfig();
    this.applyTheme(this.currentConfig);
  }

  private loadSavedConfig(): ThemeConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultThemeConfig, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[ThemeService] Could not read theme from localStorage');
    }
    return defaultThemeConfig;
  }

  public getTheme(): ThemeConfig {
    return { ...this.currentConfig };
  }

  public setTheme(config: Partial<ThemeConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentConfig));
    } catch (e) {
      console.warn('[ThemeService] Could not save theme to localStorage');
    }
    this.applyTheme(this.currentConfig);
  }

  public applyTheme(config: ThemeConfig): void {
    const root = document.documentElement;

    // Reset theme classes
    root.classList.remove('dark', 'light', 'cyberpunk');

    let effectiveMode = config.mode;
    if (effectiveMode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveMode = prefersDark ? 'dark' : 'light';
    }

    root.classList.add(effectiveMode);

    // Font size scaling
    if (config.fontSize === 'sm') {
      root.style.fontSize = '14px';
    } else if (config.fontSize === 'lg') {
      root.style.fontSize = '17px';
    } else {
      root.style.fontSize = '15px';
    }

    // Custom accent color override
    if (config.accentColor) {
      root.style.setProperty('--arcane-accent-custom', config.accentColor);
    }
  }
}

export const globalThemeService = new ThemeService();
globalServiceRegistry.register('ThemeService', globalThemeService);
