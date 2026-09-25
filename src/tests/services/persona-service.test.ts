import { describe, it, expect } from 'vitest';
import { TavernAdapter } from '@/services/persona/importers/tavern-adapter';
import type { Persona } from '@/domain/entities';

describe('Tavern Adapter & Persona Serialization', () => {
  it('should import Character Card V2 JSON correctly into canonical Arcaneum Persona', () => {
    const cardV2Json = JSON.stringify({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: 'Seraphina',
        description: 'An ancient elven mage living in the Arcane Tower.',
        personality: 'Wise, reserved, mysterious',
        first_mes: 'Greetings traveler, what brings you to my sanctuary?',
        creator: 'Arcaneum Studio',
        tags: ['elf', 'magic', 'rp'],
      },
    });

    const persona = TavernAdapter.importFromV2Json(cardV2Json);

    expect(persona.data.name).toBe('Seraphina');
    expect(persona.type).toBe('character');
    expect(persona.data.personality).toBe('Wise, reserved, mysterious');
    expect(persona.metadata.tags).toContain('elf');
  });

  it('should export canonical Persona into valid Character Card V2 JSON', () => {
    const persona: Persona = {
      id: 'persona_123',
      type: 'character',
      data: {
        name: 'Kaelen',
        summary: 'A brave knight',
        description: 'Commander of the Sun Guard.',
        personality: 'Loyal, brave, honorable',
        scenario: 'Guarding the city gates',
        firstMessage: 'Halt! Who goes there?',
        alternateGreetings: ['Welcome to the citadel.'],
        mesExample: '<START>\nUser: Hi\nKaelen: Greetings.',
      },
      metadata: {
        creator: 'User',
        version: 1,
        tags: ['knight'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      lorebookIds: [],
    };

    const exportedJson = TavernAdapter.exportToV2Json(persona);
    const parsed = JSON.parse(exportedJson);

    expect(parsed.spec).toBe('chara_card_v2');
    expect(parsed.data.name).toBe('Kaelen');
    expect(parsed.data.first_mes).toBe('Halt! Who goes there?');
  });
});
