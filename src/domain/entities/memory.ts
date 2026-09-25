/**
 * Memory Engine Domain Entities
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/MEMORY_ENGINE.md
 */

export type MemoryType = 'short-term' | 'long-term' | 'summary' | 'fact';

export interface MemoryRecord {
  id: string;
  sessionId: string;
  characterId: string;
  type: MemoryType;
  content: string;
  importance: number; // 0 to 10
  vectorEmbedding?: number[];
  tags: string[];
  createdAt: number;
  lastRetrievedAt?: number;
}
