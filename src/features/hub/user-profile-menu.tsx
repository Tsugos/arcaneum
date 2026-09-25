import React, { useState, useEffect } from 'react';
import { 
  User, 
  Bot, 
  UserCheck, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  Cpu, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import type { UserPersona } from '@/domain/entities';
import { globalUserPersonaService } from '@/services/persona/user-persona-service';

export interface UserProfileMenuProps {
  onNavigate: (tab: 'chat' | 'characters' | 'lorebook' | 'models' | 'settings' | 'hub') => void;
  onOpenUserPersonas: () => void;
  onClose: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  onNavigate,
  onOpenUserPersonas,
  onClose,
}) => {
  const [activeUserPersona, setActiveUserPersona] = useState<UserPersona | null>(null);

  useEffect(() => {
    globalUserPersonaService.getDefaultUserPersona().then((up) => {
      if (up) setActiveUserPersona(up);
    });
  }, []);

  return (
    <div className="absolute right-0 top-12 z-50 w-64 bg-arcane-900 border border-arcane-700/80 rounded-2xl shadow-2xl p-2 space-y-1 text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
      {/* Header Profile Badge */}
      <div className="p-3 bg-arcane-950/80 rounded-xl border border-arcane-800 flex items-center gap-3 mb-1">
        {activeUserPersona?.avatarUrl ? (
          <img src={activeUserPersona.avatarUrl} alt={activeUserPersona.name} className="w-9 h-9 rounded-lg object-cover border border-arcane-700" />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-arcane-accent to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
            {activeUserPersona ? activeUserPersona.name.charAt(0) : 'U'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-100 truncate">
            {activeUserPersona ? activeUserPersona.name : 'Пользователь'}
          </div>
          <div className="text-[10px] text-arcane-accent-glow font-mono flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Arcaneum OS User
          </div>
        </div>
      </div>

      {/* Menu Options (Matching Janitor UI Dropdown) */}
      <button
        onClick={() => {
          onOpenUserPersonas();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <User className="w-4 h-4 text-arcane-accent-glow" />
          Профиль
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
      </button>

      <button
        onClick={() => {
          onNavigate('characters');
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <Bot className="w-4 h-4 text-purple-400" />
          Мои персонажи
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
      </button>

      <button
        onClick={() => {
          onOpenUserPersonas();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          Мои персоны (Игрок)
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
      </button>

      <button
        onClick={() => {
          onNavigate('chat');
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          Мои чаты
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
      </button>

      <button
        onClick={() => {
          onNavigate('lorebook');
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-arcane-gold" />
          Лорбуки
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
      </button>

      <div className="border-t border-arcane-800/80 my-1" />

      <button
        onClick={() => {
          onNavigate('models');
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <Cpu className="w-4 h-4 text-indigo-400" />
          Настройки API & Моделей
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
      </button>

      <button
        onClick={() => {
          onNavigate('settings');
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-200 hover:bg-arcane-800 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <Settings className="w-4 h-4 text-slate-400" />
          Настройки темы & бэкап
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
      </button>
    </div>
  );
};
