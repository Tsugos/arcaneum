import React, { createContext, useContext, useMemo, useState } from 'react';

export type UiLanguage = 'ru' | 'en';

const STORAGE_KEY = 'arcaneum_ui_language';

const messages = {
  ru: {
    catalog: 'Каталог', chats: 'Мои чаты', models: 'API Модели', createCharacter: 'Создать персонажа',
    search: 'Искать персонажей или создателей…', hub: 'Главный Хаб', aiCharacters: 'ИИ Персонажи',
    userPersonas: 'Персоны Игрока', lorebooks: 'Лорбуки', providers: 'AI Providers', settings: 'Настройки', notifications: 'Уведомления',
  },
  en: {
    catalog: 'Catalog', chats: 'My Chats', models: 'API Models', createCharacter: 'Create Character',
    search: 'Search characters or creators…', hub: 'Main Hub', aiCharacters: 'AI Characters',
    userPersonas: 'Player Personas', lorebooks: 'Lorebooks', providers: 'AI Providers', settings: 'Settings', notifications: 'Notifications',
  },
} as const;

type MessageKey = keyof typeof messages.ru;
type UiLanguageContextValue = { language: UiLanguage; setLanguage: (language: UiLanguage) => void; t: (key: MessageKey) => string };

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null);

export const UiLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<UiLanguage>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ru'; } catch { return 'ru'; }
  });
  const value = useMemo<UiLanguageContextValue>(() => ({
    language,
    setLanguage: (next) => {
      setLanguageState(next);
      document.documentElement.lang = next;
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* The visible selection still works for this session. */ }
    },
    t: (key) => messages[language][key],
  }), [language]);
  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>;
};

export const useUiLanguage = () => {
  const context = useContext(UiLanguageContext);
  if (!context) throw new Error('useUiLanguage must be used inside UiLanguageProvider');
  return context;
};
