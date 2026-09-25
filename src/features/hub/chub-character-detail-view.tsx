import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Bot, 
  Plus, 
  Download, 
  MessageSquare, 
  Star, 
  ShieldAlert, 
  ChevronDown, 
  Image as ImageIcon, 
  BookOpen, 
  MessageCircle, 
  History, 
  CheckCircle2, 
  Loader2, 
  Maximize2, 
  X,
  Sparkles,
  Terminal,
  FileText,
  ExternalLink,
  Play,
  Send,
  UserCheck,
  Languages
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { Persona } from '@/domain/entities';
import { 
  globalChubImporterService, 
  type ChubCharacterCard 
} from '@/services/persona/importers/chub-importer-service';
import { globalPersonaService } from '@/services/persona/persona-service';
import { globalTranslationService } from '@/services/translation/translation-service';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class DetailViewErrorBoundary extends React.Component<{ children: React.ReactNode; onBack: () => void }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ChubCharacterDetailView Error]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-arcane-950 text-slate-100 p-8 flex flex-col items-center justify-center space-y-4">
          <div className="p-6 bg-red-950/80 border border-red-500/50 rounded-2xl max-w-lg text-center space-y-3 shadow-2xl">
            <h3 className="font-extrabold text-sm text-red-300">Ошибка отображения карточки персонажа</h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">{this.state.error?.message || 'Произошла непредвиденная ошибка в данных карточки.'}</p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onBack();
            }}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-colors"
          >
            ← Вернуться в Каталог персонажей
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface ChubCharacterDetailViewProps {
  card: ChubCharacterCard;
  onBack: () => void;
  onStartChatWithPersona: (personaId: string, sessionId?: string) => void;
  onSelectTag?: (tag: string) => void;
}

const ChubCharacterDetailViewInner: React.FC<ChubCharacterDetailViewProps> = ({
  card: initialCard,
  onBack,
  onStartChatWithPersona,
  onSelectTag,
}) => {
  const [sourceCard, setCard] = useState<ChubCharacterCard>(initialCard);
  const [loading, setLoading] = useState(true);
  const [translatedCard, setTranslatedCard] = useState<ChubCharacterCard | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [translatingCard, setTranslatingCard] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isImported, setIsImported] = useState(false);
  const [activeTab, setActiveTab] = useState<'definitions' | 'gallery' | 'lorebooks' | 'discussion' | 'history'>('definitions');
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Comment thread state for Discussions
  const [comments, setComments] = useState<Array<{ id: string; user: string; text: string; date: string }>>([]);
  const [newComment, setNewComment] = useState('');

  // Main Accordion open state
  const [openAccordions, setOpenAccordions] = useState({
    definitions: true,
    discussion: false,
    publicChats: false,
    gallery: false,
    linkedLorebooks: false,
    versionHistory: false,
  });

  // Sub-accordions open state inside Definitions
  const [openSubAccordions, setOpenSubAccordions] = useState({
    description: true,
    personality: true,
    scenario: true,
    firstMessage: true,
    mesExample: true,
    postHistory: true,
  });

  // Full-screen raw image overlay modal state
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setTranslatedCard(null);
    setShowTranslated(false);
    setTranslationError(null);
    
    // Check if persona is ALREADY imported in local IndexedDB
    globalPersonaService.getAllPersonas().then((list: Persona[]) => {
      if (isMounted) {
        const exists = list.some(
          (p: Persona) =>
            (p.metadata.customFields?.source === 'chub.ai' &&
              p.metadata.customFields?.sourceId === initialCard.fullPath)
        );
        if (exists) setIsImported(true);
      }
    });

    globalChubImporterService.fetchFullCardDefinition(initialCard).then((full) => {
      if (isMounted) {
        setCard(full);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [initialCard]);

  const toggleAccordion = (key: keyof typeof openAccordions) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSubAccordion = (key: keyof typeof openSubAccordions) => {
    setOpenSubAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTranslateCard = async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }
    if (translatedCard) {
      setShowTranslated(true);
      return;
    }

    setTranslatingCard(true);
    setTranslationError(null);
    try {
      const translate = async (value?: string) => {
        if (!value?.trim()) return value || '';
        const result = await globalTranslationService.translate(value, {
          sourceLang: 'auto',
          targetLang: 'ru',
          protectedTerms: [sourceCard.name, sourceCard.creator].filter(Boolean),
        });
        if (result.error) throw new Error('Сервис перевода недоступен');
        return result.text;
      };

      const [publicDescription, description, personality, scenario, firstMessage, mesExample, postHistoryInstructions, systemPrompt, creatorNotes, ...greetings] = await Promise.all([
        translate(sourceCard.publicDescription),
        translate(sourceCard.description),
        translate(sourceCard.personality),
        translate(sourceCard.scenario),
        translate(sourceCard.firstMessage),
        translate(sourceCard.mesExample),
        translate(sourceCard.postHistoryInstructions),
        translate(sourceCard.systemPrompt),
        translate(sourceCard.creatorNotes),
        ...(sourceCard.alternateGreetings || []).map((text) => translate(text)),
      ]);

      let translatedBook = sourceCard.rawCharacterBook;
      if (sourceCard.rawCharacterBook?.entries) {
        const entries = await Promise.all(sourceCard.rawCharacterBook.entries.map(async (entry: any) => ({
          ...entry,
          content: await translate(entry.content || entry.text || ''),
          text: entry.text ? await translate(entry.text) : entry.text,
        })));
        translatedBook = { ...sourceCard.rawCharacterBook, entries };
      }

      setTranslatedCard({
        ...sourceCard,
        publicDescription,
        description,
        personality,
        scenario,
        firstMessage,
        mesExample,
        postHistoryInstructions,
        systemPrompt,
        creatorNotes,
        alternateGreetings: greetings,
        rawCharacterBook: translatedBook,
      });
      setShowTranslated(true);
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : 'Не удалось перевести карточку');
    } finally {
      setTranslatingCard(false);
    }
  };

  const card = showTranslated && translatedCard ? translatedCard : sourceCard;

  const handleImport = async (startChat: boolean, customFirstMessage?: string) => {
    const cardToImport = customFirstMessage 
      ? { ...sourceCard, firstMessage: customFirstMessage }
      : sourceCard;

    setImportError(null);
    try {
      const { persona, sessionId } = await globalChubImporterService.importCharacter(cardToImport, startChat);
      setIsImported(true);
      if (startChat) {
        onStartChatWithPersona(persona.id, sessionId);
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Не удалось импортировать карточку');
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        user: 'Вы',
        text: newComment.trim(),
        date: 'Только что',
      },
    ]);
    setNewComment('');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = card.maxResUrl || card.avatarUrl;
    link.download = `${card.name.replace(/\s+/g, '_')}_ChubCard.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateTokens = (text: string) => Math.ceil((text || '').length / 3.8);

  const totalTokens = calculateTokens(
    (card.description || '') + 
    (card.personality || '') + 
    (card.scenario || '') + 
    (card.firstMessage || '') + 
    (card.mesExample || '') + 
    (card.postHistoryInstructions || '') +
    (card.systemPrompt || '') +
    (card.creatorNotes || '')
  );

  const permanentTokens = calculateTokens(card.description || '');

  // Gallery images array (Only real images)
  const galleryImages = [card.maxResUrl || card.avatarUrl].filter(Boolean) as string[];

  const lorebookEntries = card.rawCharacterBook?.entries || [];

  if (!card) {
    return (
      <div className="min-h-screen w-full bg-arcane-950 text-slate-100 p-8 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-arcane-accent animate-spin" />
        <p className="text-xs font-mono text-slate-400">Загрузка данных карточки...</p>
        <button onClick={onBack} className="px-4 py-2 rounded-xl bg-arcane-800 text-xs font-bold text-slate-200">
          Назад в Каталог
        </button>
      </div>
    );
  }

  const safeName = card.name || 'Ролевой Персонаж';
  const safeFullPath = card.fullPath || `character/${safeName}`;
  const safeCreator = card.creator || safeFullPath.split('/')[0] || 'Unknown';
  const safeChatsCount = Number.isFinite(card.chatsCount) ? card.chatsCount : null;
  const safeTags = Array.isArray(card.tags) ? card.tags : ['Chub AI'];
  const safeAlternateGreetings = Array.isArray(card.alternateGreetings)
    ? card.alternateGreetings
    : typeof card.alternateGreetings === 'string' && card.alternateGreetings
    ? [card.alternateGreetings]
    : [];

  return (
    <div className="min-h-screen w-full bg-arcane-950 text-slate-100 p-4 sm:p-8 space-y-6">
      {/* Top Header Bar with Native Back Button */}
      <div className="flex items-center justify-between border-b border-arcane-800/80 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-arcane-900 border border-arcane-800 text-slate-300 hover:text-white hover:bg-arcane-800 transition-colors font-medium text-xs shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад в Каталог персонажей</span>
        </button>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={showTranslated ? 'secondary' : 'ghost'}
            icon={translatingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
            onClick={handleTranslateCard}
            disabled={translatingCard || loading}
          >
            {translatingCard ? 'Перевод…' : showTranslated ? 'Показать оригинал' : 'Перевести карточку'}
          </Button>
          <a
            href={`https://chub.ai/characters/${safeFullPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 hover:text-white hover:bg-purple-900 transition-colors font-mono text-xs shadow-md"
          >
            <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
            <span>Открыть на Chub.ai ↗</span>
          </a>
          <Button
            size="sm"
            variant="ghost"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleDownload}
          >
            Скачать V2 Card PNG
          </Button>
        </div>
      </div>

      {/* Loading Bar Indicator when fetching full v2 definition */}
      {loading && (
        <div className="flex items-center gap-3 p-4 bg-purple-950/90 border border-purple-500/50 rounded-2xl text-xs font-mono text-purple-200 shadow-xl animate-pulse">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>Декодирование 100% карточки персонажа V2 Spec с Chub AI...</span>
        </div>
      )}

      {translationError && (
        <div className="flex items-center gap-3 p-4 bg-rose-950/60 border border-rose-500/50 rounded-2xl text-xs text-rose-200">
          <ShieldAlert className="w-4 h-4" />
          <span>{translationError}. Оригинал остался без изменений.</span>
        </div>
      )}

      {/* Main Full-Page Studio Layout (Matching Chub AI Page Structure) */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Column: Avatar Cover, Stats & Primary Action Buttons */}
        <div className="w-full lg:w-96 bg-arcane-900/90 border border-arcane-800/80 rounded-3xl p-6 space-y-6 shrink-0 shadow-2xl">
          
          {/* Large High-Res Cover Image with Hover Zoom */}
          <div 
            onClick={() => setFullscreenImage(card.maxResUrl || card.avatarUrl)}
            className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border border-arcane-700/80 shadow-2xl cursor-pointer group bg-arcane-950"
          >
            <img
              src={card.maxResUrl || card.avatarUrl}
              alt={safeName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {/* Hover Full-Screen Zoom Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
              <div className="px-4 py-2.5 rounded-xl bg-black/80 text-white text-xs font-bold flex items-center gap-2 border border-white/20 shadow-2xl">
                <Maximize2 className="w-4 h-4 text-arcane-accent-glow" />
                <span>Развернуть в полный экран</span>
              </div>
            </div>

            {/* Floating Top Stats Badge */}
            <div className="absolute top-3 left-3 bg-purple-950/90 border border-purple-500/40 text-purple-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2.5 backdrop-blur-md shadow-lg">
              <span className="flex items-center gap-1 text-emerald-400">
                <MessageSquare className="w-3.5 h-3.5" /> {safeChatsCount === null ? '—' : safeChatsCount >= 1000 ? `${(safeChatsCount / 1000).toFixed(1)}k` : safeChatsCount}
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> {card.starCount ?? card.rating ?? '—'}
              </span>
              <span className="flex items-center gap-1 text-purple-300">
                <Download className="w-3.5 h-3.5" /> {card.downloadCount ?? '—'}
              </span>
            </div>
          </div>

          {/* Action Buttons: Add to DB + Chat + Fork */}
          <div className="space-y-3">
            <Button
              className="w-full py-3.5 text-sm font-extrabold bg-gradient-to-r from-arcane-accent to-purple-600 shadow-xl shadow-arcane-accent/30"
              icon={<Bot className="w-4.5 h-4.5" />}
              onClick={() => handleImport(true)}
            >
              Начать чат с {safeName.split(' ')[0]}
            </Button>

            <Button
              variant={isImported ? 'ghost' : 'secondary'}
              className="w-full py-3 text-xs font-bold"
              disabled={isImported}
              icon={isImported ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
              onClick={() => handleImport(false)}
            >
              {isImported ? 'Добавлено в локальную базу' : '+ Добавить в локальную базу'}
            </Button>
            {importError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
                {importError}
              </div>
            )}
          </div>

          {/* Metadata Info Box */}
          <div className="p-4 rounded-2xl bg-arcane-950 border border-arcane-800 space-y-2 text-xs font-mono text-slate-400">
            <div className="flex justify-between items-center">
              <span>Оригинал:</span>
              <a
                href={`https://chub.ai/characters/${safeFullPath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-arcane-accent-glow font-bold hover:underline flex items-center gap-1"
              >
                <span>chub.ai/{safeFullPath.split('/')[0]}...</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex justify-between">
              <span>Автор:</span>
              <span className="text-purple-400 font-bold">@{safeCreator}</span>
            </div>
            <div className="flex justify-between">
              <span>Формат карточки:</span>
              <span className="text-slate-200">SillyTavern V2 Spec</span>
            </div>
            <div className="flex justify-between">
              <span>Всего токенов:</span>
              <span className="text-arcane-accent-glow font-bold">{totalTokens} tokens</span>
            </div>
            <div className="flex justify-between">
              <span>Постоянные токены:</span>
              <span className="text-emerald-400 font-bold">{permanentTokens} tokens</span>
            </div>
            {card.alternateGreetings && card.alternateGreetings.length > 0 && (
              <div className="flex justify-between">
                <span>Приветствия:</span>
                <span className="text-purple-300 font-bold">+{card.alternateGreetings.length} вариантов</span>
              </div>
            )}
            {card.lorebookEntriesCount !== undefined && card.lorebookEntriesCount > 0 && (
              <div className="flex justify-between">
                <span>Лорбуки World Info:</span>
                <span className="text-cyan-400 font-bold">{card.lorebookEntriesCount} записей</span>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Full Page Detailed Accordions & Content Tabs */}
        <div className="flex-1 w-full space-y-6">

          {/* Title Header & Tag Pills */}
          <div className="bg-arcane-900/80 border border-arcane-800/80 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                {safeName}
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Создано <span className="text-purple-400 font-semibold">@{safeCreator}</span> в каталоге Chub AI
              </p>
            </div>

            {/* Clickable Tag Pills (User Note 374) */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {safeTags.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    if (onSelectTag) {
                      onSelectTag(t);
                    }
                  }}
                  className="px-3 py-1 bg-arcane-950 hover:bg-purple-950 border border-arcane-800 hover:border-purple-500/50 text-slate-300 hover:text-white rounded-lg font-mono text-xs shadow-inner transition-colors cursor-pointer"
                  title={`Перейти в каталог персонажей с фильтром по тегу #${t}`}
                >
                  #{t}
                </button>
              ))}
            </div>

            {/* Overview / Full Expandable Description Box (User Note 360) */}
            <div className="p-4.5 rounded-2xl bg-arcane-950 border border-amber-500/30 text-amber-200/90 text-xs font-mono leading-relaxed space-y-2 shadow-inner">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Оригинальное описание персонажа (Chub AI Description):</span>
                </div>
                {(card.publicDescription || card.tagline || '').length > 350 && (
                  <button
                    onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                    className="text-[11px] text-amber-400 hover:text-amber-200 font-bold underline transition-colors"
                  >
                    {isOverviewExpanded ? 'Свернуть ▲' : 'Показать полностью ▼'}
                  </button>
                )}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed select-text pt-1">
                {isOverviewExpanded || (card.publicDescription || card.tagline || '').length <= 350
                  ? (card.publicDescription || card.tagline || 'Публичное описание отсутствует.')
                  : (card.publicDescription || card.tagline || '').slice(0, 350) + '...'}
              </div>
            </div>

            {!loading && !card.definitionLoaded && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-xs text-rose-200">
                Chub AI не отдал полное Definition. Публичная часть карточки доступна, но внутренние поля не будут подменены аннотацией.
              </div>
            )}
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-2 bg-arcane-900/90 p-1.5 rounded-2xl border border-arcane-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('definitions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'definitions'
                  ? 'bg-arcane-accent text-white shadow-lg shadow-arcane-accent/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-arcane-800/60'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              Определения & Промпты
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'gallery'
                  ? 'bg-arcane-accent text-white shadow-lg shadow-arcane-accent/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-arcane-800/60'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
              Галерея артов ({galleryImages.length})
            </button>

            <button
              onClick={() => setActiveTab('lorebooks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'lorebooks'
                  ? 'bg-arcane-accent text-white shadow-lg shadow-arcane-accent/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-arcane-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Лорбуки & World Info ({card.lorebookEntriesCount || 0})
            </button>

            <button
              onClick={() => setActiveTab('discussion')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'discussion'
                  ? 'bg-arcane-accent text-white shadow-lg shadow-arcane-accent/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-arcane-800/60'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              Отзывы ({comments.length})
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-arcane-accent text-white shadow-lg shadow-arcane-accent/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-arcane-800/60'
              }`}
            >
              <History className="w-4 h-4 text-slate-400" />
              История версий
            </button>
          </div>

          {/* TAB 1: Definitions Accordion Section (Matching Chub AI Accordions) */}
          {activeTab === 'definitions' && (
            <div className="space-y-4">
              {loading && (
                <div className="flex items-center gap-2 text-xs text-arcane-accent-glow p-4 bg-arcane-900 rounded-xl border border-arcane-800">
                  <Loader2 className="w-4 h-4 animate-spin" /> Декодирование оригинального V2 PNG контейнера с серверов Chub AI...
                </div>
              )}

              {/* Main Banner Art (Click to zoom) */}
              <div 
                onClick={() => setFullscreenImage(card.maxResUrl || card.avatarUrl)}
                className="relative rounded-2xl overflow-hidden border border-purple-500/40 shadow-2xl aspect-[16/9] w-full bg-arcane-950 cursor-pointer group"
              >
                <img
                  src={card.maxResUrl || card.avatarUrl}
                  alt={card.name}
                  className="w-full h-full object-cover filter brightness-90 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-arcane-950 via-transparent to-black/20" />
                <div className="absolute top-4 right-4 bg-black/70 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 border border-white/20 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-4 h-4" /> Полноэкранный просмотр
                </div>
              </div>

              {/* Chub Main Accordion 1: Definitions - May contain spoilers */}
              <div className="rounded-2xl border border-arcane-800 bg-arcane-900/90 overflow-hidden shadow-xl">
                <button
                  onClick={() => toggleAccordion('definitions')}
                  className="w-full px-5 py-4 bg-arcane-900 hover:bg-arcane-800/80 flex items-center justify-between text-left text-xs font-extrabold text-slate-200 border-b border-arcane-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4.5 h-4.5 text-purple-400" />
                    <span>
                      Definitions - May contain spoilers (Total {totalTokens} token(s). Permanent: {permanentTokens} token(s))
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openAccordions.definitions ? 'rotate-180' : ''}`} />
                </button>

                {openAccordions.definitions && (
                  <div className="p-5 space-y-4 bg-arcane-950">
                    
                    {/* In-Chat Name Box */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        In-Chat Name (If Different)
                      </label>
                      <div className="p-3 bg-arcane-900 border border-arcane-800 rounded-xl text-slate-200 font-mono text-xs">
                        {card.name}
                      </div>
                    </div>

                    {/* SUB-ACCORDION 1: Description (Clickable expandable window!) */}
                    <div className="rounded-xl border border-arcane-800 bg-arcane-900/80 overflow-hidden shadow-md">
                      <button
                        onClick={() => toggleSubAccordion('description')}
                        className="w-full px-4 py-3 bg-arcane-900 hover:bg-arcane-800/90 flex items-center justify-between text-left text-xs font-bold text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSubAccordions.description ? 'rotate-180' : ''}`} />
                          <FileText className="w-3.5 h-3.5 text-purple-400" />
                          <span>Description ({calculateTokens(card.description)} token(s))</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {openSubAccordions.description ? 'Свернуть ▲' : 'Развернуть ▼'}
                        </span>
                      </button>
                      {openSubAccordions.description && (
                        <div className="p-5 bg-arcane-950 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap border-t border-arcane-800/60 shadow-inner select-text">
                          {card.description || 'Описание подгружается...'}
                        </div>
                      )}
                    </div>

                    {/* SUB-ACCORDION 2: Personality (Clickable expandable window!) */}
                    <div className="rounded-xl border border-arcane-800 bg-arcane-900/80 overflow-hidden shadow-md">
                      <button
                        onClick={() => toggleSubAccordion('personality')}
                        className="w-full px-4 py-3 bg-arcane-900 hover:bg-arcane-800/90 flex items-center justify-between text-left text-xs font-bold text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSubAccordions.personality ? 'rotate-180' : ''}`} />
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Personality ({calculateTokens(card.personality || '')} token(s))</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {openSubAccordions.personality ? 'Свернуть ▲' : 'Развернуть ▼'}
                        </span>
                      </button>
                      {openSubAccordions.personality && (
                        <div className="p-5 bg-arcane-950 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap border-t border-arcane-800/60 select-text">
                          {card.personality || 'Характер не указан отдельно.'}
                        </div>
                      )}
                    </div>

                    {/* SUB-ACCORDION 3: Scenario (Clickable expandable window!) */}
                    <div className="rounded-xl border border-arcane-800 bg-arcane-900/80 overflow-hidden shadow-md">
                      <button
                        onClick={() => toggleSubAccordion('scenario')}
                        className="w-full px-4 py-3 bg-arcane-900 hover:bg-arcane-800/90 flex items-center justify-between text-left text-xs font-bold text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSubAccordions.scenario ? 'rotate-180' : ''}`} />
                          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Scenario ({calculateTokens(card.scenario || '')} token(s))</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {openSubAccordions.scenario ? 'Свернуть ▲' : 'Развернуть ▼'}
                        </span>
                      </button>
                      {openSubAccordions.scenario && (
                        <div className="p-5 bg-arcane-950 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap border-t border-arcane-800/60 select-text">
                          {card.scenario || 'Сценарий не указан отдельно.'}
                        </div>
                      )}
                    </div>

                    {/* SUB-ACCORDION 4: First Message (Clickable expandable window!) */}
                    <div className="rounded-xl border border-arcane-800 bg-arcane-900/80 overflow-hidden shadow-md">
                      <button
                        onClick={() => toggleSubAccordion('firstMessage')}
                        className="w-full px-4 py-3 bg-arcane-900 hover:bg-arcane-800/90 flex items-center justify-between text-left text-xs font-bold text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSubAccordions.firstMessage ? 'rotate-180' : ''}`} />
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>First Message ({calculateTokens(card.firstMessage || '')} token(s))</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {openSubAccordions.firstMessage ? 'Свернуть ▲' : 'Развернуть ▼'}
                        </span>
                      </button>
                      {openSubAccordions.firstMessage && (
                        <div className="p-5 bg-arcane-950 font-serif text-xs text-slate-200 leading-relaxed italic border-t border-arcane-800/60 border-l-4 border-l-arcane-accent whitespace-pre-wrap select-text">
                          "{card.firstMessage}"
                        </div>
                      )}
                    </div>

                    {/* SUB-ACCORDION 4.5: Post-History Instructions / Author Notes */}
                    {card.postHistoryInstructions && (
                      <div className="rounded-xl border border-arcane-800 bg-arcane-900/80 overflow-hidden shadow-md">
                        <button
                          onClick={() => toggleSubAccordion('postHistory')}
                          className="w-full px-4 py-3 bg-arcane-900 hover:bg-arcane-800/90 flex items-center justify-between text-left text-xs font-bold text-slate-200 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSubAccordions.postHistory ? 'rotate-180' : ''}`} />
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            <span>Post-History Instructions / Author Notes ({calculateTokens(card.postHistoryInstructions)} token(s))</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {openSubAccordions.postHistory ? 'Свернуть ▲' : 'Развернуть ▼'}
                          </span>
                        </button>
                        {openSubAccordions.postHistory && (
                          <div className="p-5 bg-arcane-950 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap border-t border-arcane-800/60 border-l-4 border-l-rose-500 select-text">
                            {card.postHistoryInstructions}
                          </div>
                        )}
                      </div>
                    )}

                    {card.systemPrompt && (
                      <details className="rounded-xl border border-arcane-800 bg-arcane-900/80 overflow-hidden shadow-md">
                        <summary className="px-4 py-3 cursor-pointer text-xs font-bold text-slate-200">
                          System Prompt ({calculateTokens(card.systemPrompt)} token(s))
                        </summary>
                        <div className="p-5 bg-arcane-950 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap border-t border-arcane-800/60 select-text">
                          {card.systemPrompt}
                        </div>
                      </details>
                    )}

                    {card.creatorNotes && (
                      <details className="rounded-xl border border-arcane-800 bg-arcane-900/80 overflow-hidden shadow-md">
                        <summary className="px-4 py-3 cursor-pointer text-xs font-bold text-slate-200">
                          Creator Notes ({calculateTokens(card.creatorNotes)} token(s))
                        </summary>
                        <div className="p-5 bg-arcane-950 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap border-t border-arcane-800/60 select-text">
                          {card.creatorNotes}
                        </div>
                      </details>
                    )}

                    {/* SUB-ACCORDION 5: Example Dialogue / mes_example (Clickable expandable window!) */}
                    {card.mesExample && (
                      <div className="rounded-xl border border-arcane-800 bg-arcane-900/80 overflow-hidden shadow-md">
                        <button
                          onClick={() => toggleSubAccordion('mesExample')}
                          className="w-full px-4 py-3 bg-arcane-900 hover:bg-arcane-800/90 flex items-center justify-between text-left text-xs font-bold text-slate-200 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openSubAccordions.mesExample ? 'rotate-180' : ''}`} />
                            <Terminal className="w-3.5 h-3.5 text-purple-400" />
                            <span>Example Dialogue / mes_example ({calculateTokens(card.mesExample)} token(s))</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {openSubAccordions.mesExample ? 'Свернуть ▲' : 'Развернуть ▼'}
                          </span>
                        </button>
                        {openSubAccordions.mesExample && (
                          <div className="p-5 bg-arcane-950 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap border-t border-arcane-800/60 border-l-4 border-l-purple-500 select-text">
                            {card.mesExample}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-ACCORDION 5.5: Raw Spec JSON Inspection */}
                    <div className="rounded-xl border border-amber-500/30 bg-arcane-900/80 overflow-hidden shadow-md">
                      <details className="group">
                        <summary className="w-full px-4 py-3 bg-arcane-900 hover:bg-arcane-800/90 flex items-center justify-between text-left text-xs font-bold text-amber-300 cursor-pointer list-none select-none transition-colors">
                          <div className="flex items-center gap-2">
                            <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                            <Terminal className="w-3.5 h-3.5 text-amber-400" />
                            <span>🔥 Полный сырой Промпт / Raw V2 Spec JSON (Для Посимвольной Сверки С Chub AI)</span>
                          </div>
                          <span className="text-[10px] text-amber-400 font-mono group-open:hidden">
                            Показать JSON пэйлоад ▼
                          </span>
                        </summary>
                        <div className="p-5 bg-arcane-950 font-mono text-[11px] text-emerald-300 leading-relaxed whitespace-pre-wrap border-t border-arcane-800/60 overflow-x-auto max-h-96 select-text">
                          {JSON.stringify(
                            card.rawDefinition || {
                              spec: 'chara_card_v2',
                              spec_version: '2.0',
                              data: {
                                name: card.name,
                                description: card.description,
                                personality: card.personality,
                                scenario: card.scenario,
                                first_mes: card.firstMessage,
                                alternate_greetings: card.alternateGreetings,
                                mes_example: card.mesExample,
                                post_history_instructions: card.postHistoryInstructions,
                                system_prompt: card.systemPrompt,
                                creator_notes: card.creatorNotes,
                                character_version: card.characterVersion,
                                creator: card.creator,
                                tags: card.tags,
                              },
                            },
                            null,
                            2
                          )}
                        </div>
                      </details>
                    </div>

                    {/* SUB-ACCORDION 6: Alternate Greetings / Alternative Storyline Pathways */}
                    {safeAlternateGreetings.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          <span>Alternate Greetings & Storyline Pathways ({safeAlternateGreetings.length} альтернативных сценариев)</span>
                        </label>
                        <div className="space-y-3">
                          {safeAlternateGreetings.map((ag, i) => (
                            <div key={i} className="rounded-xl border border-purple-800/40 bg-arcane-900/80 overflow-hidden shadow-md">
                              <details className="group">
                                <summary className="w-full px-4 py-3 bg-arcane-900 hover:bg-arcane-800/90 flex items-center justify-between text-left text-xs font-bold text-slate-200 cursor-pointer list-none select-none transition-colors">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform duration-200" />
                                    <span className="text-purple-400 font-extrabold">Ветвление #{i + 1}</span>
                                    <span className="text-slate-400">({calculateTokens(ag)} tokens)</span>
                                  </div>
                                  <span className="text-[10px] text-purple-300 font-mono group-open:hidden">
                                    Просмотреть сценарий ▼
                                  </span>
                                </summary>
                                <div className="p-4 bg-arcane-950 space-y-3 border-t border-arcane-800/60">
                                  <div className="font-serif text-xs text-slate-200 leading-relaxed italic border-l-4 border-l-purple-500 p-3 bg-arcane-900/60 rounded-r-xl whitespace-pre-wrap">
                                    "{ag}"
                                  </div>
                                  <Button
                                    size="sm"
                                    className="text-xs bg-purple-600 hover:bg-purple-500 font-bold"
                                    icon={<Play className="w-3.5 h-3.5 fill-white" />}
                                    onClick={() => handleImport(true, ag)}
                                  >
                                    Начать чат с ветвлением #{i + 1}
                                  </Button>
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Gallery */}
          {activeTab === 'gallery' && (
            <div className="bg-arcane-900/90 border border-arcane-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Галерея иллюстраций персонажа</h3>
              <p className="text-xs text-slate-400">Нажмите на любое изображение, чтобы развернуть его на весь экран в 100% оригинальном разрешении без сжатия.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {galleryImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setFullscreenImage(imgUrl)}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-arcane-700/80 cursor-pointer group bg-arcane-950 shadow-md"
                  >
                    <img src={imgUrl} alt={`Art ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Lorebooks */}
          {activeTab === 'lorebooks' && (
            <div className="bg-arcane-900/90 border border-arcane-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Привязанные лорбуки и записи World Info ({lorebookEntries.length})</h3>
                  <p className="text-xs text-slate-400">Все записи миров и лорбуки автоматически подтягиваются при импорте карточки в локальную базу.</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => handleImport(false)}
                >
                  Импортировать лорбук
                </Button>
              </div>
              
              {lorebookEntries.length > 0 ? (
                <div className="space-y-3">
                  {lorebookEntries.map((entry: any, i: number) => (
                    <div key={i} className="p-4 bg-arcane-950 border border-arcane-800 rounded-2xl space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between text-arcane-accent-glow font-bold">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-cyan-400" />
                          <span>Запись #{i + 1}: {entry.comment || entry.name || (entry.keys ? entry.keys.join(', ') : 'World Entry')}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Порядок: {entry.insertion_order || entry.order || 10}</span>
                      </div>
                      {entry.keys && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-slate-400">Триггеры:</span>
                          {(Array.isArray(entry.keys) ? entry.keys : [entry.keys]).map((k: string, kIdx: number) => (
                            <span key={kIdx} className="px-2 py-0.5 bg-arcane-900 border border-arcane-800 text-cyan-300 rounded font-mono text-[10px]">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="p-3 bg-arcane-900/60 rounded-xl text-slate-300 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {entry.content || entry.text}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-arcane-950 border border-arcane-800 rounded-xl space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2 text-arcane-accent-glow font-bold">
                    <Sparkles className="w-4 h-4" /> Встроенный лорбук персонажа {card.name}
                  </div>
                  <p className="text-slate-400">В эту карточку не зашиты внешние записи World Info.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Discussion */}
          {activeTab === 'discussion' && (
            <div className="bg-arcane-900/90 border border-arcane-800 rounded-3xl p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-200">Отзывы и комментарии пользователей Arcaneum</h3>
              
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Оставьте отзыв о работе карточки и промптах..."
                  className="flex-1 px-4 py-2.5 bg-arcane-950 border border-arcane-800 rounded-xl text-xs text-white focus:outline-none focus:border-arcane-accent"
                />
                <Button size="sm" type="submit" icon={<Send className="w-3.5 h-3.5" />}>
                  Отправить
                </Button>
              </form>

              {/* Comments Thread */}
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="p-4 bg-arcane-950 border border-arcane-800 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                      <span className="font-bold text-purple-400 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> @{c.user}
                      </span>
                      <span>{c.date}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Version History */}
          {activeTab === 'history' && (
            <div className="bg-arcane-900/90 border border-arcane-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-200">История версий карточки</h3>
              <div className="p-4 bg-arcane-950 border border-arcane-800 rounded-xl text-xs font-mono text-slate-400 space-y-1">
                <p>Создатель: @{card.creator}</p>
                <p>Спецификация: SillyTavern V2 / Chub JSON Spec</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RAW FULL-SCREEN HIGH-RESOLUTION OVERLAY MODAL */}
      {fullscreenImage && (
        <div 
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 cursor-zoom-out select-none"
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-6 right-6 p-3 text-slate-300 hover:text-white bg-black/80 hover:bg-black rounded-full border border-white/20 transition-colors z-50 shadow-2xl"
            title="Закрыть (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img
              src={fullscreenImage}
              alt="Original High-Res Art"
              className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-arcane-700/80 transition-transform duration-200"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const ChubCharacterDetailView: React.FC<ChubCharacterDetailViewProps> = (props) => (
  <DetailViewErrorBoundary onBack={props.onBack}>
    <ChubCharacterDetailViewInner {...props} />
  </DetailViewErrorBoundary>
);
