import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Database, 
  Plus, 
  Trash2, 
  ChevronRight, 
  RotateCcw,
  Check,
  Palette,
  Image as ImageIcon,
  Sparkles,
  BookOpen,
  CheckSquare,
  Square
} from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import type { Session, AIModel, MemoryRecord, Lorebook } from '@/domain/entities';
import { globalChatService } from '@/services/chat/chat-service';
import { globalAIProviderService } from '@/services/ai/provider-service';
import { globalMemoryService } from '@/services/memory/memory-service';
import { globalLorebookService } from '@/services/lorebook/lorebook-service';
import { getRpPresetForModel, type ModelRpPreset } from '@/services/ai/horde-model-presets';
import { getModelFilterSettings, modelMatchesFilters, saveModelFilterSettings } from '@/services/ai/model-filter-settings';

export interface ChatMenuModalProps {
  session: Session;
  initialTab?: 'settings' | 'memory' | 'customize' | 'lorebooks';
  onClose: () => void;
  onSessionUpdated: () => void;
}

export const ChatMenuModal: React.FC<ChatMenuModalProps> = ({
  session,
  initialTab = 'settings',
  onClose,
  onSessionUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'memory' | 'customize' | 'lorebooks'>(initialTab);

  // Tab 4: Lorebooks Attachment (User Note 618)
  const [allLorebooks, setAllLorebooks] = useState<Lorebook[]>([]);
  const [sessionLorebookIds, setSessionLorebookIds] = useState<string[]>(session.lorebookIds || []);

  useEffect(() => {
    globalLorebookService.getAllLorebooks().then(setAllLorebooks);
  }, []);

  const handleToggleLorebook = (id: string) => {
    if (sessionLorebookIds.includes(id)) {
      setSessionLorebookIds(sessionLorebookIds.filter((item) => item !== id));
    } else {
      setSessionLorebookIds([...sessionLorebookIds, id]);
    }
  };

  // Tab 1: Models & Generation Parameters
  const [models, setModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(
    session.generationSettings?.modelId || globalAIProviderService.getActiveModel() || ''
  );
  
  // Advanced Generation Controls (User Note 126-128)
  const [temperature, setTemperature] = useState(session.generationSettings?.temperature ?? 0.75);
  const [topP, setTopP] = useState(session.generationSettings?.topP ?? 0.9);
  const [topK, setTopK] = useState(session.generationSettings?.topK ?? 40);
  const [typicalP, setTypicalP] = useState(session.generationSettings?.typicalP ?? 1.0);
  const [repetitionPenalty, setRepetitionPenalty] = useState(session.generationSettings?.repetitionPenalty ?? 1.15);
  const [presencePenalty, setPresencePenalty] = useState(session.generationSettings?.presencePenalty ?? 0.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(session.generationSettings?.frequencyPenalty ?? 0.0);
  const [contextLimit, setContextLimit] = useState(session.generationSettings?.contextLimit ?? 8192);
  const [maxTokens, setMaxTokens] = useState(session.generationSettings?.maxTokens ?? 2500);

  // System Prompt & Banned Words
  const [systemPrompt, setSystemPrompt] = useState(session.systemPromptOverride || '');
  const [bannedWords, setBannedWords] = useState<string[]>(session.bannedWords || []);
  const [newBannedWord, setNewBannedWord] = useState('');

  // Generation Controls Sub-panel
  const [showGenControls, setShowGenControls] = useState(false);

  // Model Filters & RP Auto-Tuner (User Note 395 & 402)
  const [filterNsfw, setFilterNsfw] = useState(() => getModelFilterSettings().requireNsfw);
  const [filterRussian, setFilterRussian] = useState(() => getModelFilterSettings().requireRussian);
  const [autoTuneRp, setAutoTuneRp] = useState(true);
  const [activePresetInfo, setActivePresetInfo] = useState<ModelRpPreset | null>(() => {
    const initialModelId = session.generationSettings?.modelId || '';
    return initialModelId ? getRpPresetForModel(initialModelId) : null;
  });

  const applyAutoTune = (mId: string) => {
    const preset = getRpPresetForModel(mId);
    const model = models.find((item) => item.id === mId);
    const safeContextLimit = model ? Math.min(preset.contextLimit, model.contextWindow) : preset.contextLimit;
    setTemperature(preset.temperature);
    setTopP(preset.topP);
    setTopK(preset.topK);
    setTypicalP(preset.typicalP);
    setRepetitionPenalty(preset.repetitionPenalty);
    setPresencePenalty(preset.presencePenalty);
    setFrequencyPenalty(preset.frequencyPenalty);
    setContextLimit(safeContextLimit);
    setMaxTokens(Math.min(preset.maxTokens, Math.max(256, Math.floor(safeContextLimit / 2))));
    setActivePresetInfo(preset);
  };

  const filteredModelsList = models.filter((m) => modelMatchesFilters(m, {
    requireNsfw: filterNsfw,
    requireRussian: filterRussian,
  }));

  // Tab 2: Memory State
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [summary, setSummary] = useState(session.summary || '');
  const [summarizing, setSummarizing] = useState(false);

  // Tab 3: Session Theme Customizer (User Note 118-120)
  const [bgWallpaperUrl, setBgWallpaperUrl] = useState(session.themeSettings?.bgWallpaperUrl || '');
  const [bubbleTheme, setBubbleTheme] = useState<'purple' | 'cyan' | 'crimson' | 'emerald' | 'oled'>(
    session.themeSettings?.bubbleTheme || 'purple'
  );
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>(
    session.themeSettings?.fontFamily || 'sans'
  );

  useEffect(() => {
    setLoadingModels(true);
    setModelsError(null);
    globalAIProviderService.fetchModels().then((mList) => {
      setModels(mList);
      setLoadingModels(false);
    }).catch((error) => {
      setModelsError(error instanceof Error ? error.message : 'Не удалось загрузить модели');
      setLoadingModels(false);
    });

    globalMemoryService.getMemoriesForSession(session.id).then((m) => setMemories(m));
  }, [session.id]);

  useEffect(() => {
    try {
      saveModelFilterSettings({ requireNsfw: filterNsfw, requireRussian: filterRussian });
    } catch {
      setModelsError('Не удалось сохранить фильтры моделей');
    }
  }, [filterNsfw, filterRussian]);

  useEffect(() => {
    if (!selectedModelId || models.length === 0) return;
    const selected = models.find((model) => model.id === selectedModelId);
    if (selected && !modelMatchesFilters(selected, { requireNsfw: filterNsfw, requireRussian: filterRussian })) {
      setSelectedModelId('');
      setActivePresetInfo(null);
    }
  }, [selectedModelId, models, filterNsfw, filterRussian]);

  const handleSaveSettings = async () => {
    await globalChatService.updateSessionGenerationSettings(session.id, {
      modelId: selectedModelId,
      temperature: Number(temperature),
      topP: Number(topP),
      topK: Number(topK),
      typicalP: Number(typicalP),
      repetitionPenalty: Number(repetitionPenalty),
      presencePenalty: Number(presencePenalty),
      frequencyPenalty: Number(frequencyPenalty),
      contextLimit: Number(contextLimit),
      maxTokens: Number(maxTokens),
    });
    await globalChatService.updateSessionSystemPrompt(session.id, systemPrompt);
    await globalChatService.updateSessionBannedWords(session.id, bannedWords);
    await globalChatService.updateSessionSummary(session.id, summary);

    // Save Theme Customization & Lorebook Settings
    await globalChatService.updateSessionThemeSettings(session.id, {
      bgWallpaperUrl,
      bubbleTheme,
      fontFamily,
    });
    await globalChatService.updateSessionLorebookIds(session.id, sessionLorebookIds);

    onSessionUpdated();
  };

  const handleAddBannedWord = () => {
    if (!newBannedWord.trim()) return;
    if (!bannedWords.includes(newBannedWord.trim())) {
      setBannedWords([...bannedWords, newBannedWord.trim()]);
      setNewBannedWord('');
    }
  };

  const handleRemoveBannedWord = (word: string) => {
    setBannedWords(bannedWords.filter((w) => w !== word));
  };

  const handleAddMemory = async () => {
    if (!newMemoryText.trim()) return;
    await globalMemoryService.addMemory(session.id, session.characterId, 'fact', newMemoryText.trim(), 5, []);
    setNewMemoryText('');
    const updated = await globalMemoryService.getMemoriesForSession(session.id);
    setMemories(updated);
  };

  const handleDeleteMemory = async (id: string) => {
    await globalMemoryService.deleteMemory(id);
    const updated = await globalMemoryService.getMemoriesForSession(session.id);
    setMemories(updated);
  };

  const JANITOR_SUMMARY_PROMPT = `Пожалуйста, проанализируй историю этой ролевой игры и составь краткое структурированное резюме сюжета на русском языке (3-5 пунктов) в формате:
📍 ТЕКУЩАЯ ЛОКАЦИЯ И СЕТТИНГ:
👤 СТАТУС ПЕРСОНАЖЕЙ И ИХ ОТНОШЕНИЯ:
📜 КЛЮЧЕВЫЕ СОБЫТИЯ И ВЕХИ:
💡 ВАЖНЫЕ РЕШЕНИЯ И ФАКТЫ:`;

  const buildTranscript = (messages: Awaited<ReturnType<typeof globalChatService.getMessages>>) =>
    messages
      .map((message) => `${message.role === 'user' ? 'Игрок' : 'Персонаж'}: ${message.textOriginal || message.content}`)
      .join('\n');

  const summarizeTranscript = async (transcript: string, instruction: string) => {
    const result = await globalAIProviderService.generate(`${instruction}\n\nИстория диалога:\n${transcript}`, {
      modelId: selectedModelId || globalAIProviderService.getActiveModel(),
      maxTokens: 700,
    });
    if (!result.text?.trim()) throw new Error('Модель не вернула резюме');
    return result.text.trim();
  };

  const handleAutoSummarize = async () => {
    setSummarizing(true);
    try {
      const messages = await globalChatService.getMessages(session.id);
      if (messages.length === 0) {
        alert('Нет сообщений в истории для создания резюме.');
        setSummarizing(false);
        return;
      }

      const chunkSize = 40;
      const partialSummaries: string[] = [];
      for (let index = 0; index < messages.length; index += chunkSize) {
        const chunk = messages.slice(index, index + chunkSize);
        partialSummaries.push(await summarizeTranscript(buildTranscript(chunk), JANITOR_SUMMARY_PROMPT));
      }

      const generatedSummary = partialSummaries.length === 1
        ? partialSummaries[0]!
        : await summarizeTranscript(
            partialSummaries.map((part, index) => `Часть ${index + 1}:\n${part}`).join('\n\n'),
            `${JANITOR_SUMMARY_PROMPT}\nОбъедини частичные резюме без потери причинно-следственных связей и важных фактов.`
          );
      const latestTimestamp = messages[messages.length - 1]!.timestamp;
      setSummary(generatedSummary);
      await globalChatService.updateSessionSummary(session.id, generatedSummary, latestTimestamp);
      onSessionUpdated();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось создать резюме');
    } finally {
      setSummarizing(false);
    }
  };

  const handleUpdateIncrementalSummary = async () => {
    setSummarizing(true);
    try {
      const messages = await globalChatService.getMessages(session.id);
      if (messages.length === 0) return;

      const newMessages = session.summaryUpdatedThrough
        ? messages.filter((message) => message.timestamp > session.summaryUpdatedThrough!)
        : messages;
      if (newMessages.length === 0) {
        alert('После последнего обновления резюме новых сообщений нет.');
        return;
      }

      const incrementalPrompt = `${JANITOR_SUMMARY_PROMPT}\nНиже дано текущее резюме и только новые события. Обнови резюме: сохрани прежние важные факты, добавь новые и не дублируй уже записанное.\n\nТекущее резюме:\n${summary || 'Пока нет записей'}`;
      const updated = await summarizeTranscript(buildTranscript(newMessages), incrementalPrompt);
      const latestTimestamp = newMessages[newMessages.length - 1]!.timestamp;
      setSummary(updated);
      await globalChatService.updateSessionSummary(session.id, updated, latestTimestamp);
      onSessionUpdated();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось обновить резюме');
    } finally {
      setSummarizing(false);
    }
  };

  const totalMemoryText = `${summary || ''}\n${memories.map((m) => m.content).join('\n')}`;
  const totalMemoryTokens = Math.ceil(totalMemoryText.trim().length / 3.5);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col bg-arcane-900 border-arcane-700 shadow-2xl p-0">
        {/* Header Tabs */}
        <div className="p-4 border-b border-arcane-800 bg-arcane-950 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-arcane-900 p-1 rounded-xl border border-arcane-800">
            <button
              onClick={() => {
                setShowGenControls(false);
                setActiveTab('settings');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Настройки
            </button>
            <button
              onClick={() => {
                setShowGenControls(false);
                setActiveTab('memory');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'memory'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Память
            </button>
            <button
              onClick={() => {
                setShowGenControls(false);
                setActiveTab('customize');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'customize'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Оформление
            </button>
            <button
              onClick={() => {
                setShowGenControls(false);
                setActiveTab('lorebooks');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'lorebooks'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Лорбуки ({allLorebooks.length})
            </button>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && !showGenControls && (
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Провайдер и Модель</label>
                <select
                  value={selectedModelId}
                  onChange={(e) => {
                    const mId = e.target.value;
                    setSelectedModelId(mId);
                    if (autoTuneRp) applyAutoTune(mId);
                  }}
                  disabled={loadingModels}
                  className="w-full bg-arcane-950 border border-arcane-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value="" disabled>
                    {loadingModels ? 'Загрузка моделей…' : 'Выберите совместимую модель'}
                  </option>
                  {filteredModelsList.length > 0 ? (
                    filteredModelsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.workerCount || 0} воркеров) {m.isNsfw ? '🔥 NSFW' : ''} {m.supportsRussian ? '🇷🇺 RU+' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      ⚠️ Нет доступных моделей по выбранным фильтрам ({filterNsfw ? 'NSFW' : ''} {filterRussian ? 'RU+' : ''})
                    </option>
                  )}
                </select>
                {modelsError && (
                  <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
                    {modelsError}
                  </div>
                )}
              </div>

              {/* Model Filters & RP Auto-Tune Buttons (User Note 395) */}
              <div className="p-3.5 rounded-xl bg-arcane-950 border border-arcane-800 space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Фильтры моделей ИИ и Автонастройка РП:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* 1. NSFW Filter */}
                  <button
                    type="button"
                    onClick={() => setFilterNsfw(!filterNsfw)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-bold transition-all ${
                      filterNsfw
                        ? 'bg-rose-950 border-rose-500 text-rose-300 shadow-md'
                        : 'bg-arcane-900 border-arcane-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🔥 NSFW</span>
                  </button>

                  {/* 2. RU+ Filter */}
                  <button
                    type="button"
                    onClick={() => setFilterRussian(!filterRussian)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-bold transition-all ${
                      filterRussian
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md'
                        : 'bg-arcane-900 border-arcane-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Фильтровать модели с лучшей поддержкой русского языка"
                  >
                    <span>🇷🇺 RU+</span>
                  </button>

                  {/* 3. RP Auto-tune */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !autoTuneRp;
                      setAutoTuneRp(next);
                      if (next && selectedModelId) {
                        applyAutoTune(selectedModelId);
                      }
                    }}
                    className={`flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                      autoTuneRp
                        ? 'bg-purple-950 border-purple-500 text-purple-200 shadow-md'
                        : 'bg-arcane-900 border-arcane-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Автоматический подбор оптимальных параметров (Temp, TopP, Repetition Penalty) под выбранную модель"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Автоподбор</span>
                  </button>
                </div>

                {/* Active RP Preset Details Banner (User Note 402) */}
                {autoTuneRp && activePresetInfo && (
                  <div className="p-2.5 bg-purple-950/70 border border-purple-500/40 rounded-xl text-[11px] font-mono text-purple-200 space-y-1 mt-2 shadow-inner">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Пресет РП: {activePresetInfo.displayName}</span>
                    </div>
                    <div className="text-[10px] text-slate-300 leading-relaxed">
                      {activePresetInfo.description}
                    </div>
                    <div className="text-[10px] text-cyan-300 font-bold">
                      Temp: {activePresetInfo.temperature} · TopP: {activePresetInfo.topP} · RepPen: {activePresetInfo.repetitionPenalty} · Context: {activePresetInfo.contextLimit}
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-panel Trigger: Advanced Generation Controls */}
              <button
                onClick={() => setShowGenControls(true)}
                className="w-full p-3 bg-arcane-950 border border-arcane-800 hover:border-purple-500 rounded-xl flex items-center justify-between text-left transition-all group"
              >
                <div>
                  <div className="font-bold text-slate-200 group-hover:text-purple-300">
                    Расширенные параметры генерации (Generation Controls)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Temp: {temperature} · TopP: {topP} · Context: {contextLimit} · MaxTokens: {maxTokens}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-400" />
              </button>

              {/* Instructions & System Prompt */}
              <div className="space-y-3 pt-2 border-t border-arcane-800">
                <h4 className="font-bold text-slate-200">Инструкции</h4>

                <div>
                  <label className="block text-slate-400 mb-1">Свой системный промпт для этого чата</label>
                  <textarea
                    rows={3}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Например: Отвечай развернуто, описывай мысли и эмоции в деталях..."
                    className="w-full bg-arcane-950 border border-arcane-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Запрещённые слова (Stop sequences)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newBannedWord}
                      onChange={(e) => setNewBannedWord(e.target.value)}
                      placeholder="Слово для остановки..."
                      className="flex-1 bg-arcane-950 border border-arcane-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                    <Button size="sm" variant="secondary" onClick={handleAddBannedWord}>
                      Добавить
                    </Button>
                  </div>
                  {bannedWords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {bannedWords.map((word) => (
                        <span key={word} className="bg-arcane-950 border border-arcane-800 text-slate-300 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                          {word}
                          <button onClick={() => handleRemoveBannedWord(word)} className="text-slate-500 hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1 SUB-PANEL: ADVANCED GENERATION CONTROLS (User Note 126-128) */}
          {activeTab === 'settings' && showGenControls && (
            <div className="space-y-4 text-xs font-mono">
              <button
                onClick={() => setShowGenControls(false)}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 mb-2 font-medium"
              >
                ← Назад к настройкам
              </button>

              <h4 className="font-bold text-sm text-purple-300 border-b border-arcane-800 pb-2">
                Полный спектр параметров генерации ИИ
              </h4>

              {/* Temperature */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-200">Temperature (Температура)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="2.0"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-20 bg-arcane-950 border border-arcane-800 rounded px-2 py-0.5 text-right font-mono text-purple-300 font-bold focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Top-P */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-200">Top-P (Nucleus Sampling)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="1.0"
                    value={topP}
                    onChange={(e) => setTopP(Number(e.target.value))}
                    className="w-20 bg-arcane-950 border border-arcane-800 rounded px-2 py-0.5 text-right font-mono text-purple-300 font-bold focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={topP}
                  onChange={(e) => setTopP(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Top-K */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-200">Top-K</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="w-20 bg-arcane-950 border border-arcane-800 rounded px-2 py-0.5 text-right font-mono text-purple-300 font-bold focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Repetition Penalty */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-200">Repetition Penalty (Штраф за повторы)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="2.0"
                    value={repetitionPenalty}
                    onChange={(e) => setRepetitionPenalty(Number(e.target.value))}
                    className="w-20 bg-arcane-950 border border-arcane-800 rounded px-2 py-0.5 text-right font-mono text-purple-300 font-bold focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.0"
                  step="0.05"
                  value={repetitionPenalty}
                  onChange={(e) => setRepetitionPenalty(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Context Limit */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-200">Context Limit (Контекст в токенах)</label>
                  <input
                    type="number"
                    step="512"
                    min="512"
                    max="32768"
                    value={contextLimit}
                    onChange={(e) => setContextLimit(Number(e.target.value))}
                    className="w-24 bg-arcane-950 border border-arcane-800 rounded px-2 py-0.5 text-right font-mono text-purple-300 font-bold focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>
                <input
                  type="range"
                  min="2048"
                  max="32768"
                  step="1024"
                  value={contextLimit}
                  onChange={(e) => setContextLimit(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Max Output Tokens */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-200">Max Tokens (Макс. длина ответа)</label>
                  <input
                    type="number"
                    step="50"
                    min="50"
                    max="8192"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="w-24 bg-arcane-950 border border-arcane-800 rounded px-2 py-0.5 text-right font-mono text-purple-300 font-bold focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>
                <input
                  type="range"
                  min="100"
                  max="8192"
                  step="50"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div className="pt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setTemperature(0.75);
                    setTopP(0.9);
                    setTopK(40);
                    setTypicalP(1.0);
                    setRepetitionPenalty(1.15);
                    setPresencePenalty(0.0);
                    setFrequencyPenalty(0.0);
                    setContextLimit(8192);
                    setMaxTokens(2500);
                  }}
                  className="text-[11px] font-mono text-slate-400 hover:text-slate-200"
                >
                  Сбросить на дефолтные
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: CHAT MEMORY (User Note 650) */}
          {activeTab === 'memory' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-200 flex items-center justify-between">
                  <span>Заметки памяти (Память чата)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                      Токены памяти: <strong className="text-cyan-300 font-bold">{totalMemoryTokens}</strong>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{memories.length} фактов</span>
                  </div>
                </h4>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMemoryText}
                    onChange={(e) => setNewMemoryText(e.target.value)}
                    placeholder="Например: Игрок нашел древний меч..."
                    className="flex-1 bg-arcane-950 border border-arcane-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <Button size="sm" onClick={handleAddMemory} icon={<Plus className="w-3.5 h-3.5" />}>
                    Добавить
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {memories.map((m) => (
                    <div key={m.id} className="p-2.5 bg-arcane-950 border border-arcane-800 rounded-lg flex items-center justify-between">
                      <span className="text-slate-200">{m.content}</span>
                      <button onClick={() => handleDeleteMemory(m.id)} className="text-slate-500 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Auto Summarize Section */}
                <div className="space-y-2 pt-3 border-t border-arcane-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="font-bold text-slate-200">Резюме сюжета (Chat Summary)</label>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={summarizing}
                        onClick={handleAutoSummarize}
                        className="text-[11px]"
                      >
                        {summarizing ? 'Создание...' : 'Сгенерировать резюме'}
                      </Button>
                      <Button
                        size="sm"
                        disabled={summarizing}
                        onClick={handleUpdateIncrementalSummary}
                        className="bg-purple-600 hover:bg-purple-500 text-[11px] font-bold"
                        title="Обновить имеющееся резюме с последнего момента общения"
                      >
                        ⚡ Обновить
                      </Button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Краткое содержание предыдущих событий для контекста ИИ..."
                    className="w-full bg-arcane-950 border border-arcane-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500 font-sans leading-relaxed text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMIZE SESSION THEME (User Note 118-120: Janitor AI Style Wallpaper & Bubbles) */}
          {activeTab === 'customize' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-slate-100 flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-400" />
                Персональное Оформление Ролевого Чата
              </h4>

              {/* Wallpaper Backdrop Input */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> Фоновые обои чата (Wallpaper URL или Загрузка)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bgWallpaperUrl}
                    onChange={(e) => setBgWallpaperUrl(e.target.value)}
                    placeholder="https://example.com/background.jpg..."
                    className="flex-1 bg-arcane-950 border border-arcane-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-arcane-800 hover:bg-arcane-700 border border-arcane-700 rounded-xl text-slate-200 font-bold shrink-0 flex items-center">
                    Загрузить
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) setBgWallpaperUrl(ev.target.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Color Scheme Preset */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-slate-300 font-semibold">Стиль диалоговых пузырей</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setBubbleTheme('purple')}
                    className={`p-2 rounded-xl border text-center ${
                      bubbleTheme === 'purple' ? 'border-purple-500 bg-purple-950 text-white font-bold' : 'border-arcane-800 text-slate-400'
                    }`}
                  >
                    Purple Dark
                  </button>
                  <button
                    onClick={() => setBubbleTheme('cyan')}
                    className={`p-2 rounded-xl border text-center ${
                      bubbleTheme === 'cyan' ? 'border-cyan-500 bg-cyan-950 text-white font-bold' : 'border-arcane-800 text-slate-400'
                    }`}
                  >
                    Neon Cyan
                  </button>
                  <button
                    onClick={() => setBubbleTheme('crimson')}
                    className={`p-2 rounded-xl border text-center ${
                      bubbleTheme === 'crimson' ? 'border-rose-500 bg-rose-950 text-white font-bold' : 'border-arcane-800 text-slate-400'
                    }`}
                  >
                    Crimson Red
                  </button>
                  <button
                    onClick={() => setBubbleTheme('emerald')}
                    className={`p-2 rounded-xl border text-center ${
                      bubbleTheme === 'emerald' ? 'border-emerald-500 bg-emerald-950 text-white font-bold' : 'border-arcane-800 text-slate-400'
                    }`}
                  >
                    Emerald Green
                  </button>
                  <button
                    onClick={() => setBubbleTheme('oled')}
                    className={`p-2 rounded-xl border text-center ${
                      bubbleTheme === 'oled' ? 'border-slate-400 bg-black text-white font-bold' : 'border-arcane-800 text-slate-400'
                    }`}
                  >
                    OLED Black
                  </button>
                </div>
              </div>

              {/* Font Family Selector */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-slate-300 font-semibold">Шрифт диалогов</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setFontFamily('sans')}
                    className={`p-2 rounded-xl border text-center font-sans ${
                      fontFamily === 'sans' ? 'border-purple-500 bg-purple-950 text-white font-bold' : 'border-arcane-800 text-slate-400'
                    }`}
                  >
                    Sans (Стандарт)
                  </button>
                  <button
                    onClick={() => setFontFamily('serif')}
                    className={`p-2 rounded-xl border text-center font-serif ${
                      fontFamily === 'serif' ? 'border-purple-500 bg-purple-950 text-white font-bold' : 'border-arcane-800 text-slate-400'
                    }`}
                  >
                    Serif (Ролевой)
                  </button>
                  <button
                    onClick={() => setFontFamily('mono')}
                    className={`p-2 rounded-xl border text-center font-mono ${
                      fontFamily === 'mono' ? 'border-purple-500 bg-purple-950 text-white font-bold' : 'border-arcane-800 text-slate-400'
                    }`}
                  >
                    Mono (Код)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LOREBOOKS ATTACHMENT (User Note 618) */}
          {activeTab === 'lorebooks' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-arcane-800 pb-2">
                <h4 className="font-bold text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  Привязанные Лорбуки ({sessionLorebookIds.length} выбрано)
                </h4>
                <span className="text-[10px] font-mono text-purple-300">
                  Всего в базе: {allLorebooks.length}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Выберите лорбуки, знания из которых нейросеть будет автоматически подставлять в контекст диалога.
              </p>

              {allLorebooks.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {allLorebooks.map((lb) => {
                    const isSelected = sessionLorebookIds.includes(lb.id);
                    return (
                      <div
                        key={lb.id}
                        onClick={() => handleToggleLorebook(lb.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-950/80 border-purple-500 text-purple-100 shadow-md'
                            : 'bg-arcane-950 border-arcane-800 text-slate-400 hover:border-arcane-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <div>
                            <div className="font-bold text-slate-200">{lb.name}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[280px]">
                              {lb.description || 'Без описания'} • {lb.entries?.length || 0} записей
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isSelected ? 'bg-purple-900 border-purple-400 text-cyan-300 font-bold' : 'bg-arcane-900 border-arcane-800 text-slate-500'
                        }`}>
                          {isSelected ? 'Активен' : 'Отключен'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-arcane-950 rounded-2xl border border-arcane-800 text-center space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-slate-300 font-bold">В Студии пока нет созданных Лорбуков</div>
                  <div className="text-[11px] text-slate-500">
                    Перейдите в раздел «Лорбуки» в боковом меню, чтобы создать свою первую интерактивную базу знаний.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Footer Actions */}
        <div className="p-4 border-t border-arcane-800 bg-arcane-950 flex items-center justify-end gap-3 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Отмена
          </Button>
          <Button
            size="sm"
            icon={<Check className="w-4 h-4" />}
            onClick={async () => {
              await handleSaveSettings();
              onClose();
            }}
            className="bg-purple-600 hover:bg-purple-500 font-bold text-xs"
          >
            Сохранить настройки
          </Button>
        </div>
      </Card>
    </div>
  );
};
