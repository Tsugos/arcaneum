/**
 * Session & Chat Message Domain Entities
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/SESSION_SYSTEM.md
 */

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  name?: string;
  timestamp: number;
  tokensCount?: number;
  swipes?: string[];
  currentSwipeIndex?: number;
  metadata?: Record<string, unknown>;
  // Translation fields
  textOriginal?: string;
  sourceLang?: string;
  isTranslated?: boolean;
  translationError?: boolean;
}

export interface SessionGenerationSettings {
  modelId?: string;
  providerId?: string;
  temperature?: number;
  maxTokens?: number;
  repetitionPenalty?: number;
  topP?: number;
  topK?: number;
  typicalP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  contextLimit?: number;
  responseLengthPreset?: 'standard' | 'short' | 'long';
}

export interface SessionThemeSettings {
  bgWallpaperUrl?: string;
  bubbleTheme?: 'purple' | 'cyan' | 'crimson' | 'emerald' | 'oled';
  fontFamily?: 'sans' | 'serif' | 'mono';
}

export interface SessionTranslationSettings {
  enabled?: boolean;
  userLanguage?: string; // e.g. 'ru'
  modelLanguage?: string; // e.g. 'en'
  showOriginalUnderTranslation?: boolean;
}

export interface Session {
  id: string;
  title: string;
  characterId: string;
  userPersonaId?: string;
  createdAt: number;
  updatedAt: number;
  generationSettings?: SessionGenerationSettings;
  systemPromptOverride?: string;
  summary?: string;
  summaryUpdatedThrough?: number;
  bannedWords?: string[];
  lorebookIds: string[];
  themeSettings?: SessionThemeSettings;
  translationSettings?: SessionTranslationSettings;
}
