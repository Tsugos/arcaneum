import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  Flame, 
  Star, 
  Plus, 
  MessageSquare, 
  Tag, 
  CheckCircle2, 
  Loader2,
  Eye,
  EyeOff,
  Ban,
  X,
  Bot,
  ShieldCheck,
  FlameKindling,
  ExternalLink,
  ArrowUp
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { 
  globalChubImporterService, 
  POPULAR_CHUB_TAGS, 
  type ChubCharacterCard 
} from '@/services/persona/importers/chub-importer-service';
import { ChubCharacterDetailView } from './chub-character-detail-view';

export interface HubViewProps {
  onStartChatWithPersona: (personaId: string, sessionId?: string) => void;
  onNavigateToCreate: () => void;
}

export const HubView: React.FC<HubViewProps> = ({
  onStartChatWithPersona,
  onNavigateToCreate,
}) => {
  const [cards, setCards] = useState<ChubCharacterCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [sortOption, setSortOption] = useState<'popular' | 'trending' | 'latest'>('popular');
  const [nsfwFilter, setNsfwFilter] = useState<'all' | 'nsfw_only' | 'sfw_only'>('all');

  // Infinite Scroll & Back to Top State (User Note 381)
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Card details full-page state
  const [inspectCard, setInspectCard] = useState<ChubCharacterCard | null>(null);
  const [importedCardIds, setImportedCardIds] = useState<Set<string>>(new Set());

  // Blacklist state (User Note 199)
  const [blacklistedIds, setBlacklistedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('arcaneum_blacklisted_cards') || '[]');
    } catch {
      return [];
    }
  });
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);

  const handleToggleBlacklist = (card: ChubCharacterCard) => {
    const targetKey = card.fullPath || card.id;
    setBlacklistedIds((prev) => {
      const exists = prev.includes(targetKey);
      const updated = exists ? prev.filter((k) => k !== targetKey) : [...prev, targetKey];
      localStorage.setItem('arcaneum_blacklisted_cards', JSON.stringify(updated));
      return updated;
    });
  };

  // Reset & Load Initial Page 1 whenever Search/Tag/Sort/NSFW Filters change
  useEffect(() => {
    let isMounted = true;
    const loadFirstPage = async () => {
      setLoading(true);
      setLoadError(null);
      setCurrentPage(1);
      setHasMore(true);
      try {
        const result = await globalChubImporterService.fetchChubCards(
          searchQuery,
          selectedTag,
          sortOption,
          1,
          24,
          nsfwFilter
        );
        if (isMounted) {
          setCards(result.cards);
          setTotalCount(result.totalCount);
          if (result.cards.length === 0 || 1 >= result.totalPages) {
            setHasMore(false);
          }
        }
      } catch (error) {
        if (isMounted) {
          setCards([]);
          setTotalCount(null);
          setHasMore(false);
          setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить каталог Chub AI');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      loadFirstPage();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedTag, sortOption, nsfwFilter, reloadKey]);

  // Append Next Page on Scroll (Infinite Scroll)
  const loadNextPage = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const result = await globalChubImporterService.fetchChubCards(
        searchQuery,
        selectedTag,
        sortOption,
        nextPage,
        24,
        nsfwFilter
      );

      if (result.cards.length > 0) {
        setCards((prev) => {
          const existingIds = new Set(prev.map((c) => c.fullPath || c.id));
          const uniqueNew = result.cards.filter((c) => !existingIds.has(c.fullPath || c.id));
          return [...prev, ...uniqueNew];
        });
        setCurrentPage(nextPage);
        if (nextPage >= result.totalPages) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить следующую страницу');
    } finally {
      setLoadingMore(false);
    }
  }, [searchQuery, selectedTag, sortOption, nsfwFilter, currentPage, loading, loadingMore, hasMore]);

  // Smart Parent Scroll Listener for Infinite Scroll & Floating Back-To-Top Button
  useEffect(() => {
    const getScrollContainer = (): EventTarget => {
      if (containerRef.current) {
        let parent: HTMLElement | null = containerRef.current.parentElement;
        while (parent) {
          const overflowY = window.getComputedStyle(parent).overflowY;
          if (overflowY === 'auto' || overflowY === 'scroll') return parent;
          parent = parent.parentElement;
        }
      }
      return window;
    };

    const target = getScrollContainer();

    const handleScroll = () => {
      let scrollTop = 0;
      let scrollHeight = 0;
      let clientHeight = 0;

      if (target === window) {
        scrollTop = window.scrollY;
        scrollHeight = document.body.offsetHeight;
        clientHeight = window.innerHeight;
      } else {
        const el = target as HTMLElement;
        scrollTop = el.scrollTop;
        scrollHeight = el.scrollHeight;
        clientHeight = el.clientHeight;
      }

      setShowScrollTop(scrollTop > 250);

      const threshold = scrollHeight - 600;
      if (clientHeight + scrollTop >= threshold && !loading && !loadingMore && hasMore) {
        loadNextPage();
      }
    };

    target.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => target.removeEventListener('scroll', handleScroll);
  }, [loadNextPage, loading, loadingMore, hasMore]);

  const handleScrollToTop = () => {
    if (containerRef.current) {
      let parent: HTMLElement | null = containerRef.current.parentElement;
      while (parent) {
        const overflowY = window.getComputedStyle(parent).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          parent.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        parent = parent.parentElement;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync imported status from IndexedDB
  useEffect(() => {
    import('@/services/persona/persona-service').then(({ globalPersonaService }) => {
      globalPersonaService.getAllPersonas().then((list) => {
        const set = new Set<string>();
        list.forEach((p) => {
          set.add(p.id);
          set.add(p.data.name.toLowerCase());
          const sourceId = p.metadata.customFields?.sourceId;
          if (typeof sourceId === 'string') set.add(sourceId);
        });
        setImportedCardIds(set);
      });
    });
  }, []);

  const handleOpenInspectModal = async (card: ChubCharacterCard) => {
    setInspectCard(card);
    const full = await globalChubImporterService.fetchFullCardDefinition(card);
    setInspectCard(full);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { TavernAdapter } = await import('@/services/persona/importers/tavern-adapter');
      const persona = await TavernAdapter.parseUploadedFile(file);
      const convertedCard: ChubCharacterCard = {
        id: persona.id,
        fullPath: `uploaded/${persona.data.name}`,
        name: persona.data.name,
        creator: persona.metadata.creator,
        tagline: persona.data.summary || persona.data.description.slice(0, 100),
        description: persona.data.description,
        personality: persona.data.personality,
        scenario: persona.data.scenario,
        firstMessage: persona.data.firstMessage,
        alternateGreetings: persona.data.alternateGreetings,
        mesExample: persona.data.mesExample,
        postHistoryInstructions: persona.data.postHistoryInstructions,
        avatarUrl: persona.metadata.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        tags: persona.metadata.tags,
        chatsCount: 1,
        rating: 5,
      };
      setInspectCard(convertedCard);
    } catch {
      alert('Ошибка парсинга файла. Загрузите валидный .png карточку или .json спецификацию SillyTavern.');
    }
  };

  const handleImportCard = async (card: ChubCharacterCard, startChat: boolean) => {
    const { persona, sessionId } = await globalChubImporterService.importCharacter(card, startChat);
    setImportedCardIds((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      next.add(card.fullPath);
      next.add(persona.id);
      return next;
    });

    if (startChat) {
      onStartChatWithPersona(persona.id, sessionId);
    }
  };

  // If a character card is selected for inspection, render full-page ChubCharacterDetailView
  if (inspectCard) {
    return (
      <ChubCharacterDetailView
        card={inspectCard}
        onBack={() => setInspectCard(null)}
        onStartChatWithPersona={onStartChatWithPersona}
        onSelectTag={(tag) => {
          setSelectedTag(tag);
          setInspectCard(null);
        }}
      />
    );
  }

  return (
    <div ref={containerRef} className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Banner / Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/80 via-arcane-900 to-indigo-950 p-6 border border-arcane-700/60 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-arcane-accent/20 text-arcane-accent-glow text-xs font-mono font-semibold border border-arcane-accent/30">
            <Sparkles className="w-3.5 h-3.5" /> Arcaneum Platform — Studio & Hub v2.0
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Каталог ролевых персонажей Arcaneum
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Arcaneum — Персональная автономная ИИ-платформа нового поколения. Абсолютная свобода отыгрыша, неколлапсируемая база персонажей Chub AI без цензуры, синхронизация лорбуков и безграничная кастомизация.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
          {/* Upload Local Card PNG/JSON (SillyTavern Card Importer) */}
          <label className="cursor-pointer px-3.5 py-2.5 rounded-xl bg-arcane-900 hover:bg-arcane-800 border border-arcane-700 text-xs font-extrabold text-slate-100 flex items-center gap-2 shadow-lg transition-colors">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Импорт карточки V2 (PNG / JSON)</span>
            <input
              type="file"
              accept=".png,.json,.webp"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={onNavigateToCreate}
            className="shrink-0 font-bold"
          >
            + Создать персонажа
          </Button>
        </div>
      </div>

      {/* Main Search & Filters Header Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Global Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Искать персонажей (например: Chuunibyou, Samus, Megumin)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-arcane-900 border border-arcane-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-arcane-accent shadow-inner"
            />
          </div>

          {/* NSFW Mode Filter Bar (Matching User Requirement) */}
          <div className="flex items-center gap-1 bg-arcane-900/90 p-1 rounded-xl border border-arcane-800 shrink-0">
            <button
              onClick={() => {
                setNsfwFilter('all');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                nsfwFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Полный список без цензуры (SFW + NSFW)"
            >
              <FlameKindling className="w-3.5 h-3.5 text-amber-400" />
              Все (Без цензуры)
            </button>

            <button
              onClick={() => {
                setNsfwFilter('nsfw_only');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                nsfwFilter === 'nsfw_only'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Только 18+ NSFW"
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              Только 18+
            </button>

            <button
              onClick={() => {
                setNsfwFilter('sfw_only');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                nsfwFilter === 'sfw_only'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Только SFW"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              SFW
            </button>
          </div>

          {/* Sort Tabs */}
          <div className="flex items-center gap-1.5 bg-arcane-900/80 p-1 rounded-xl border border-arcane-800 shrink-0">
            <button
              onClick={() => {
                setSortOption('popular');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sortOption === 'popular'
                  ? 'bg-arcane-accent text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              Популярное
            </button>
            <button
              onClick={() => {
                setSortOption('trending');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sortOption === 'trending'
                  ? 'bg-arcane-accent text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              В тренде
            </button>
            <button
              onClick={() => {
                setSortOption('latest');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sortOption === 'latest'
                  ? 'bg-arcane-accent text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Новые
            </button>
          </div>
        </div>

        {/* Rich Tag Filters & Live Count Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-arcane-accent-glow" /> Теги:
            </span>
            {Array.from(new Set([selectedTag, ...POPULAR_CHUB_TAGS])).map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTag(tag);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                    isSelected
                      ? 'bg-arcane-accent text-white shadow-md shadow-arcane-accent/20'
                      : 'bg-arcane-900/90 text-slate-400 hover:text-slate-200 hover:bg-arcane-800 border border-arcane-800'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Live Total Count Badge & Blacklist Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowBlacklistModal(true)}
              className="px-3 py-1 bg-rose-950/80 border border-rose-800/80 rounded-full text-xs font-mono font-bold text-rose-300 hover:bg-rose-900 transition-colors flex items-center gap-1.5 shadow-md"
            >
              <EyeOff className="w-3.5 h-3.5 text-rose-400" />
              Черный список ({blacklistedIds.length})
            </button>
            <span className="px-3 py-1 bg-arcane-900 border border-arcane-800 rounded-full text-xs font-mono font-bold text-arcane-accent-glow">
              {totalCount === null
                ? 'Синхронизация каталога…'
                : `${totalCount.toLocaleString('ru-RU')}${totalCount >= 100000 ? '+' : ''} персонажей`}
            </span>
          </div>
        </div>
      </div>

      {/* Active Tag Filter Banner (User Note 374) */}
      {selectedTag !== 'All' && (
        <div className="flex items-center justify-between p-4 bg-purple-950/90 border border-purple-500/50 rounded-2xl text-xs font-mono text-purple-200 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-cyan-400" />
            <span>
              Выбран фильтр по тегу: <strong className="text-white bg-purple-900 px-2 py-0.5 rounded-lg border border-purple-400/40">#{selectedTag}</strong>
              <span className="text-slate-400 ml-2">(Найдено в каталоге: {cards.length})</span>
            </span>
          </div>
          <button
            onClick={() => setSelectedTag('All')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs font-bold border border-purple-400/40 transition-colors shadow-md"
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span>Показать все персонажи</span>
          </button>
        </div>
      )}

      {/* Catalog Grid — Chub AI Gallery Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-xs gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-arcane-accent-glow" />
          Загрузка полного списка персонажей Chub AI через API...
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4 bg-arcane-900/60 border border-rose-900/60 rounded-2xl">
          <div className="text-sm font-bold text-rose-300">Синхронизация с Chub AI временно недоступна</div>
          <p className="max-w-xl text-xs text-slate-400">{loadError}</p>
          <Button
            size="sm"
            icon={<Loader2 className="w-4 h-4" />}
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Повторить синхронизацию
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {cards
            .filter((card) => !blacklistedIds.includes(card.id) && !blacklistedIds.includes(card.fullPath))
            .map((card) => {
              const isImported = importedCardIds.has(card.fullPath) || importedCardIds.has(card.id);
              return (
                <div
                  key={card.id}
                  className="group flex flex-col bg-arcane-900/90 rounded-2xl border border-arcane-800/80 overflow-hidden hover:border-arcane-600 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative"
                >
                  {/* Large Portrait Cover Image */}
                  <div 
                    onClick={() => handleOpenInspectModal(card)}
                    className="relative aspect-[3/4] w-full overflow-hidden bg-arcane-950 cursor-pointer"
                  >
                    <img
                      src={card.maxResUrl || card.avatarUrl}
                      alt={card.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay & Badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-arcane-950 via-transparent to-black/30" />

                    {/* Blacklist Toggle Button (Top Left) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBlacklist(card);
                      }}
                      className="absolute top-2 left-2 p-1.5 rounded-xl bg-black/80 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors backdrop-blur-md z-10"
                      title="Скрыть персонажа / Добавить в Черный список"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>

                    {/* Top Stats Badges */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-slate-200 border border-white/10">
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <MessageSquare className="w-3 h-3" /> {(card.chatsCount / 1000).toFixed(1)}k
                      </span>
                      <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                        <Star className="w-3 h-3 fill-amber-400" /> {card.starCount || card.rating}
                      </span>
                    </div>

                  {/* Bottom Image Overlay Title & Tagline */}
                  <div className="absolute bottom-3 left-3 right-3 space-y-1">
                    <h3 className="font-extrabold text-sm text-white drop-shadow-md line-clamp-1 group-hover:text-arcane-accent-glow transition-colors">
                      {card.name}
                    </h3>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-tight drop-shadow-sm font-medium">
                      {card.tagline || card.description}
                    </p>
                  </div>
                </div>

                {/* Card Footer Details */}
                <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between bg-arcane-900/90">
                  {/* Tag Pills */}
                  <div className="flex flex-wrap gap-1">
                    {card.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-arcane-950 text-slate-400 border border-arcane-800"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  {/* Author Handle + Actions Bar */}
                  <div className="pt-2 border-t border-arcane-800/60 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                      @{card.creator}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://chub.ai/characters/${card.fullPath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-purple-400 hover:text-white bg-arcane-950 border border-purple-900/60 hover:border-purple-500 rounded-lg transition-colors"
                        title="Открыть оригинал на Chub.ai"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleOpenInspectModal(card)}
                        className="p-1.5 text-slate-400 hover:text-slate-100 bg-arcane-950 border border-arcane-800 hover:border-arcane-700 rounded-lg transition-colors"
                        title="Просмотр подробностей"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <Button
                        size="sm"
                        variant={isImported ? 'ghost' : 'secondary'}
                        className="text-[11px] px-2.5 py-1"
                        disabled={isImported}
                        icon={isImported ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3" />}
                        onClick={() => handleImportCard(card, false)}
                      >
                        {isImported ? 'В базе' : '+ В базу'}
                      </Button>

                      <Button
                        size="sm"
                        className="text-[11px] px-2.5 py-1"
                        icon={<Bot className="w-3 h-3" />}
                        onClick={() => handleImportCard(card, true)}
                      >
                        Чат
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Footer Loader (User Note 381) */}
      {loadingMore && (
        <div className="flex items-center justify-center gap-3 py-8 text-xs font-mono text-purple-300">
          <Loader2 className="w-5 h-5 animate-spin text-arcane-accent-glow" />
          <span>Подгрузка следующих персонажей из каталога Chub AI...</span>
        </div>
      )}

      {/* Floating Back-To-Top Button (User Note 381) */}
      {showScrollTop && (
        <button
          onClick={handleScrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 bg-purple-950/90 hover:bg-purple-800 text-white rounded-2xl border border-purple-500/50 shadow-2xl backdrop-blur-md transition-all transform hover:scale-110 flex items-center justify-center group"
          title="Вернуться в начало каталога (Наверх)"
        >
          <ArrowUp className="w-5 h-5 text-cyan-300 group-hover:-translate-y-1 transition-transform" />
        </button>
      )}

      {/* Blacklist Management Modal (User Note 199) */}
      {showBlacklistModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[80vh] overflow-y-auto p-6 bg-arcane-900 border border-arcane-700 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-arcane-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-extrabold text-base">
                <Ban className="w-5 h-5" />
                <span>Черный список скрытых персонажей ({blacklistedIds.length})</span>
              </div>
              <button onClick={() => setShowBlacklistModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Скрытые персонажи больше не отображаются в каталоге. Вы можете восстановить любого персонажа в 1 клик.
            </p>

            {blacklistedIds.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                Черный список пуст. Вы не скрыли ни одного персонажа.
              </div>
            ) : (
              <div className="space-y-2">
                {blacklistedIds.map((key) => (
                  <div key={key} className="p-3 bg-arcane-950 rounded-xl border border-arcane-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-200 truncate max-w-[300px]">{key}</span>
                    <button
                      onClick={() => {
                        setBlacklistedIds((prev) => {
                          const updated = prev.filter((k) => k !== key);
                          localStorage.setItem('arcaneum_blacklisted_cards', JSON.stringify(updated));
                          return updated;
                        });
                      }}
                      className="px-3 py-1 bg-purple-900 hover:bg-purple-800 text-purple-200 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      Восстановить в каталог
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
