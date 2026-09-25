/**
 * Lorebook Engine Domain Entity
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/LOREBOOK_ENGINE.md
 */

export interface LorebookEntry {
  id: string;
  lorebookId: string;
  keys: string[];
  secondaryKeys?: string[];
  content: string;
  comment?: string;
  enabled: boolean;
  priority: number;
  insertionOrder: number;
  constant?: boolean;
  selective?: boolean;
}

export interface Lorebook {
  id: string;
  name: string;
  description?: string;
  entries: LorebookEntry[];
  createdAt: number;
  updatedAt: number;
}
