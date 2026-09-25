/**
 * Lorebook Engine Service
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/LOREBOOK_ENGINE.md
 */

import type { Lorebook, LorebookEntry } from '@/domain/entities';
import { db } from '@/infrastructure/storage/db';
import { globalServiceRegistry } from '@/core/service-registry';

export class LorebookService {
  public async createLorebook(name: string, description?: string): Promise<Lorebook> {
    const id = `lorebook_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const newLorebook: Lorebook = {
      id,
      name,
      description,
      entries: [],
      createdAt: now,
      updatedAt: now,
    };
    await db.lorebooks.add(newLorebook);
    return newLorebook;
  }

  public async getLorebook(id: string): Promise<Lorebook | undefined> {
    return db.lorebooks.get(id);
  }

  public async getAllLorebooks(): Promise<Lorebook[]> {
    return db.lorebooks.toArray();
  }

  public async updateLorebook(id: string, name: string, description?: string): Promise<Lorebook> {
    const lb = await this.getLorebook(id);
    if (!lb) throw new Error(`Lorebook with id '${id}' not found.`);
    lb.name = name;
    lb.description = description;
    lb.updatedAt = Date.now();
    await db.lorebooks.put(lb);
    return lb;
  }

  public async deleteLorebook(id: string): Promise<void> {
    await db.lorebooks.delete(id);
  }

  public async addEntry(
    lorebookId: string,
    entry: Omit<LorebookEntry, 'id' | 'lorebookId'>
  ): Promise<Lorebook> {
    const lb = await this.getLorebook(lorebookId);
    if (!lb) throw new Error(`Lorebook with id '${lorebookId}' not found.`);

    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: LorebookEntry = {
      ...entry,
      id: entryId,
      lorebookId,
    };

    lb.entries.push(newEntry);
    lb.updatedAt = Date.now();
    await db.lorebooks.put(lb);
    return lb;
  }

  public async updateEntry(
    lorebookId: string,
    entryId: string,
    updates: Partial<Omit<LorebookEntry, 'id' | 'lorebookId'>>
  ): Promise<Lorebook> {
    const lb = await this.getLorebook(lorebookId);
    if (!lb) throw new Error(`Lorebook with id '${lorebookId}' not found.`);

    const index = lb.entries.findIndex((e) => e.id === entryId);
    if (index === -1) throw new Error(`Entry with id '${entryId}' not found.`);

    lb.entries[index] = {
      ...lb.entries[index]!,
      ...updates,
    };
    lb.updatedAt = Date.now();
    await db.lorebooks.put(lb);
    return lb;
  }

  public async deleteEntry(lorebookId: string, entryId: string): Promise<Lorebook> {
    const lb = await this.getLorebook(lorebookId);
    if (!lb) throw new Error(`Lorebook with id '${lorebookId}' not found.`);

    lb.entries = lb.entries.filter((e) => e.id !== entryId);
    lb.updatedAt = Date.now();
    await db.lorebooks.put(lb);
    return lb;
  }

  /**
   * Scans text (or multiple text variants, e.g. raw + translated) for matching keys across specified active lorebooks
   */
  public async matchActiveEntries(
    text: string | string[],
    lorebookIds: string[]
  ): Promise<LorebookEntry[]> {
    const textList = Array.isArray(text) ? text : [text];
    const validTexts = textList.filter((t) => t && t.trim().length > 0);
    if (validTexts.length === 0 || lorebookIds.length === 0) return [];

    const activeEntries: LorebookEntry[] = [];
    const lowerTexts = validTexts.map((t) => t.toLowerCase());

    for (const lbId of lorebookIds) {
      const lb = await this.getLorebook(lbId);
      if (!lb) continue;

      for (const entry of lb.entries) {
        if (!entry.enabled) continue;

        // Constant entries are always active
        if (entry.constant) {
          activeEntries.push(entry);
          continue;
        }

        // Keyword matching against ANY text variant
        const primaryMatched = entry.keys.some((key) => {
          const k = key.toLowerCase().trim();
          return k.length > 0 && lowerTexts.some((lt) => lt.includes(k));
        });

        if (primaryMatched) {
          // If selective is enabled, secondary keys must also match
          if (entry.selective && entry.secondaryKeys && entry.secondaryKeys.length > 0) {
            const secondaryMatched = entry.secondaryKeys.some((sKey) => {
              const sk = sKey.toLowerCase().trim();
              return sk.length > 0 && lowerTexts.some((lt) => lt.includes(sk));
            });
            if (secondaryMatched) {
              activeEntries.push(entry);
            }
          } else {
            activeEntries.push(entry);
          }
        }
      }
    }

    // Sort by priority (descending) and insertion order (ascending)
    return activeEntries.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.insertionOrder - b.insertionOrder;
    });
  }
}

export const globalLorebookService = new LorebookService();
globalServiceRegistry.register('LorebookService', globalLorebookService);
