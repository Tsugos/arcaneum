import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Palette, 
  HardDrive, 
  Download, 
  Upload, 
  Database,
  Type,
  RefreshCw,
  Check
} from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { globalThemeService, type ThemeMode } from '@/services/theme/theme-service';
import { globalBackupService } from '@/services/backup/backup-service';

const ACCENT_PRESETS = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Purple', color: '#a855f7' },
];

export const SettingsView: React.FC = () => {
  const [theme, setThemeState] = useState(() => globalThemeService.getTheme());
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState({
    personasCount: 0,
    lorebooksCount: 0,
    sessionsCount: 0,
    messagesCount: 0,
    memoriesCount: 0,
  });

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await globalBackupService.getStorageStats();
      setStats(data);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleThemeChange = (mode: ThemeMode) => {
    globalThemeService.setTheme({ mode });
    setThemeState(globalThemeService.getTheme());
  };

  const handleFontSizeChange = (fontSize: 'sm' | 'md' | 'lg') => {
    globalThemeService.setTheme({ fontSize });
    setThemeState(globalThemeService.getTheme());
  };

  const handleAccentChange = (accentColor: string) => {
    globalThemeService.setTheme({ accentColor });
    setThemeState(globalThemeService.getTheme());
  };

  const handleExportWorkspace = async () => {
    const pkg = await globalBackupService.exportWorkspace();
    const jsonStr = JSON.stringify(pkg, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arcaneum_workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportWorkspace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const pkg = JSON.parse(text);
        await globalBackupService.importWorkspace(pkg);
        alert('Резервная копия Workspace успешно импортирована! Страница будет перезагружена.');
        window.location.reload();
      } catch (err: any) {
        alert(`Ошибка при импорте резервной копии: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-arcane-accent-glow" />
          Settings & Backup Manager
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Настройки оформления, темы, размера шрифтов и полного импорта/экспорта Workspace
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Engine */}
        <Card className="p-4 bg-arcane-900/60 border-arcane-800 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Palette className="w-4 h-4 text-arcane-accent-glow" />
            Theme Engine (Оформление)
          </h3>

          <div className="space-y-4 text-xs">
            {/* Theme Mode */}
            <div>
              <label className="block text-slate-400 mb-2 font-medium">Режим темы</label>
              <div className="grid grid-cols-4 gap-2">
                {(['dark', 'light', 'cyberpunk', 'system'] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleThemeChange(mode)}
                    className={`py-2 px-2 rounded-lg border text-center font-medium capitalize transition-all text-xs ${
                      theme.mode === mode
                        ? 'border-arcane-accent bg-arcane-accent/15 text-arcane-accent-glow font-bold'
                        : 'border-arcane-800 hover:border-arcane-700 text-slate-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-slate-400 mb-2 font-medium flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" /> Масштаб шрифта
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['sm', 'md', 'lg'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleFontSizeChange(size)}
                    className={`py-1.5 px-3 rounded-lg border text-center font-mono uppercase text-xs transition-all ${
                      theme.fontSize === size
                        ? 'border-arcane-accent bg-arcane-accent/15 text-arcane-accent-glow font-bold'
                        : 'border-arcane-800 hover:border-arcane-700 text-slate-400'
                    }`}
                  >
                    {size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Colors */}
            <div>
              <label className="block text-slate-400 mb-2 font-medium">Акцентный цвет</label>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((preset) => {
                  const isSelected = theme.accentColor === preset.color;
                  return (
                    <button
                      key={preset.color}
                      onClick={() => handleAccentChange(preset.color)}
                      style={{ backgroundColor: preset.color }}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow"
                      title={preset.name}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Workspace Storage & Backup */}
        <Card className="p-4 bg-arcane-900/60 border-arcane-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-arcane-gold" />
              Резервное копирование Workspace
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Полный экспорт/импорт всего вашего пространства Arcaneum (персонажи, сообщения, лорбуки, память).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportWorkspace}
            >
              Экспорт Workspace JSON
            </Button>

            <label className="cursor-pointer">
              <input type="file" accept=".json" onChange={handleImportWorkspace} className="hidden" />
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload className="w-4 h-4" />}
              >
                Импорт Workspace JSON
              </Button>
            </label>
          </div>
        </Card>
      </div>

      {/* Storage Statistics Dashboard */}
      <Card className="p-4 bg-arcane-900 border-arcane-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Статистика локального хранилища IndexedDB
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadStats}
            disabled={loadingStats}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />}
          >
            Обновить
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 bg-arcane-950 rounded-lg border border-arcane-800 text-center">
            <div className="text-lg font-bold text-slate-100">{stats.personasCount}</div>
            <div className="text-[10px] text-slate-400">Personas</div>
          </div>

          <div className="p-3 bg-arcane-950 rounded-lg border border-arcane-800 text-center">
            <div className="text-lg font-bold text-slate-100">{stats.lorebooksCount}</div>
            <div className="text-[10px] text-slate-400">Lorebooks</div>
          </div>

          <div className="p-3 bg-arcane-950 rounded-lg border border-arcane-800 text-center">
            <div className="text-lg font-bold text-slate-100">{stats.sessionsCount}</div>
            <div className="text-[10px] text-slate-400">Sessions</div>
          </div>

          <div className="p-3 bg-arcane-950 rounded-lg border border-arcane-800 text-center">
            <div className="text-lg font-bold text-slate-100">{stats.messagesCount}</div>
            <div className="text-[10px] text-slate-400">Messages</div>
          </div>

          <div className="p-3 bg-arcane-950 rounded-lg border border-arcane-800 text-center">
            <div className="text-lg font-bold text-slate-100">{stats.memoriesCount}</div>
            <div className="text-[10px] text-slate-400">Memories</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
