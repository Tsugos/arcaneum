/**
 * Memory Engine Service
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/MEMORY_ENGINE.md
 */

import type { MemoryRecord, MemoryType } from '@/domain/entities';
import { db } from '@/infrastructure/storage/db';
import { globalServiceRegistry } from '@/core/service-registry';

export class MemoryService {
  public async addMemory(
    sessionId: string,
    characterId: string,
    type: MemoryType,
    content: string,
    importance: number = 5,
    tags: string[] = []
  ): Promise<MemoryRecord> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: MemoryRecord = {
      id,
      sessionId,
      characterId,
      type,
      content,
      importance,
      tags,
      createdAt: Date.now(),
    };
    await db.memories.add(record);
    return record;
  }

  public async getMemoriesForSession(
    sessionId: string,
    type?: MemoryType
  ): Promise<MemoryRecord[]> {
    if (type) {
      return db.memories
        .where('sessionId')
        .equals(sessionId)
        .filter((m) => m.type === type)
        .toArray();
    }
    return db.memories.where('sessionId').equals(sessionId).toArray();
  }

  /**
   * Retrieves relevant memories based on text keywords (supporting raw & translated variants) & importance rating
   */
  public async retrieveRelevantMemories(
    text: string | string[],
    sessionId: string,
    limit: number = 5
  ): Promise<MemoryRecord[]> {
    const memories = await this.getMemoriesForSession(sessionId);
    if (memories.length === 0) return [];

    const textList = Array.isArray(text) ? text : [text];
    const lowerTexts = textList.filter((t) => t && t.trim().length > 0).map((t) => t.toLowerCase());
    if (lowerTexts.length === 0) return memories.slice(0, limit);

    // Simple keyword & importance scoring algorithm across text variants
    const scored = memories.map((m) => {
      let score = m.importance;
      const lowerContent = m.content.toLowerCase();

      // Bonus score if memory words appear in any search text variant
      const words = lowerContent.split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && lowerTexts.some((lt) => lt.includes(w))) {
          score += 2;
        }
      }
      return { memory: m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.memory);
  }

  public async deleteMemory(id: string): Promise<void> {
    await db.memories.delete(id);
  }
}

export const globalMemoryService = new MemoryService();
globalServiceRegistry.register('MemoryService', globalMemoryService);
