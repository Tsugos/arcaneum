import { describe, it, expect } from 'vitest';
import { ThemeService } from '@/services/theme/theme-service';
import { BackupService } from '@/services/backup/backup-service';

describe('Theme Engine & Backup Service', () => {
  it('should switch theme modes cleanly', () => {
    const themeService = new ThemeService();
    themeService.setTheme({ mode: 'cyberpunk', accentColor: '#f59e0b' });

    const theme = themeService.getTheme();
    expect(theme.mode).toBe('cyberpunk');
    expect(theme.accentColor).toBe('#f59e0b');
  });

  it('should export workspace package with valid structure', async () => {
    const backupService = new BackupService();
    const pkg = await backupService.exportWorkspace();

    expect(pkg.format).toBe('arcaneum_workspace_v1');
    expect(pkg.data).toBeDefined();
    expect(Array.isArray(pkg.data.personas)).toBe(true);
    expect(Array.isArray(pkg.data.lorebooks)).toBe(true);
  });
});
