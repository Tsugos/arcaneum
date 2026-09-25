/**
 * Arcaneum Dexie IndexedDB Infrastructure
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/STORAGE_ARCHITECTURE.md
 */

import Dexie, { type EntityTable } from 'dexie';
import type { 
  Character, 
  Persona,
  UserPersona,
  Session, 
  ChatMessage, 
  Lorebook, 
  MemoryRecord, 
  AIProviderConfig,
  TranslationCacheEntry
} from '@/domain/entities';

export class ArcaneumDatabase extends Dexie {
  characters!: EntityTable<Character, 'id'>;
  personas!: EntityTable<Persona, 'id'>;
  userPersonas!: EntityTable<UserPersona, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  messages!: EntityTable<ChatMessage, 'id'>;
  lorebooks!: EntityTable<Lorebook, 'id'>;
  memories!: EntityTable<MemoryRecord, 'id'>;
  providers!: EntityTable<AIProviderConfig, 'id'>;
  translationCache!: EntityTable<TranslationCacheEntry, 'hash'>;

  constructor() {
    super('ArcaneumDB');

    this.version(3).stores({
      characters: 'id, name, metadata.createdAt, metadata.updatedAt',
      personas: 'id, type, data.name, metadata.createdAt, metadata.updatedAt',
      userPersonas: 'id, name, isDefault, createdAt, updatedAt',
      sessions: 'id, characterId, userPersonaId, createdAt, updatedAt',
      messages: 'id, sessionId, role, timestamp',
      lorebooks: 'id, name, createdAt, updatedAt',
      memories: 'id, sessionId, characterId, type, importance, createdAt',
      providers: 'id, type, enabled',
    });

    this.version(4).stores({
      characters: 'id, name, metadata.createdAt, metadata.updatedAt',
      personas: 'id, type, data.name, metadata.createdAt, metadata.updatedAt',
      userPersonas: 'id, name, isDefault, createdAt, updatedAt',
      sessions: 'id, characterId, userPersonaId, createdAt, updatedAt',
      messages: 'id, sessionId, role, timestamp',
      lorebooks: 'id, name, createdAt, updatedAt',
      memories: 'id, sessionId, characterId, type, importance, createdAt',
      providers: 'id, type, enabled',
      translationCache: 'hash, sourceLang, targetLang, updatedAt',
    });
  }
}

export const db = new ArcaneumDatabase();
