import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Key,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Zap,
  Users,
  Search,
  Play,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { globalAIProviderService } from '@/services/ai/provider-service';
import type { AIModel } from '@/domain/entities';
import type { HordeConnectionStatus } from '@/infrastructure/ai/horde-adapter';
import { getModelFilterSettings, modelMatchesFilters, saveModelFilterSettings } from '@/services/ai/model-filter-settings';

export const ProviderSelector: React.FC = () => {
  // --- State ---
  const [connectionStatus, setConnectionStatus] = useState<HordeConnectionStatus | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState(globalAIProviderService.getActiveModel());
  const [apiKey, setApiKey] = useState(globalAIProviderService.getApiKey());
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNsfw, setFilterNsfw] = useState(() => getModelFilterSettings().requireNsfw);
  const [filterRu, setFilterRu] = useState(() => getModelFilterSettings().requireRussian);
  const [sortField, setSortField] = useState<'workers' | 'performance' | 'name'>('workers');
  const [sortAsc, setSortAsc] = useState(false);

  // Test generation state
  const [testPrompt, setTestPrompt] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // --- Actions ---

  const checkConnection = useCallback(async () => {
    setCheckingConnection(true);
    try {
      const status = await globalAIProviderService.checkConnection();
      setConnectionStatus(status);
    } catch {
      setConnectionStatus({ online: false, version: '', queuedRequests: 0, threadCount: 0, message: 'Error' });
    } finally {
      setCheckingConnection(false);
    }
  }, []);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setModelsError(null);
    try {
      const fetched = await globalAIProviderService.fetchModels();
      setModels(fetched);
    } catch (err: any) {
      setModelsError(err.message || 'Failed to fetch models');
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const handleSaveApiKey = () => {
    setModelsError(null);
    try {
      globalAIProviderService.setApiKey(apiKey);
      checkConnection();
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : 'Не удалось сохранить API-ключ');
    }
  };

  const handleSelectModel = (modelId: string) => {
    setModelsError(null);
    try {
      globalAIProviderService.setActiveModel(modelId);
      setActiveModelId(modelId);
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : 'Не удалось сохранить выбор модели');
    }
  };

  const handleTestGeneration = async () => {
    if (!activeModelId) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const result = await globalAIProviderService.generate(
        testPrompt || 'Write a short greeting for a traveler entering an ancient library.',
        { modelId: activeModelId, temperature: 0.8, maxTokens: 200 }
      );
      setTestResult(result.text);
    } catch (err: any) {
      setTestError(err.message || 'Generation failed');
    } finally {
      setTesting(false);
    }
  };

  // --- Effects ---

  useEffect(() => {
    checkConnection();
    loadModels();
  }, [checkConnection, loadModels]);

  useEffect(() => {
    try {
      saveModelFilterSettings({ requireNsfw: filterNsfw, requireRussian: filterRu });
    } catch {
      setModelsError('Не удалось сохранить фильтры моделей');
    }
  }, [filterNsfw, filterRu]);

  useEffect(() => {
    if (!activeModelId || models.length === 0) return;
    const activeModel = models.find((model) => model.id === activeModelId);
    if (activeModel && !modelMatchesFilters(activeModel, { requireNsfw: filterNsfw, requireRussian: filterRu })) {
      try { globalAIProviderService.setActiveModel(''); } catch { /* Error is shown when a new selection is saved. */ }
      setActiveModelId('');
    }
  }, [activeModelId, models, filterNsfw, filterRu]);

  // --- Computed ---

  const filteredModels = models
    .filter((m) => {
      if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (!modelMatchesFilters(m, { requireNsfw: filterNsfw, requireRussian: filterRu })) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortField === 'workers') return ((b.workerCount || 0) - (a.workerCount || 0)) * dir;
      if (sortField === 'performance') return ((b.performance || 0) - (a.performance || 0)) * dir;
      return a.name.localeCompare(b.name) * dir;
    });

  const totalWorkers = models.reduce((sum, m) => sum + (m.workerCount || 0), 0);
  const availableModels = models.filter((m) => m.isAvailable).length;

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortIcon: React.FC<{ field: typeof sortField }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  // --- Render ---

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-arcane-accent-glow" />
            AI Providers — AI Horde
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Управление подключением, выбор модели и тестирование генерации
          </p>
        </div>
      </div>

      {/* Connection Status + API Key */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Connection Status Card */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              {connectionStatus?.online
                ? <Wifi className="w-4 h-4 text-emerald-400" />
                : <WifiOff className="w-4 h-4 text-red-400" />
              }
              Статус подключения
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={checkConnection}
              disabled={checkingConnection}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${checkingConnection ? 'animate-spin' : ''}`} />}
            >
              Обновить
            </Button>
          </div>

          {connectionStatus && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {connectionStatus.online ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ONLINE — v{connectionStatus.version}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    OFFLINE — {connectionStatus.message}
                  </span>
                )}
              </div>
              {connectionStatus.online && (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-arcane-950/60 rounded px-2.5 py-1.5 border border-arcane-800/40">
                    <span className="text-slate-400">Потоки:</span>{' '}
                    <span className="text-slate-200 font-mono">{connectionStatus.threadCount}</span>
                  </div>
                  <div className="bg-arcane-950/60 rounded px-2.5 py-1.5 border border-arcane-800/40">
                    <span className="text-slate-400">В очереди:</span>{' '}
                    <span className="text-slate-200 font-mono">{connectionStatus.queuedRequests}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!connectionStatus && !checkingConnection && (
            <p className="text-xs text-slate-500 italic">Проверка не выполнена</p>
          )}
          {checkingConnection && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Проверка...
            </p>
          )}
        </Card>

        {/* API Key Card */}
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Key className="w-4 h-4 text-arcane-gold" />
            API Ключ
          </h3>

          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={apiKeyVisible ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Введите API ключ AI Horde..."
                  className="w-full bg-arcane-950 border border-arcane-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-arcane-accent font-mono pr-8"
                />
                <button
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                </button>
              </div>
              <Button size="sm" variant="secondary" onClick={handleSaveApiKey}>
                Сохранить
              </Button>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              {globalAIProviderService.isAnonymous() ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Анонимный доступ (низкий приоритет)
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Пользовательский ключ активен
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Models Browser */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-arcane-cyan" />
            Доступные модели
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-arcane-800 text-slate-400">
              {availableModels} активных / {models.length} всего
            </span>
          </h3>

          <div className="flex items-center gap-2">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3" /> Воркеров: <span className="font-mono text-slate-300">{totalWorkers}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadModels}
              disabled={loadingModels}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`} />}
            >
              Обновить
            </Button>
          </div>
        </div>

        {/* Search & Thematic Filter Checkboxes */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск моделей по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-arcane-950 border border-arcane-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-arcane-accent"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Checkbox 1: NSFW */}
            <label className={`cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 select-none ${
              filterNsfw 
                ? 'bg-purple-950 border-purple-500/80 text-purple-200 shadow-md shadow-purple-900/40' 
                : 'bg-arcane-950 border-arcane-800 text-slate-400 hover:text-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={filterNsfw}
                onChange={(e) => setFilterNsfw(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-arcane-700 bg-arcane-900 text-purple-600 focus:ring-0 cursor-pointer"
              />
              <span>🔞 Включает NSFW</span>
            </label>

            {/* Checkbox 2: Russian Language */}
            <label className={`cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 select-none ${
              filterRu 
                ? 'bg-cyan-950 border-cyan-500/80 text-cyan-200 shadow-md shadow-cyan-900/40' 
                : 'bg-arcane-950 border-arcane-800 text-slate-400 hover:text-slate-200'
            }`}>
              <input
                type="checkbox"
                checked={filterRu}
                onChange={(e) => setFilterRu(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-arcane-700 bg-arcane-900 text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <span>🇷🇺 Отвечает на русском</span>
            </label>
          </div>
        </div>

        {/* Models Table */}
        {modelsError && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            ⚠ {modelsError}
          </div>
        )}

        {loadingModels && (
          <div className="flex items-center justify-center py-6 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Загрузка моделей...
          </div>
        )}

        {!loadingModels && filteredModels.length > 0 && (
          <div className="border border-arcane-800/60 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_80px_80px_70px_60px] bg-arcane-900/80 px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-arcane-800/60">
              <button className="text-left hover:text-slate-200 transition-colors" onClick={() => handleSort('name')}>
                Модель <SortIcon field="name" />
              </button>
              <button className="text-center hover:text-slate-200 transition-colors" onClick={() => handleSort('workers')}>
                Воркеры <SortIcon field="workers" />
              </button>
              <button className="text-center hover:text-slate-200 transition-colors" onClick={() => handleSort('performance')}>
                Скорость <SortIcon field="performance" />
              </button>
              <div className="text-center">Контекст</div>
              <div className="text-center">Статус</div>
            </div>

            {/* Table Rows */}
            <div className="max-h-64 overflow-y-auto">
              {filteredModels.map((m) => {
                const isSelected = activeModelId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id)}
                    className={`w-full grid grid-cols-[1fr_80px_80px_70px_60px] px-3 py-2 text-xs text-left transition-all border-b border-arcane-800/30 ${
                      isSelected
                        ? 'bg-arcane-accent/10 border-l-2 border-l-arcane-accent'
                        : 'hover:bg-arcane-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`truncate font-medium ${isSelected ? 'text-arcane-accent-glow' : 'text-slate-200'}`}>
                        {m.name}
                      </span>
                      <span className="shrink-0 text-[9px] text-slate-500">
                        {m.isNsfw === true ? '🔥 NSFW' : m.isNsfw === false ? '🛡 SFW' : '? NSFW'}
                        {' · '}
                        {m.supportsRussian === true ? '🇷🇺 RU+' : '? RU'}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className={`font-mono text-[11px] ${(m.workerCount || 0) > 3 ? 'text-emerald-400' : (m.workerCount || 0) > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                        {m.workerCount || 0}
                      </span>
                    </div>
                    <div className="text-center font-mono text-[11px] text-slate-300">
                      {(m.performance || 0).toFixed(1)} t/s
                    </div>
                    <div className="text-center font-mono text-[11px] text-slate-400">
                      {(m.contextWindow / 1024).toFixed(0)}K
                    </div>
                    <div className="text-center">
                      {m.isAvailable ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">ON</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono">OFF</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!loadingModels && filteredModels.length === 0 && !modelsError && (
          <p className="text-xs text-slate-500 text-center py-4">Модели не найдены</p>
        )}

        {/* Active Model Display */}
        {activeModelId && (
          <div className="flex items-center gap-2 px-3 py-2 bg-arcane-accent/5 border border-arcane-accent/20 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-arcane-accent-glow shrink-0" />
            <span className="text-xs text-slate-300">Активная модель:</span>
            <span className="text-xs font-mono font-semibold text-arcane-accent-glow truncate">{activeModelId}</span>
          </div>
        )}
      </Card>

      {/* Test Generation */}
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Play className="w-4 h-4 text-arcane-emerald" />
          Тест генерации
        </h3>

        <div className="space-y-2">
          <textarea
            placeholder="Тестовый промпт (оставьте пустым для стандартного)..."
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            rows={2}
            className="w-full bg-arcane-950 border border-arcane-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-arcane-accent resize-none"
          />

          <Button
            size="sm"
            onClick={handleTestGeneration}
            disabled={testing || !activeModelId}
            icon={testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          >
            {testing ? 'Генерация...' : 'Запустить тест'}
          </Button>

          {!activeModelId && (
            <p className="text-[11px] text-amber-400">Выберите модель из списка выше</p>
          )}
        </div>

        {testResult && (
          <div className="bg-arcane-950/80 border border-emerald-500/20 rounded-lg p-3 space-y-1">
            <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Ответ модели</div>
            <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{testResult}</p>
          </div>
        )}

        {testError && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-1">
            <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Ошибка генерации</div>
            <p className="text-xs text-red-300 whitespace-pre-wrap">{testError}</p>
          </div>
        )}
      </Card>
    </div>
  );
};
