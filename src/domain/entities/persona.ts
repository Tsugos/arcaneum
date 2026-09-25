/**
 * Persona & User Persona Domain Entities
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/PERSONA_SYSTEM.md
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/PERSONA_IDENTITY.md
 */

export type PersonaType =
  | 'character'
  | 'narrator'
  | 'assistant'
  | 'dungeon-master'
  | 'world'
  | 'companion'
  | 'custom';

export interface PersonaMetadata {
  creator: string;
  version: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  avatarUrl?: string;
  customFields?: Record<string, unknown>;
}

export interface PersonaData {
  name: string;
  summary: string; // Brief description
  description: string; // Full description
  personality: string;
  scenario: string;
  firstMessage: string;
  alternateGreetings: string[];
  mesExample: string;
  speechStyle?: string;
  systemPrompt?: string;
  postHistoryInstructions?: string;
}

export interface Persona {
  id: string;
  type: PersonaType;
  data: PersonaData;
  metadata: PersonaMetadata;
  lorebookIds: string[];
}

/**
 * User Persona (Персона Пользователя / Игрока)
 * Represents the user's identity, avatar, and background in roleplay sessions
 */
export interface UserPersona {
  id: string;
  name: string;
  avatarUrl?: string;
  description: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
}
