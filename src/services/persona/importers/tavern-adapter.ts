/**
 * Tavern / Character Card V2 Import & Export Adapter
 * Supports JSON specifications and PNG/JPG/WEBP image card processing.
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/IMPORT_EXPORT_SYSTEM.md
 */

import type { Persona } from '@/domain/entities';

export interface TavernCardV2Spec {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: {
    name: string;
    description?: string;
    personality?: string;
    scenario?: string;
    first_mes?: string;
    alternate_greetings?: string[];
    mes_example?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    creator?: string;
    character_version?: string;
    tags?: string[];
    avatar_url?: string;
  };
}

export class TavernAdapter {
  /**
   * Import persona from V2 JSON string or raw text payload
   */
  public static importFromV2Json(jsonString: string, defaultAvatarUrl?: string): Persona {
    const raw = JSON.parse(jsonString);
    const cardData = raw.data || raw;

    const personaId = `persona_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    return {
      id: personaId,
      type: 'character',
      data: {
        name: cardData.name || 'Unnamed Character',
        summary: (cardData.description || '').slice(0, 120),
        description: cardData.description || '',
        personality: cardData.personality || '',
        scenario: cardData.scenario || '',
        firstMessage: cardData.first_mes || cardData.firstMessage || 'Greetings.',
        alternateGreetings: Array.isArray(cardData.alternate_greetings) ? cardData.alternate_greetings : [],
        mesExample: cardData.mes_example || '',
        systemPrompt: cardData.system_prompt || '',
        postHistoryInstructions: cardData.post_history_instructions || '',
      },
      metadata: {
        creator: cardData.creator || 'Imported User',
        version: 1,
        tags: Array.isArray(cardData.tags) ? cardData.tags : ['imported', 'chara_v2'],
        avatarUrl: cardData.avatar_url || defaultAvatarUrl || '',
        createdAt: now,
        updatedAt: now,
      },
      lorebookIds: [],
    };
  }

  /**
   * Parse uploaded File (.json or .png/.jpg/.jpeg/.webp image card)
   */
  public static async parseUploadedFile(file: File): Promise<Persona> {
    const fileName = file.name.toLowerCase();

    // 1. Plain JSON File
    if (fileName.endsWith('.json')) {
      const text = await file.text();
      return this.importFromV2Json(text);
    }

    // 2. Image File (.jpg, .jpeg, .png, .webp)
    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(fileName)) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Attempt to extract embedded PNG metadata (SillyTavern V2 spec)
      try {
        const arrayBuffer = await file.arrayBuffer();
        const { parsePngMetadata } = await import('./chub-importer-service');
        const parsedMetadata = parsePngMetadata(arrayBuffer);
        if (parsedMetadata) {
          const persona = this.importFromV2Json(JSON.stringify(parsedMetadata), dataUrl);
          persona.metadata.avatarUrl = dataUrl;
          return persona;
        }
      } catch {
        // Fallthrough to pure image
      }

      // If pure image file without text metadata: Create character with image attached as avatar
      const personaName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const personaId = `persona_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();

      return {
        id: personaId,
        type: 'character',
        data: {
          name: personaName,
          summary: `Персонаж, импортированный из карточки-изображения ${file.name}`,
          description: `Персонаж создан на основе файла изображения ${file.name}.`,
          personality: 'Определите личность и характер персонажа в редакторе.',
          scenario: '',
          firstMessage: 'Приветствую! Рад(а) знакомству.',
          alternateGreetings: [],
          mesExample: '',
        },
        metadata: {
          creator: 'Imported Image Card',
          version: 1,
          tags: ['imported', 'image_card'],
          avatarUrl: dataUrl,
          createdAt: now,
          updatedAt: now,
        },
        lorebookIds: [],
      };
    }

    throw new Error('Неподдерживаемый тип файла. Выберите .json, .png, .jpg, .jpeg или .webp');
  }

  public static exportToV2Json(persona: Persona): string {
    const spec: TavernCardV2Spec = {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: persona.data.name,
        description: persona.data.description,
        personality: persona.data.personality,
        scenario: persona.data.scenario,
        first_mes: persona.data.firstMessage,
        alternate_greetings: persona.data.alternateGreetings,
        mes_example: persona.data.mesExample,
        system_prompt: persona.data.systemPrompt,
        post_history_instructions: persona.data.postHistoryInstructions,
        creator: persona.metadata.creator,
        character_version: `v${persona.metadata.version}`,
        tags: persona.metadata.tags,
        avatar_url: persona.metadata.avatarUrl,
      },
    };

    return JSON.stringify(spec, null, 2);
  }
}
