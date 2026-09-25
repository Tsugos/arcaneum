import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  Sparkles, 
  User,
  AlertCircle,
  X,
  UserCheck,
  Menu,
  Settings,
  Database,
  Sliders,
  MessageSquare,
  BookOpen,
  ArrowLeft,
  Wand2,
  Wand,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  ImagePlus,
  Globe
} from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import type { Session, ChatMessage, Persona, UserPersona } from '@/domain/entities';
import { globalChatService } from '@/services/chat/chat-service';
import { globalPersonaService } from '@/services/persona/persona-service';
import { globalUserPersonaService } from '@/services/persona/user-persona-service';
import { globalAIOrchestrator } from '@/core/ai-orchestrator';
import { globalAIProviderService } from '@/services/ai/provider-service';
import { globalTranslationService } from '@/services/translation/translation-service';
import { substituteMacros } from '@/shared/utils/macro-replacer';
import { FormattedRoleplayMessage } from './components/formatted-roleplay-message';
import { ChatMenuModal } from './components/chat-menu-modal';

export interface ChatViewProps {
  initialSessionId?: string;
  onBackToHub?: () => void;
}

type SwipeTranslationCache = Record<string, string[]>;

async function selectTranslatedSwipe(
  message: ChatMessage,
  swipeIndex: number,
  rawText: string,
  session: Session,
  persona?: Persona | null
): Promise<ChatMessage> {
  const enabled = session.translationSettings?.enabled ?? false;
  const sourceLang = session.translationSettings?.modelLanguage || 'en';
  const targetLang = session.translationSettings?.userLanguage || 'ru';
  const metadata = { ...(message.metadata || {}) };
  const allCaches = { ...((metadata.swipeTranslations as SwipeTranslationCache | undefined) || {}) };
  const cacheKey = `format-v2:${sourceLang}->${targetLang}`;
  const languageCache = [...(allCaches[cacheKey] || [])];

  if (!enabled || sourceLang === targetLang) {
    return {
      ...message,
      content: rawText,
      textOriginal: rawText,
      isTranslated: false,
      translationError: false,
      currentSwipeIndex: swipeIndex,
    };
  }

  if (languageCache[swipeIndex]) {
    return {
      ...message,
      content: languageCache[swipeIndex]!,
      textOriginal: rawText,
      isTranslated: true,
      translationError: false,
      currentSwipeIndex: swipeIndex,
    };
  }

  const translated = await globalTranslationService.translate(rawText, {
    sourceLang,
    targetLang,
    protectedTerms: persona ? [persona.data.name] : [],
  });

  if (!translated.text || translated.error) {
    return {
      ...message,
      content: rawText,
      textOriginal: rawText,
      isTranslated: false,
      translationError: true,
      currentSwipeIndex: swipeIndex,
    };
  }

  languageCache[swipeIndex] = translated.text;
  allCaches[cacheKey] = languageCache;
  metadata.swipeTranslations = allCaches;

  return {
    ...message,
    metadata,
    content: translated.text,
    textOriginal: rawText,
    isTranslated: true,
    translationError: false,
    sourceLang: translated.sourceLang,
    currentSwipeIndex: swipeIndex,
  };
}

export const ChatView: React.FC<ChatViewProps> = ({ initialSessionId, onBackToHub }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [activeUserPersona, setActiveUserPersona] = useState<UserPersona | null>(null);
  const [allUserPersonas, setAllUserPersonas] = useState<UserPersona[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Translation State
  const [showTranslationPopover, setShowTranslationPopover] = useState(false);
  const [showOriginalMap, setShowOriginalMap] = useState<Record<string, boolean>>({});

  const toggleShowOriginal = (msgId: string) => {
    setShowOriginalMap((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleToggleTranslationEnabled = async () => {
    if (!activeSession) return;
    const current = activeSession.translationSettings?.enabled ?? false;
    const updated = await globalChatService.updateSessionTranslationSettings(activeSession.id, {
      enabled: !current,
      userLanguage: activeSession.translationSettings?.userLanguage || 'ru',
      modelLanguage: activeSession.translationSettings?.modelLanguage || 'en',
    });
    setActiveSession(updated);
  };

  const handleUpdateTranslationLangs = async (userLang: string, modelLang: string) => {
    if (!activeSession) return;
    const updated = await globalChatService.updateSessionTranslationSettings(activeSession.id, {
      userLanguage: userLang,
      modelLanguage: modelLang,
    });
    setActiveSession(updated);
  };

  // Auto-Expanding Textarea Ref (User Note 488)
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  };

  // Image Attachment State (User Note 446)
  const [attachedImageBase64, setAttachedImageBase64] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setAttachedImageBase64(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const [showPersonaPromptsModal, setShowPersonaPromptsModal] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showBurgerDropdown, setShowBurgerDropdown] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [initialModalTab, setInitialModalTab] = useState<'settings' | 'memory' | 'customize'>('settings');

  // Rename Bot State (User Note 329)
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInputText, setRenameInputText] = useState('');

  const handleOpenRenameModal = () => {
    if (activePersona) {
      setRenameInputText(activePersona.data.name);
      setShowRenameModal(true);
    }
  };

  const handleSaveNewBotName = async () => {
    if (!activePersona || !renameInputText.trim()) return;
    const newName = renameInputText.trim();
    const updated = await globalPersonaService.updatePersona(activePersona.id, {
      data: { name: newName },
    });
    setActivePersona(updated);
    setShowRenameModal(false);
  };

  // Rename Session Handlers (User Note 586 & 607)
  const [isEditingSessionTitle, setIsEditingSessionTitle] = useState(false);
  const [sessionTitleText, setSessionTitleText] = useState('');

  const handleSaveSessionTitleInline = async () => {
    if (!activeSession || !sessionTitleText.trim()) return;
    const updated = await globalChatService.updateSessionTitle(activeSession.id, sessionTitleText.trim());
    setActiveSession(updated);
    setIsEditingSessionTitle(false);
    await loadSessions();
  };

  const handleWriteForMe = async () => {
    if (!activePersona || generating) return;
    setGenerating(true);
    setGenerationError(null);
    setShowToolsDropdown(false);
    try {
      const recentTranscript = messages.slice(-4).map((m) => `${m.role === 'user' ? (activeUserPersona?.name || 'Player') : activePersona.data.name}: ${m.content}`).join('\n');
      const prompt = `[Roleplay Context]:\nCharacter: ${activePersona.data.name}\nPlayer: ${activeUserPersona?.name || 'Player'}\nScenario: ${activePersona.data.scenario || activePersona.data.summary || 'Roleplay Study'}\n\n[Recent Chat History]:\n${recentTranscript || activePersona.data.firstMessage}\n\n[Task]: Write the next immersive, natural roleplay turn for "${activeUserPersona?.name || 'Player'}" responding in-character. Keep it 1-2 paragraphs.`;
      
      const res = await globalAIProviderService.generate(prompt, {
        modelId: activeSession?.generationSettings?.modelId || globalAIProviderService.getActiveModel(),
        temperature: 0.8,
        maxTokens: 300,
      });
      if (res.text) {
        setInputText(res.text.trim());
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Ошибка генерации ответа за пользователя');
    } finally {
      setGenerating(false);
    }
  };

  const handleEnhanceDraft = async () => {
    if (!inputText.trim() || generating) return;
    setGenerating(true);
    setGenerationError(null);
    setShowToolsDropdown(false);
    try {
      const recentTranscript = messages.slice(-4).map((m) => `${m.role === 'user' ? (activeUserPersona?.name || 'Player') : (activePersona ? activePersona.data.name : 'AI')}: ${m.content}`).join('\n');
      const prompt = `[Roleplay Context]:\nCharacter: ${activePersona ? activePersona.data.name : 'AI'}\nPlayer: ${activeUserPersona?.name || 'Player'}\n\n[Recent Chat History]:\n${recentTranscript}\n\n[User Draft]: "${inputText.trim()}"\n\n[Task]: Expand and enhance this draft into rich, descriptive, high-quality roleplay dialogue for "${activeUserPersona?.name || 'Player'}". Keep original meaning but enhance vocabulary and actions. Output only the final response text.`;
      
      const res = await globalAIProviderService.generate(prompt, {
        modelId: activeSession?.generationSettings?.modelId || globalAIProviderService.getActiveModel(),
        temperature: 0.75,
        maxTokens: 350,
      });
      if (res.text) {
        setInputText(res.text.trim());
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Ошибка улучшения черновика');
    } finally {
      setGenerating(false);
    }
  };

  // New session modal state
  const [showSelectCharacterModal, setShowSelectCharacterModal] = useState(false);
  const [availablePersonas, setAvailablePersonas] = useState<Persona[]>([]);
  const [selectedUserPersonaForNewSession, setSelectedUserPersonaForNewSession] = useState<string>('');

  // Session deletion confirmation
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    const list = await globalChatService.getAllSessions();
    const userPersonas = await globalUserPersonaService.getAllUserPersonas();
    setAllUserPersonas(userPersonas);

    // Entering ChatView without a concrete session always means "create a chat".
    // Open the character picker instead of rendering a fake Arcaneum AI session.
    if (!initialSessionId) {
      const personas = await globalPersonaService.getAllPersonas();
      const defaultUserPersona = await globalUserPersonaService.getDefaultUserPersona();
      setAvailablePersonas(personas);
      setSelectedUserPersonaForNewSession(defaultUserPersona?.id || userPersonas[0]?.id || '');
      setShowSelectCharacterModal(true);
    }

    if (list.length === 0) {
      setSessions([]);
      setActiveSession(null);
    } else {
      setSessions(list);
      if (initialSessionId) {
        const found = list.find((s) => s.id === initialSessionId);
        if (found) setActiveSession(found);
        else if (list.length > 0) setActiveSession(list[0]!);
      } else if (!activeSession && list.length > 0) {
        setActiveSession(list[0]!);
      }
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const refreshActiveSession = async () => {
    if (!activeSession) return;
    const reloaded = await globalChatService.getSession(activeSession.id);
    if (reloaded) {
      setActiveSession(reloaded);
    }
  };

  // Message Editing & Swiping States
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  useEffect(() => {
    if (activeSession) {
      globalPersonaService.getPersona(activeSession.characterId).then((p) => {
        if (p) setActivePersona(p);
      });

      if (activeSession.userPersonaId) {
        globalUserPersonaService.getUserPersona(activeSession.userPersonaId).then((up) => {
          if (up) setActiveUserPersona(up);
        });
      } else {
        globalUserPersonaService.getDefaultUserPersona().then((up) => {
          if (up) setActiveUserPersona(up);
        });
      }

      globalChatService.getMessages(activeSession.id).then(async (msgs) => {
        let loadedMsgs = msgs;
        const p = await globalPersonaService.getPersona(activeSession.characterId);
        
        if (loadedMsgs.length === 0 && p && p.data.firstMessage) {
          const initialSwipes = [
            p.data.firstMessage,
            ...(p.data.alternateGreetings || []),
          ].filter(Boolean);

          const firstMsg = await globalChatService.addMessage(
            activeSession.id,
            'assistant',
            initialSwipes[0]!,
            initialSwipes
          );
          loadedMsgs = [firstMsg];
        }

        // Auto-translate untranslated assistant messages & swipes if translation is active
        const isTranslationEnabled = activeSession.translationSettings?.enabled ?? false;

        if (isTranslationEnabled) {
          const translatedMsgs = await Promise.all(
            loadedMsgs.map(async (msg, index) => {
              if (msg.role === 'assistant') {
                const currentIdx = msg.currentSwipeIndex || 0;
                let rawSwipes = msg.swipes && msg.swipes.length > 0 ? [...msg.swipes] : [];

                if (rawSwipes.length === 0) {
                  const raw0 = (index === 0 && p?.data?.firstMessage) ? p.data.firstMessage : (msg.textOriginal || msg.content);
                  rawSwipes = [raw0];
                } else if (index === 0 && p?.data?.firstMessage && rawSwipes[0] !== p.data.firstMessage) {
                  rawSwipes[0] = p.data.firstMessage;
                }

                const rawSelectedText = rawSwipes[currentIdx] || rawSwipes[0] || msg.content;
                try {
                  const updatedMsg = await selectTranslatedSwipe(
                    { ...msg, swipes: rawSwipes },
                    currentIdx,
                    rawSelectedText,
                    activeSession,
                    p
                  );
                  await globalChatService.updateMessage(updatedMsg);
                  return updatedMsg;
                } catch (e) {
                  console.error('Failed to translate swipe message:', e);
                }
              }
              return msg;
            })
          );
          setMessages(translatedMsgs);
          scrollToBottom();
          return;
        }

        setMessages(loadedMsgs);
        scrollToBottom();
      });
    }
  }, [activeSession]);

  // Message Action Handlers (User Notes 227 & 229 & 250)
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeSession) return;
    await globalChatService.deleteMessage(activeSession.id, msgId);
    const updated = await globalChatService.getMessages(activeSession.id);
    setMessages(updated);
  };

  const handleStartEditing = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.content);
  };

  const handleSaveEditedMessage = async () => {
    if (!activeSession || !editingMessageId) return;
    await globalChatService.updateMessageContent(activeSession.id, editingMessageId, editingText);
    setEditingMessageId(null);
    setEditingText('');
    const updated = await globalChatService.getMessages(activeSession.id);
    setMessages(updated);
  };

  const handleSwipeLeft = async (msg: ChatMessage) => {
    if (!activeSession || !msg.swipes || (msg.currentSwipeIndex || 0) <= 0) return;
    const newIdx = (msg.currentSwipeIndex || 0) - 1;
    const rawSelected = msg.swipes[newIdx] || msg.content;
    const p = await globalPersonaService.getPersona(activeSession.characterId);
    const updatedMsg = await selectTranslatedSwipe(msg, newIdx, rawSelected, activeSession, p);
    await globalChatService.updateMessage(updatedMsg);
    const updated = await globalChatService.getMessages(activeSession.id);
    setMessages(updated);
  };

  const handleSwipeRight = async (msg: ChatMessage) => {
    if (!activeSession || generating) return;
    const existingSwipes = msg.swipes && msg.swipes.length > 0 ? msg.swipes : [msg.textOriginal || msg.content];
    const currentIdx = msg.currentSwipeIndex || 0;
    // If navigating to an existing swipe variant
    if (currentIdx < existingSwipes.length - 1) {
      const nextIdx = currentIdx + 1;
      const rawSelected = existingSwipes[nextIdx]!;
      const p = await globalPersonaService.getPersona(activeSession.characterId);
      const updatedMsg = await selectTranslatedSwipe(msg, nextIdx, rawSelected, activeSession, p);
      await globalChatService.updateMessage(updatedMsg);
      const updated = await globalChatService.getMessages(activeSession.id);
      setMessages(updated);
      return;
    }

    // Otherwise, generate a NEW swipe variation
    setGenerating(true);
    setGenerationError(null);
    try {
      const res = await globalAIOrchestrator.processTurn({
        sessionId: activeSession.id,
      });

      await globalChatService.deleteMessage(activeSession.id, res.assistantMessage.id);

      const newRawText = res.assistantMessage.textOriginal || res.assistantMessage.content;
      const updatedSwipes = [...existingSwipes, newRawText];
      const newIdx = updatedSwipes.length - 1;

      const p = await globalPersonaService.getPersona(activeSession.characterId);
      const updatedMsg = await selectTranslatedSwipe(
        { ...msg, swipes: updatedSwipes },
        newIdx,
        newRawText,
        activeSession,
        p
      );
      await globalChatService.updateMessage(updatedMsg);

      const updated = await globalChatService.getMessages(activeSession.id);
      setMessages(updated);
      scrollToBottom();
    } catch (err: any) {
      setGenerationError(err.message || 'Ошибка сгенерировать свайп');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !attachedImageBase64) || !activeSession || generating) return;

    let userText = inputText.trim();
    if (attachedImageBase64) {
      userText = userText
        ? `${userText}\n\n![Прикрепленное изображение](${attachedImageBase64})`
        : `![Прикрепленное изображение](${attachedImageBase64})`;
    }

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setAttachedImageBase64(null);
    setGenerating(true);
    setGenerationError(null);

    try {
      await globalAIOrchestrator.processTurn({
        sessionId: activeSession.id,
        userMessageContent: userText,
      });
      const updatedMsgs = await globalChatService.getMessages(activeSession.id);
      setMessages(updatedMsgs);
      scrollToBottom();
    } catch (err: any) {
      console.error('[ChatView] Generation error:', err);
      setGenerationError(err.message || 'Ошибка генерации ответа');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenNewSessionModal = async () => {
    const personas = await globalPersonaService.getAllPersonas();
    const userPersonas = await globalUserPersonaService.getAllUserPersonas();
    const defaultUp = await globalUserPersonaService.getDefaultUserPersona();

    setAvailablePersonas(personas);
    setAllUserPersonas(userPersonas);
    setSelectedUserPersonaForNewSession(defaultUp?.id || userPersonas[0]?.id || '');
    setShowSelectCharacterModal(true);
    setShowBurgerDropdown(false);
  };

  const handleSelectCharacterForSession = async (persona: Persona) => {
    setShowSelectCharacterModal(false);
    const newSession = await globalChatService.createSession(
      persona.id,
      `Диалог с ${persona.data.name}`,
      selectedUserPersonaForNewSession || undefined
    );
    await loadSessions();
    setActiveSession(newSession);
  };

  const handleChangeUserPersonaInSession = async (userPersonaId: string) => {
    if (!activeSession) return;
    await globalChatService.updateSessionUserPersona(activeSession.id, userPersonaId);
    const up = await globalUserPersonaService.getUserPersona(userPersonaId);
    if (up) setActiveUserPersona(up);
    setActiveSession({ ...activeSession, userPersonaId });
  };

  const handleDeleteSession = async (sessionId: string) => {
    await globalChatService.deleteSession(sessionId);
    setDeletingSessionId(null);
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
    }
    await loadSessions();
  };

  const openChatModalWithTab = (tab: 'settings' | 'memory' | 'customize') => {
    setInitialModalTab(tab);
    setShowChatModal(true);
    setShowBurgerDropdown(false);
  };

  const activeModelName = activeSession?.generationSettings?.modelId
    ? activeSession.generationSettings.modelId.split('/').pop()
    : globalAIProviderService.getActiveModel().split('/').pop() || 'horde';

  return (
    <div className="flex h-full w-full overflow-hidden bg-arcane-950">
      {/* Main Chat Viewport (Full Screen Width) */}
      <div className="flex-1 flex flex-col min-w-0 bg-arcane-950">
        {/* Chat Header — Janitor AI Style with Back Button & Burger Menu ☰ */}
        <div className="p-4 border-b border-arcane-800/60 bg-arcane-900/40 flex items-center justify-between shrink-0 relative">
          {/* AI Character & Back Button */}
          <div className="flex items-center gap-3">
            {onBackToHub && (
              <button
                onClick={onBackToHub}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-arcane-800 hover:bg-arcane-700 border border-arcane-700 text-xs font-semibold text-slate-300 hover:text-white rounded-lg transition-colors mr-1"
                title="Назад на Главный Хаб"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Назад</span>
              </button>
            )}

            {/* Clickable Character Avatar & Name -> Opens Prompts Inspector (User Note 36) */}
            <div
              role="button"
              tabIndex={activePersona ? 0 : -1}
              onClick={() => {
                if (activePersona) setShowPersonaPromptsModal(true);
              }}
              onKeyDown={(event) => {
                if (activePersona && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  setShowPersonaPromptsModal(true);
                }
              }}
              className="flex items-center gap-3 group text-left focus:outline-none p-1 rounded-xl hover:bg-arcane-800/60 transition-colors"
              title="Нажмите, чтобы просмотреть все промпты, характер и описание персонажа"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-arcane-800 border border-purple-500/40 shrink-0 shadow-md group-hover:scale-105 transition-transform">
                {activePersona?.metadata?.avatarUrl ? (
                  <img src={activePersona.metadata.avatarUrl} alt={activePersona.data.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-purple-900 text-purple-200 flex items-center justify-center font-bold text-sm">
                    {activePersona ? activePersona.data.name.charAt(0) : 'A'}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-extrabold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                    <span>{activePersona ? activePersona.data.name : 'Выберите персонажа'}</span>
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h2>
                  {activePersona && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRenameModal();
                      }}
                      className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                      title="Переименовать персонажа (Переименование ИИ)"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                {/* Inline Session Rename Field (User Note 607: Checkmark & Cross on Left) */}
                <div className="flex items-center gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
                  {isEditingSessionTitle ? (
                    <div className="flex items-center gap-1 bg-arcane-950 px-2 py-0.5 rounded-xl border border-cyan-500/60 shadow-lg">
                      <button
                        type="button"
                        onClick={handleSaveSessionTitleInline}
                        className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-950/60 transition-colors"
                        title="Сохранить название чата"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingSessionTitle(false)}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-colors"
                        title="Отмена"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="text"
                        value={sessionTitleText}
                        onChange={(e) => setSessionTitleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSessionTitleInline();
                          if (e.key === 'Escape') setIsEditingSessionTitle(false);
                        }}
                        className="bg-transparent text-xs text-cyan-300 px-1 focus:outline-none font-bold w-32 sm:w-44 font-mono"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-purple-400 font-mono flex items-center gap-1 font-semibold max-w-[150px] sm:max-w-[220px] truncate">
                        {activeSession?.title || 'Диалог'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionTitleText(activeSession?.title || '');
                          setIsEditingSessionTitle(true);
                        }}
                        className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="Переименовать этот чат"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Header Controls: Translation Badge + Model Badge + User Persona + Burger Menu ☰ */}
          <div className="flex items-center gap-3">
            {/* Translation Badge & Popover */}
            <div className="relative">
              <button
                onClick={() => setShowTranslationPopover(!showTranslationPopover)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                  activeSession?.translationSettings?.enabled
                    ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'bg-arcane-800/80 border-arcane-700/60 text-slate-400 hover:text-slate-200'
                }`}
                title="Настройки ИИ-Переводчика"
              >
                <Globe className={`w-3.5 h-3.5 ${activeSession?.translationSettings?.enabled ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="font-bold text-[11px] hidden sm:inline">
                  {activeSession?.translationSettings?.enabled ? 'Переводчик: RU ↔ EN' : 'Переводчик: ВЫКЛ'}
                </span>
              </button>

              {/* Translation Popover */}
              {showTranslationPopover && (
                <div className="absolute right-0 top-10 z-50 w-72 bg-arcane-900 border border-cyan-500/40 rounded-xl shadow-2xl p-4 space-y-3.5 backdrop-blur-md text-xs">
                  <div className="flex items-center justify-between border-b border-arcane-800 pb-2">
                    <div className="flex items-center gap-2 font-bold text-slate-100">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span>ИИ-Переводчик (RU ↔ EN)</span>
                    </div>
                    <button onClick={() => setShowTranslationPopover(false)} className="text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-arcane-950/80 border border-arcane-800">
                    <span className="text-slate-300 font-medium">Статус авто-перевода</span>
                    <button
                      onClick={handleToggleTranslationEnabled}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                        activeSession?.translationSettings?.enabled
                          ? 'bg-cyan-600 text-white shadow-md'
                          : 'bg-arcane-800 text-slate-400'
                      }`}
                    >
                      {activeSession?.translationSettings?.enabled ? 'ВКЛ' : 'ВЫКЛ'}
                    </button>
                  </div>

                  {/* Language Selectors */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>Язык Игрока:</span>
                      <select
                        value={activeSession?.translationSettings?.userLanguage || 'ru'}
                        onChange={(e) => handleUpdateTranslationLangs(e.target.value, activeSession?.translationSettings?.modelLanguage || 'en')}
                        className="bg-arcane-950 border border-arcane-700 text-cyan-300 rounded px-2 py-0.5 font-bold focus:outline-none"
                      >
                        <option value="ru">Русский (RU)</option>
                        <option value="en">English (EN)</option>
                        <option value="de">Deutsch (DE)</option>
                        <option value="fr">Français (FR)</option>
                        <option value="es">Español (ES)</option>
                        <option value="ja">日本語 (JA)</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>Язык Нейросети:</span>
                      <select
                        value={activeSession?.translationSettings?.modelLanguage || 'en'}
                        onChange={(e) => handleUpdateTranslationLangs(activeSession?.translationSettings?.userLanguage || 'ru', e.target.value)}
                        className="bg-arcane-950 border border-arcane-700 text-purple-300 rounded px-2 py-0.5 font-bold focus:outline-none"
                      >
                        <option value="en">English (EN)</option>
                        <option value="ru">Русский (RU)</option>
                        <option value="de">Deutsch (DE)</option>
                        <option value="fr">Français (FR)</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 leading-normal bg-arcane-950 p-2 rounded border border-arcane-800/80">
                    💡 Вы пишете и читаете по-русски. Нейросеть получает ролевой английский контекст (экономит в 3 раза больше токенов).
                  </div>
                </div>
              )}
            </div>

            {/* Model Badge (like Janitor 'используется janitor') */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-arcane-800/80 border border-arcane-700/60 rounded-lg text-xs font-mono text-slate-300">
              <span className="text-[10px] text-slate-500 uppercase">Модель:</span>
              <span className="text-arcane-accent-glow font-medium truncate max-w-[120px]">{activeModelName}</span>
            </div>

            {/* Burger Menu Button ☰ */}
            <div className="relative">
              <button
                onClick={() => setShowBurgerDropdown(!showBurgerDropdown)}
                className="p-2 bg-arcane-800 hover:bg-arcane-700 border border-arcane-700 text-slate-200 rounded-lg transition-colors"
                title="Меню настроек чата"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Burger Dropdown Menu (Janitor AI Style) */}
              {showBurgerDropdown && (
                <div className="absolute right-0 top-11 z-40 w-52 bg-arcane-900 border border-arcane-700 rounded-xl shadow-2xl p-1.5 space-y-1 text-xs backdrop-blur-md">
                  <button
                    onClick={() => openChatModalWithTab('settings')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4 text-arcane-accent-glow" />
                    Настройки
                  </button>
                  <button
                    onClick={() => openChatModalWithTab('memory')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
                  >
                    <Database className="w-4 h-4 text-arcane-gold" />
                    Память чата
                  </button>
                  <button
                    onClick={() => openChatModalWithTab('customize')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
                  >
                    <Sliders className="w-4 h-4 text-arcane-cyan" />
                    Настроить
                  </button>
                  <div className="border-t border-arcane-800/80 my-1" />
                  <button
                    onClick={handleOpenNewSessionModal}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Новый чат
                  </button>
                  <button
                    onClick={() => {
                      setShowBurgerDropdown(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    Все чаты ({sessions.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {generationError && (
          <div className="m-4 mb-0 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between text-xs text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{generationError}</span>
            </div>
            <button onClick={() => setGenerationError(null)} className="text-red-400 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Message Log Container with Applied Custom Theme Wallpaper (User Note 118-120) */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 transition-all"
          style={
            activeSession?.themeSettings?.bgWallpaperUrl
              ? {
                  backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 18, 0.82), rgba(10, 10, 18, 0.92)), url(${activeSession.themeSettings.bgWallpaperUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {}
          }
        >
          {/* Anchored High-Res Character Welcome Banner Card (User Note 27-30) */}
          {activePersona && (
            <div className="p-5 rounded-2xl bg-arcane-900/90 border border-purple-500/30 w-full max-w-5xl mx-auto space-y-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => setShowPersonaPromptsModal(true)}
                  className="w-16 h-20 rounded-xl overflow-hidden bg-arcane-950 border border-purple-500/50 shrink-0 shadow-lg cursor-pointer group"
                >
                  {activePersona.metadata?.avatarUrl ? (
                    <img 
                      src={activePersona.metadata.avatarUrl} 
                      alt={activePersona.data.name} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-900 text-purple-200 flex items-center justify-center font-bold text-xl">
                      {activePersona.data.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 
                    onClick={() => setShowPersonaPromptsModal(true)}
                    className="font-extrabold text-base text-slate-100 cursor-pointer hover:text-cyan-300 transition-colors flex items-center gap-2"
                  >
                    <span>{activePersona.data.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300 font-mono">
                      @{activePersona.metadata?.creator || 'Chub AI'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                    {activePersona.data.summary || activePersona.data.description.slice(0, 100)}
                  </p>
                  {activeUserPersona && (
                    <div className="text-[10px] text-purple-300 font-mono pt-1">
                      Вы в чате как: <span className="font-bold text-cyan-300">@{activeUserPersona.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.role === 'user';
            const bubbleThemeClasses: Record<string, string> = {
              purple: 'p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-purple-100 shadow-md',
              cyan: 'p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-100 shadow-md',
              crimson: 'p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-100 shadow-md',
              emerald: 'p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-100 shadow-md',
              oled: 'p-3 rounded-2xl bg-black border border-slate-800 text-slate-100 shadow-md',
            };
            const bubbleTheme = activeSession?.themeSettings?.bubbleTheme || 'purple';
            const bubbleThemeClass = bubbleThemeClasses[bubbleTheme] || bubbleThemeClasses.purple;
            const fontFamily = activeSession?.themeSettings?.fontFamily || 'sans';
            const fontStyleClass = fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans';
            const swipesList = m.swipes && m.swipes.length > 0 ? m.swipes : [m.content];
            const currentIdx = m.currentSwipeIndex || 0;
            const isShowingOriginal = Boolean(showOriginalMap[m.id]);
            const displayContent = isShowingOriginal && m.textOriginal ? m.textOriginal : m.content;

            return (
              <div key={m.id} className="space-y-1.5 w-full max-w-5xl mx-auto py-2 group/msg">
                {/* Header: {Avatar} {Name} + Top Action Buttons (User Notes 268 & 290 & 297) */}
                <div className={`flex items-center justify-between gap-2.5 ${isUser ? 'flex-row-reverse text-right' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-purple-500/40 bg-arcane-950 shadow-md">
                      {isUser ? (
                        activeUserPersona?.avatarUrl ? (
                          <img src={activeUserPersona.avatarUrl} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-arcane-accent text-white flex items-center justify-center font-bold text-xs">
                            <User className="w-4 h-4" />
                          </div>
                        )
                      ) : (
                        activePersona?.metadata?.avatarUrl ? (
                          <img src={activePersona.metadata.avatarUrl} alt={activePersona.data.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-purple-900 text-purple-200 flex items-center justify-center font-bold text-xs">
                            <Bot className="w-4 h-4" />
                          </div>
                        )
                      )}
                    </div>
                    <span className="font-extrabold text-sm text-slate-100">
                      {isUser ? activeUserPersona?.name || 'Вы' : activePersona?.data.name || 'Персонаж'}
                    </span>
                  </div>

                  {/* Top Header Action Buttons: Translate Toggle, Edit & Delete (User Notes 290 & 297) */}
                  <div className="flex items-center gap-1 opacity-70 group-hover/msg:opacity-100 transition-opacity">
                    {(m.textOriginal || m.isTranslated) && (
                      <button
                        onClick={() => toggleShowOriginal(m.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 border transition-colors ${
                          isShowingOriginal
                            ? 'bg-purple-950 border-purple-500 text-purple-300'
                            : 'bg-cyan-950 border-cyan-500/60 text-cyan-300'
                        }`}
                        title={isShowingOriginal ? 'Переключить на Перевод (RU)' : 'Переключить на Оригинал (EN)'}
                      >
                        <Globe className="w-3 h-3" />
                        <span>{isShowingOriginal ? 'Оригинал EN' : 'Перевод RU'}</span>
                      </button>
                    )}

                    {m.translationError && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-300 font-mono">
                        ⚠️ Перевод недоступен
                      </span>
                    )}

                    <button
                      onClick={() => handleStartEditing(m)}
                      className="p-1.5 rounded-lg hover:bg-arcane-800 text-slate-400 hover:text-white transition-colors"
                      title="Редактировать сообщение"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(m.id)}
                      className="p-1.5 rounded-lg hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                      title="Удалить сообщение"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body Content with Applied Bubble Theme & Font Family */}
                <div className={`text-xs ${fontStyleClass} ${bubbleThemeClass} transition-all`}>
                  {editingMessageId === m.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-arcane-950 text-slate-100 p-2.5 rounded-lg border border-purple-500/50 text-xs focus:outline-none whitespace-pre-wrap leading-relaxed min-h-[80px]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditingMessageId(null)} className="px-2.5 py-1 rounded-lg bg-arcane-800 text-slate-300 text-[11px] font-bold">
                          Отмена
                        </button>
                        <button onClick={handleSaveEditedMessage} className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Сохранить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <FormattedRoleplayMessage
                      content={substituteMacros(displayContent, activePersona?.data.name, activeUserPersona?.name)}
                    />
                  )}
                </div>

                {/* Clean Edge Swiper Controls without boxes/borders (User Notes 305-307) */}
                {!isUser && (
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono py-1 select-none">
                    {/* Left Edge Arrow < */}
                    <button
                      onClick={() => handleSwipeLeft(m)}
                      disabled={currentIdx === 0}
                      className="text-slate-400 hover:text-purple-300 disabled:opacity-20 p-1 transition-colors"
                      title="Предыдущий вариант ответа"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Center Disappearing / Subtle Swipe Counter (User Note 306) */}
                    <span className="text-[11px] text-slate-500 font-mono tracking-widest">
                      ({currentIdx + 1} / {swipesList.length})
                    </span>

                    {/* Right Edge Arrow > */}
                    <button
                      onClick={() => handleSwipeRight(m)}
                      className="text-purple-400 hover:text-purple-200 p-1 transition-colors"
                      title="Сгенерировать новый вариант ответа (Свайп)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Typing Indicator above input bar (User Note 236) */}
        {generating && (
          <div className="px-6 py-2 border-t border-arcane-800/60 bg-arcane-950/80 flex items-center gap-2 text-xs font-mono text-purple-300 backdrop-blur-md">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span>{activePersona?.data.name || 'Персонаж'} пишет...</span>
          </div>
        )}

        {/* Input Bar with Left Magic Tools, Image Attachment & Right User Persona Chip */}
        <div className="p-4 border-t border-arcane-800/60 bg-arcane-900/40 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex flex-col gap-2 w-full max-w-5xl mx-auto"
          >
            {/* Hidden Image File Upload Input */}
            <input
              type="file"
              ref={imageFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageFileSelect}
            />

            {/* Attached Image Preview Chip */}
            {attachedImageBase64 && (
              <div className="flex items-center gap-2 p-2 bg-purple-950/80 border border-purple-500/50 rounded-xl text-xs text-purple-200 font-mono">
                <img src={attachedImageBase64} alt="Attachment Preview" className="w-10 h-10 object-cover rounded-lg border border-purple-400/50 shrink-0" />
                <div className="flex-1 truncate">
                  <span className="font-bold text-cyan-300">Изображение прикреплено 📷</span>
                  <div className="text-[10px] text-slate-400 truncate">Отправится вместе с новым сообщением</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImageBase64(null)}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/50 transition-colors"
                  title="Удалить прикрепление"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 w-full">
              {/* Left Magic Tools Dropdown */}
              <div className="relative shrink-0 mb-1 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                  className="p-2.5 bg-arcane-950 hover:bg-purple-950 border border-purple-500/40 text-purple-300 hover:text-white rounded-xl transition-colors shadow-md flex items-center gap-1"
                  title="Помощник автора (Напиши за меня / Улучши черновик)"
                >
                  <Wand2 className="w-4 h-4 text-purple-400" />
                </button>

                {/* Image Upload Button (User Note 446) */}
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  className="p-2.5 bg-arcane-950 hover:bg-purple-950 border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl transition-colors shadow-md flex items-center gap-1"
                  title="Прикрепить изображение к сообщению"
                >
                  <ImagePlus className="w-4 h-4 text-cyan-400" />
                </button>

                {showToolsDropdown && (
                  <div className="absolute left-0 bottom-12 z-40 w-64 bg-arcane-900 border border-purple-500/50 rounded-2xl shadow-2xl p-2 space-y-1 text-xs backdrop-blur-md">
                    <div className="px-2 py-1 text-[10px] text-purple-400 font-mono font-bold uppercase tracking-wider">
                      Помощник ролевой игры ✨
                    </div>
                    <button
                      type="button"
                      onClick={handleWriteForMe}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-purple-950 hover:text-white transition-colors text-left font-medium"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold text-amber-300">Напиши за меня</div>
                        <div className="text-[10px] text-slate-400">Генерирует ответ от имени Персоны</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleEnhanceDraft}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-purple-950 hover:text-white transition-colors text-left font-medium"
                    >
                      <Wand className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-bold text-cyan-300">Улучшить мой черновик</div>
                        <div className="text-[10px] text-slate-400">Красиво расширяет ваш текст</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Auto-Expanding Multiline Textarea (User Note 488) */}
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={`Сообщение от имени ${activeUserPersona?.name || 'Игрока'}... (Shift+Enter для переноса)`}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={generating}
                className="flex-1 bg-arcane-950 border border-arcane-800 focus:border-purple-500 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors font-sans leading-relaxed resize-none overflow-y-auto max-h-56 whitespace-pre-wrap break-words"
              />

              {/* Right User Persona Selector Chip */}
              <div className="hidden sm:flex items-center gap-1.5 bg-arcane-950 border border-arcane-800 px-3 py-1.5 rounded-xl shrink-0">
                <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <select
                  value={activeUserPersona?.id || ''}
                  onChange={(e) => handleChangeUserPersonaInSession(e.target.value)}
                  className="bg-transparent text-xs text-purple-300 font-bold focus:outline-none select-none max-w-[120px] truncate cursor-pointer"
                >
                  {allUserPersonas.map((up) => (
                    <option key={up.id} value={up.id} className="bg-arcane-950 text-slate-200 font-normal">
                      {up.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                size="md"
                disabled={generating || (!inputText.trim() && !attachedImageBase64)}
                icon={<Send className="w-4 h-4" />}
                className="py-2.5 px-4 font-bold bg-purple-600 hover:bg-purple-500 rounded-xl"
              >
                Отправить
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Chat Menu Modal (Settings / Memory / Customize) */}
      {showChatModal && activeSession && (
        <ChatMenuModal
          session={activeSession}
          initialTab={initialModalTab}
          onClose={() => setShowChatModal(false)}
          onSessionUpdated={refreshActiveSession}
        />
      )}

      {/* Select Character Modal */}
      {showSelectCharacterModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 bg-arcane-900 border-arcane-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-arcane-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-arcane-accent-glow" />
                Параметры нового диалога
              </h3>
              <button onClick={() => setShowSelectCharacterModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* User Persona Picker for New Session */}
              {allUserPersonas.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-arcane-accent-glow" /> Ваша Персону Игрока в этом диалоге
                  </label>
                  <select
                    value={selectedUserPersonaForNewSession}
                    onChange={(e) => setSelectedUserPersonaForNewSession(e.target.value)}
                    className="w-full bg-arcane-950 border border-arcane-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-arcane-accent"
                  >
                    {allUserPersonas.map((up) => (
                      <option key={up.id} value={up.id}>
                        {up.name} {up.isDefault ? '(основная)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* AI Character Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Выберите ИИ Персонажа для отыгрыша
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {availablePersonas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectCharacterForSession(p)}
                      className="w-full p-3 bg-arcane-950 border border-arcane-800 hover:border-arcane-accent rounded-lg text-left transition-all flex items-center gap-3 group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-arcane-800 border border-arcane-700 flex items-center justify-center font-bold text-arcane-accent-glow group-hover:bg-arcane-accent group-hover:text-white transition-colors">
                        {p.data.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-xs text-slate-200 group-hover:text-white">{p.data.name}</h4>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-arcane-800 text-slate-400 uppercase font-mono">{p.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{p.data.summary || p.data.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Session Modal */}
      {deletingSessionId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 bg-arcane-900 border-red-500/30 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Удалить диалог?</h3>
            <p className="text-xs text-slate-400">
              Все сообщения этой сессии будут навсегда удалены из истории.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeletingSessionId(null)}>
                Отмена
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDeleteSession(deletingSessionId)}>
                Удалить
              </Button>
            </div>
          </Card>
        </div>
      )}
      {/* Persona Prompts Inspector Modal (User Note 36) */}
      {showPersonaPromptsModal && activePersona && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4 bg-arcane-900 border-arcane-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-arcane-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-arcane-950 border border-purple-500/40 shrink-0">
                  {activePersona.metadata?.avatarUrl ? (
                    <img src={activePersona.metadata.avatarUrl} alt={activePersona.data.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-purple-900 text-purple-200 flex items-center justify-center font-bold">
                      {activePersona.data.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                    <span>{activePersona.data.name} — Промпты & Описание</span>
                  </h3>
                  <span className="text-[10px] text-purple-400 font-mono">
                    @{activePersona.metadata?.creator || 'Chub AI'} • SillyTavern V2 Card
                  </span>
                </div>
              </div>
              <button onClick={() => setShowPersonaPromptsModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Description (Описание)</label>
                <div className="p-4 bg-arcane-950 rounded-xl border border-arcane-800 text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-60 overflow-y-auto">
                  {activePersona.data.description || 'Описание отсутствует.'}
                </div>
              </div>

              {/* Personality */}
              {activePersona.data.personality && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Personality (Характер)</label>
                  <div className="p-4 bg-arcane-950 rounded-xl border border-arcane-800 text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-48 overflow-y-auto">
                    {activePersona.data.personality}
                  </div>
                </div>
              )}

              {/* Scenario */}
              {activePersona.data.scenario && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Scenario (Сценарий)</label>
                  <div className="p-4 bg-arcane-950 rounded-xl border border-arcane-800 text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-48 overflow-y-auto">
                    {activePersona.data.scenario}
                  </div>
                </div>
              )}

              {/* Post History Instructions / Author Notes */}
              {activePersona.data.postHistoryInstructions && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Post-History Instructions (Глубинные инструкции / Author Notes)</label>
                  <div className="p-4 bg-arcane-950 rounded-xl border border-arcane-800 text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-48 overflow-y-auto">
                    {activePersona.data.postHistoryInstructions}
                  </div>
                </div>
              )}

              {/* Example Dialogue (mesExample) */}
              {activePersona.data.mesExample && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Example Dialogue (Примеры сообщений / mes_example)</label>
                  <div className="p-4 bg-arcane-950 rounded-xl border border-arcane-800 text-slate-200 leading-relaxed whitespace-pre-wrap select-text max-h-60 overflow-y-auto">
                    {activePersona.data.mesExample}
                  </div>
                </div>
              )}

              {/* First Message */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">First Message (Приветствие)</label>
                <div className="p-4 bg-arcane-950 rounded-xl border border-arcane-800 font-serif italic text-slate-200 leading-relaxed whitespace-pre-wrap select-text border-l-4 border-l-emerald-500">
                  "{activePersona.data.firstMessage}"
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setShowPersonaPromptsModal(false)}>
                Закрыть
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Rename Bot Modal (User Note 329) */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 bg-arcane-900 border border-purple-500/50 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-arcane-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-400" />
                <span>Переименовать персонажа</span>
              </h3>
              <button onClick={() => setShowRenameModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Укажите новое имя для бота. Макросы <code className="font-mono text-purple-300">{"{{char}}"}</code> во всем тексте мгновенно обновятся на это имя.
            </p>

            <input
              type="text"
              value={renameInputText}
              onChange={(e) => setRenameInputText(e.target.value)}
              placeholder="Новое имя персонажа..."
              className="w-full bg-arcane-950 border border-purple-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-bold"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowRenameModal(false)}>
                Отмена
              </Button>
              <Button size="sm" onClick={handleSaveNewBotName} icon={<Check className="w-3.5 h-3.5" />}>
                Сохранить имя
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
