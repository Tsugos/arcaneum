import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Clock, 
  Bot, 
  ArrowRight, 
  Search,
  UserCheck,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import type { Session } from '@/domain/entities';
import { globalChatService } from '@/services/chat/chat-service';
import { globalPersonaService } from '@/services/persona/persona-service';
import { globalUserPersonaService } from '@/services/persona/user-persona-service';

export interface ChatSessionsViewProps {
  onOpenSession: (sessionId: string) => void;
  onNewSession: () => void;
}

interface ExtendedSessionItem {
  session: Session;
  characterName: string;
  characterAvatar?: string;
  characterType: string;
  userPersonaName?: string;
  messagesCount: number;
  lastMessageText?: string;
}

export const ChatSessionsView: React.FC<ChatSessionsViewProps> = ({
  onOpenSession,
  onNewSession,
}) => {
  const [items, setItems] = useState<ExtendedSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Inline Rename States (User Note 634 & 644)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionTitleInput, setSessionTitleInput] = useState('');
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [characterNameInput, setCharacterNameInput] = useState('');

  const handleStartRenameSession = (s: Session) => {
    setEditingSessionId(s.id);
    setSessionTitleInput(s.title);
  };

  const handleSaveSessionTitle = async (sessionId: string) => {
    if (!sessionTitleInput.trim()) return;
    await globalChatService.updateSessionTitle(sessionId, sessionTitleInput.trim());
    setEditingSessionId(null);
    await loadSessions();
  };

  const handleStartRenameCharacter = (characterId: string, currentName: string) => {
    setEditingCharacterId(characterId);
    setCharacterNameInput(currentName);
  };

  const handleSaveCharacterName = async (characterId: string) => {
    if (!characterNameInput.trim()) return;
    await globalPersonaService.updatePersona(characterId, {
      data: { name: characterNameInput.trim() },
    });
    setEditingCharacterId(null);
    await loadSessions();
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const sessionList = await globalChatService.getAllSessions();
      const extended: ExtendedSessionItem[] = [];

      for (const s of sessionList) {
        const persona = await globalPersonaService.getPersona(s.characterId);
        const up = s.userPersonaId ? await globalUserPersonaService.getUserPersona(s.userPersonaId) : undefined;
        const msgs = await globalChatService.getMessages(s.id);

        extended.push({
          session: s,
          characterName: persona?.data.name || 'Персонаж удалён',
          characterAvatar: persona?.metadata.avatarUrl,
          characterType: persona?.type || 'character',
          userPersonaName: up?.name,
          messagesCount: msgs.length,
          lastMessageText: msgs.length > 0 ? msgs[msgs.length - 1]?.content : persona?.data.firstMessage,
        });
      }

      setItems(extended);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleDeleteSession = async (id: string) => {
    await globalChatService.deleteSession(id);
    setDeletingId(null);
    loadSessions();
  };

  const filteredItems = items.filter(
    (item) =>
      item.session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.characterName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-arcane-accent-glow" />
            Мои чаты и сеансы ролевой игры
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Все ваши текущие сохраненные диалоги с персонализированной памятью, лорбуками и настройками генерации.
          </p>
        </div>

        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={onNewSession}>
          Новый чат
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Поиск по названию чата или имени персонажа..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-arcane-900 border border-arcane-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-arcane-accent"
        />
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400">
          Загрузка списка диалогов...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const timeAgo = new Date(item.session.updatedAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card
                key={item.session.id}
                className="group p-4 flex flex-col justify-between hover:border-arcane-700 transition-all bg-arcane-900/80 border-arcane-800 space-y-3"
              >
                <div className="space-y-3">
                  {/* Character Avatar & Title */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {item.characterAvatar ? (
                        <img src={item.characterAvatar} alt={item.characterName} className="w-11 h-11 rounded-xl object-cover border border-arcane-700 shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-arcane-800 border border-arcane-700 flex items-center justify-center font-bold text-arcane-accent-glow shrink-0">
                          {item.characterName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {/* Session Title with Inline Rename (User Note 644) */}
                        {editingSessionId === item.session.id ? (
                          <div className="flex items-center gap-1 bg-arcane-950 p-1 rounded-lg border border-cyan-500/60 shadow-md" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveSessionTitle(item.session.id);
                              }}
                              className="p-1 text-emerald-400 hover:bg-emerald-950/60 rounded"
                              title="Сохранить"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSessionId(null);
                              }}
                              className="p-1 text-rose-400 hover:bg-rose-950/60 rounded"
                              title="Отмена"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="text"
                              value={sessionTitleInput}
                              onChange={(e) => setSessionTitleInput(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleSaveSessionTitle(item.session.id);
                                if (e.key === 'Escape') setEditingSessionId(null);
                              }}
                              className="bg-transparent text-xs text-cyan-300 font-bold focus:outline-none w-full font-mono"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <h3 className="font-bold text-sm text-slate-100 truncate group-hover:text-arcane-accent-glow transition-colors">
                              {item.session.title}
                            </h3>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartRenameSession(item.session);
                              }}
                              className="p-1 text-slate-500 hover:text-cyan-300 transition-colors opacity-0 group-hover:opacity-100"
                              title="Переименовать этот чат"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Character Name with Inline Rename (User Note 634) */}
                        {editingCharacterId === item.session.characterId ? (
                          <div className="flex items-center gap-1 bg-arcane-950 p-1 rounded-lg border border-purple-500/60 shadow-md mt-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveCharacterName(item.session.characterId);
                              }}
                              className="p-1 text-emerald-400 hover:bg-emerald-950/60 rounded"
                              title="Сохранить имя персонажа"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCharacterId(null);
                              }}
                              className="p-1 text-rose-400 hover:bg-rose-950/60 rounded"
                              title="Отмена"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="text"
                              value={characterNameInput}
                              onChange={(e) => setCharacterNameInput(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleSaveCharacterName(item.session.characterId);
                                if (e.key === 'Escape') setEditingCharacterId(null);
                              }}
                              className="bg-transparent text-xs text-purple-300 font-bold focus:outline-none w-full font-mono"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1">
                              <Bot className="w-3 h-3 text-purple-400 shrink-0" /> {item.characterName} ({item.characterType})
                            </p>
                            <button
                              type="button"
                              onClick={() => handleStartRenameCharacter(item.session.characterId, item.characterName)}
                              className="p-0.5 text-slate-500 hover:text-purple-300 transition-colors opacity-0 group-hover:opacity-100"
                              title="Переименовать персонажа ИИ"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setDeletingId(item.session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                      title="Удалить сессию"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Last message preview */}
                  <p className="text-xs text-slate-300 line-clamp-2 bg-arcane-950/60 p-2.5 rounded-lg border border-arcane-800/40 italic">
                    "{item.lastMessageText || 'Диалог не начат.'}"
                  </p>

                  {/* Player Persona badge & Message stats */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-arcane-accent-glow">
                      <UserCheck className="w-3 h-3" /> {item.userPersonaName || 'User'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" /> {timeAgo} · {item.messagesCount} сообщ.
                    </span>
                  </div>
                </div>

                {/* Continue button */}
                <div className="pt-3 border-t border-arcane-800/60">
                  <Button
                    size="sm"
                    className="w-full text-xs py-2"
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    onClick={() => onOpenSession(item.session.id)}
                  >
                    Продолжить диалог
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <Card className="p-8 text-center text-slate-400 text-xs space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-500 mx-auto" />
          <p>У вас пока нет активных диалогов.</p>
          <Button size="sm" onClick={onNewSession} className="mt-2">
            Создать первый диалог
          </Button>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 bg-arcane-900 border-red-500/30 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Удалить чат?</h3>
            <p className="text-xs text-slate-400">
              История сообщений этой сессии будет навсегда удалена.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>
                Отмена
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDeleteSession(deletingId)}>
                Удалить
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
