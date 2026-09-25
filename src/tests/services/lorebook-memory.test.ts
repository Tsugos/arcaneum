import { describe, it, expect } from 'vitest';
import { LorebookService } from '@/services/lorebook/lorebook-service';
import { MemoryService } from '@/services/memory/memory-service';

describe('Lorebook & Memory Engine Services', () => {
  it('should match lorebook entries based on keywords and priority', async () => {
    const service = new LorebookService();
    const lb = await service.createLorebook('Arcane World', 'World entries');

    await service.addEntry(lb.id, {
      keys: ['elven tower', 'sanctuary'],
      content: 'The Elven Tower of Arcaneum was built 3,000 years ago.',
      enabled: true,
      priority: 10,
      insertionOrder: 1,
    });

    await service.addEntry(lb.id, {
      keys: ['magic crystal'],
      content: 'Crystals channel mana.',
      enabled: true,
      priority: 5,
      insertionOrder: 2,
    });

    const matches = await service.matchActiveEntries(
      'The traveler walked towards the elven tower under the moonlight.',
      [lb.id]
    );

    expect(matches.length).toBe(1);
    expect(matches[0]?.content).toContain('Elven Tower');
  });

  it('should score and retrieve relevant memory records', async () => {
    const memService = new MemoryService();
    await memService.addMemory(
      'session_1',
      'persona_1',
      'long-term',
      'User discovered ancient spellbook in the ruined library',
      9,
      ['spells']
    );

    const relevant = await memService.retrieveRelevantMemories('ruined library', 'session_1');
    expect(relevant.length).toBeGreaterThan(0);
    expect(relevant[0]?.content).toContain('spellbook');
  });
});
