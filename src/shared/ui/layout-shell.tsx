import React, { useState, useEffect } from 'react';
import { 
  Home,
  Bot, 
  UserCheck,
  MessageSquare, 
  BookOpen, 
  Cpu, 
  Settings, 
  Plus,
  Search,
  Bell
} from 'lucide-react';
import { Button } from './button';

import { HubView } from '@/features/hub/hub-view';
import { UserProfileMenu } from '@/features/hub/user-profile-menu';
import { ProviderSelector } from '@/features/models/provider-selector';
import { PersonaCatalog } from '@/features/character-editor/persona-catalog';
import { UserPersonasView } from '@/features/character-editor/user-personas-view';
import { LorebookManager } from '@/features/lorebook/lorebook-manager';
import { ChatView } from '@/features/chat/chat-view';
import { ChatSessionsView } from '@/features/chat/chat-sessions-view';
import { SettingsView } from '@/features/settings/settings-view';
import { globalAIProviderService } from '@/services/ai/provider-service';
import { globalUserPersonaService } from '@/services/persona/user-persona-service';
import type { UserPersona } from '@/domain/entities';
import { useUiLanguage } from '@/shared/i18n/ui-language';

export interface LayoutShellProps {
  children?: React.ReactNode;
}

export type ViewTab = 
  | 'hub' 
  | 'chat-list' 
  | 'chat' 
  | 'characters' 
  | 'user-personas' 
  | 'lorebook' 
  | 'models' 
  | 'settings';

export const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const { language, setLanguage, t } = useUiLanguage();
  const [activeTab, setActiveTab] = useState<ViewTab>('hub');
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeUserPersona, setActiveUserPersona] = useState<UserPersona | null>(null);

  const [hordeOnline, setHordeOnline] = useState<boolean | null>(null);
  const [hordeChecking, setHordeChecking] = useState(true);
  const [activeModelName, setActiveModelName] = useState('');

  // Check AI Horde connection on mount + every 60s
  useEffect(() => {
    const check = async () => {
      setHordeChecking(true);
      try {
        const status = await globalAIProviderService.checkConnection();
        setHordeOnline(status.online);
      } catch {
        setHordeOnline(false);
      } finally {
        setHordeChecking(false);
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load User Persona
  useEffect(() => {
    globalUserPersonaService.getDefaultUserPersona().then((up) => {
      if (up) setActiveUserPersona(up);
    });
  }, [activeTab]);

  // Update active model name when tab changes
  useEffect(() => {
    const modelId = globalAIProviderService.getActiveModel();
    if (modelId) {
      const parts = modelId.split('/');
      setActiveModelName(parts[parts.length - 1] || modelId);
    } else {
      setActiveModelName('Не выбрана');
    }
  }, [activeTab]);

  const quickNavItems = [
    { id: 'hub', label: t('hub'), icon: Home },
    { id: 'chat-list', label: t('chats'), icon: MessageSquare },
    { id: 'characters', label: t('aiCharacters'), icon: Bot },
    { id: 'user-personas', label: t('userPersonas'), icon: UserCheck },
    { id: 'lorebook', label: t('lorebooks'), icon: BookOpen },
    { id: 'models', label: t('providers'), icon: Cpu },
    { id: 'settings', label: t('settings'), icon: Settings },
  ];

  const handleStartChatWithPersona = (sessionId?: string) => {
    setSelectedSessionId(sessionId);
    setActiveTab('chat');
  };

  // FULL-SCREEN DISTRACTION-FREE CHAT MODE:
  // When inside an active chat (activeTab === 'chat'), HIDE top global header bar,
  // HIDE left quick-bar sidebar completely! ChatView takes 100% screen space.
  if (activeTab === 'chat') {
    return (
      <div className="w-screen h-screen overflow-hidden bg-arcane-950 text-slate-100 font-sans">
        <ChatView
          initialSessionId={selectedSessionId}
          onBackToHub={() => setActiveTab('hub')}
        />
      </div>
    );
  }

  const renderContent = () => {
    if (children) return children;
    if (activeTab === 'hub') {
      return (
        <HubView
          onStartChatWithPersona={(_personaId, sessionId) => handleStartChatWithPersona(sessionId)}
          onNavigateToCreate={() => setActiveTab('characters')}
        />
      );
    }
    if (activeTab === 'chat-list') {
      return (
        <ChatSessionsView
          onOpenSession={(sId) => {
            setSelectedSessionId(sId);
            setActiveTab('chat');
          }}
          onNewSession={() => {
            setSelectedSessionId(undefined);
            setActiveTab('chat');
          }}
        />
      );
    }
    if (activeTab === 'models') return <ProviderSelector />;
    if (activeTab === 'characters') return <PersonaCatalog />;
    if (activeTab === 'user-personas') return <UserPersonasView />;
    if (activeTab === 'lorebook') return <LorebookManager />;
    if (activeTab === 'settings') return <SettingsView />;
    
    return null;
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-arcane-950 text-slate-100 font-sans">
      {/* Top Global Header (Janitor AI Layout) */}
      <header className="h-14 border-b border-arcane-800/80 bg-arcane-900/90 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 select-none z-30">
        {/* Left Brand + Quick Links */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('hub')}
            className="flex items-center gap-2.5 group text-left focus:outline-none"
          >
            {/* Archon Techno-Magic Energy Entity Logo Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-cyan-400 to-purple-700 p-0.5 shadow-lg shadow-cyan-500/40 group-hover:scale-105 transition-transform overflow-hidden relative shrink-0">
              <img
                src="/arcaneum_logo_icon.jpg"
                alt="Arcaneum Archon Techno-Magic Energy Entity"
                className="w-full h-full object-cover rounded-[9px] shadow-inner"
              />
              <div className="absolute inset-0 ring-1 ring-cyan-400/50 rounded-[9px] pointer-events-none" />
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-none bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent tracking-tight">
                Arcaneum
              </h1>
              <span className="text-[9px] tracking-wider uppercase font-semibold text-cyan-400/90">
                Autonomous AI Platform
              </span>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-4 text-xs text-slate-400 font-medium">
            <button onClick={() => setActiveTab('hub')} className={`hover:text-slate-200 transition-colors ${activeTab === 'hub' ? 'text-arcane-accent-glow font-semibold' : ''}`}>
              {t('catalog')}
            </button>
            <button onClick={() => setActiveTab('chat-list')} className={`hover:text-slate-200 transition-colors ${activeTab === 'chat-list' ? 'text-arcane-accent-glow font-semibold' : ''}`}>
              {t('chats')}
            </button>
            <button onClick={() => setActiveTab('models')} className={`hover:text-slate-200 transition-colors ${activeTab === 'models' ? 'text-arcane-accent-glow font-semibold' : ''}`}>
              {t('models')}
            </button>
          </nav>
        </div>

        {/* Global Header Search Bar */}
        <div className="hidden sm:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder={t('search')}
              onClick={() => setActiveTab('hub')}
              className="w-full bg-arcane-950 border border-arcane-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-arcane-accent"
            />
          </div>
        </div>

        {/* Right Action Bar + User Profile Avatar Dropdown (Image 3-4) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
            className="px-2.5 py-1.5 rounded-lg border border-arcane-700 bg-arcane-950 text-[11px] font-bold text-cyan-300 hover:border-cyan-500"
            title="Interface language"
          >
            {language === 'ru' ? 'EN' : 'RU'}
          </button>
          <Button
            size="sm"
            className="text-xs py-1.5"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setActiveTab('characters')}
          >
            {t('createCharacter')}
          </Button>

          <button className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors relative" title={t('notifications')}>
            <Bell className="w-4 h-4" />
          </button>

          {/* User Profile Avatar */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-arcane-800/60 transition-colors focus:outline-none"
            >
              {activeUserPersona?.avatarUrl ? (
                <img src={activeUserPersona.avatarUrl} alt={activeUserPersona.name} className="w-7 h-7 rounded-lg object-cover border border-arcane-700" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-arcane-accent to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
                  {activeUserPersona ? activeUserPersona.name.charAt(0) : 'U'}
                </div>
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <UserProfileMenu
                onNavigate={(tab) => {
                  if (tab === 'hub') setActiveTab('hub');
                  else if (tab === 'chat') setActiveTab('chat-list');
                  else setActiveTab(tab as any);
                }}
                onOpenUserPersonas={() => setActiveTab('user-personas')}
                onClose={() => setShowProfileMenu(false)}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Body: Left Vertical Quick-Bar + Content Viewport */}
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        {/* Left Vertical Quick-Bar (Линейка быстрого доступа) */}
        <aside className="w-14 border-r border-arcane-800/60 bg-arcane-900/80 backdrop-blur-xl flex flex-col justify-between items-center py-3 select-none shrink-0 z-20">
          {/* Top Tool Icons */}
          <div className="flex flex-col items-center gap-2">
            {quickNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 relative group ${
                    isActive
                      ? 'bg-arcane-accent text-white shadow-lg shadow-arcane-accent/30 scale-105'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-arcane-800/60'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4" />
                  {/* Tooltip on hover */}
                  <span className="absolute left-12 bg-arcane-900 text-slate-200 border border-arcane-700 text-[10px] font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Connection Badge */}
          <div className="flex flex-col items-center gap-1 text-[9px] font-mono text-slate-400">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hordeChecking ? 'bg-amber-400 animate-pulse' : hordeOnline ? 'bg-emerald-400' : 'bg-red-400'
              }`}
              title={`AI Horde: ${hordeOnline ? 'ONLINE' : 'OFFLINE'} (${activeModelName})`}
            />
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-arcane-950 via-arcane-900 to-arcane-950 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
