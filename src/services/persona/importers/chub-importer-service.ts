/**
 * Real Chub AI Uncensored API Integration Service
 * Live search, tag filtering, pagination, card detail inspection, and 1-click importing from Chub AI
 * @see https://api.chub.ai
 */

import type { Persona } from '@/domain/entities';
import { globalPersonaService } from '@/services/persona/persona-service';
import { globalChatService } from '@/services/chat/chat-service';

export interface ChubCharacterCard {
  id: string;
  fullPath: string;
  name: string;
  creator: string;
  tagline: string;
  /** Public Chub project-page copy; never used as character prompt data. */
  publicDescription?: string;
  description: string;
  personality?: string;
  scenario?: string;
  firstMessage?: string;
  alternateGreetings?: string[];
  mesExample?: string;
  postHistoryInstructions?: string;
  systemPrompt?: string;
  creatorNotes?: string;
  characterVersion?: string;
  definitionLoaded?: boolean;
  rawDefinition?: Record<string, unknown>;
  avatarUrl: string;
  maxResUrl?: string;
  tags: string[];
  chatsCount: number;
  rating?: number;
  downloadCount?: number;
  starCount?: number;
  createdAt?: string;
  isNsfw?: boolean;
  lorebookEntriesCount?: number;
  rawCharacterBook?: any;
}

export interface ChubSearchResult {
  cards: ChubCharacterCard[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export const POPULAR_CHUB_TAGS = [
  'All',
  'Fantasy',
  'RPG',
  'Anime',
  'Sci-Fi',
  'Romance',
  'Cyberpunk',
  'Dungeon Master',
  'Assistant',
  'Historical',
  'Supernatural',
  'Mystery',
  'Horror',
  'Original Character',
  'Monster Girl',
  'Modern',
];

/**
 * /**
 * Binary PNG chunk byte parser for decoding embedded chara_card_v2 metadata safely
 */
export function parsePngMetadata(arrayBuffer: ArrayBuffer): any {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length < 8) return null;
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) return null;

    let offset = 8;
    const view = new DataView(arrayBuffer);

    while (offset < bytes.length - 8) {
      const length = view.getUint32(offset, false);
      const b4 = bytes[offset + 4] ?? 0;
      const b5 = bytes[offset + 5] ?? 0;
      const b6 = bytes[offset + 6] ?? 0;
      const b7 = bytes[offset + 7] ?? 0;
      const type = String.fromCharCode(b4, b5, b6, b7);

      if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
        const chunkData = bytes.subarray(offset + 8, offset + 8 + length);
        
        let nullIdx = -1;
        for (let i = 0; i < chunkData.length; i++) {
          if (chunkData[i] === 0) {
            nullIdx = i;
            break;
          }
        }

        let strData = '';
        if (nullIdx !== -1) {
          const textBytes = chunkData.subarray(type === 'zTXt' ? nullIdx + 2 : nullIdx + 1);
          try {
            strData = new TextDecoder('utf-8').decode(textBytes);
          } catch {
            let s = '';
            const chunkSize = 8192;
            for (let b = 0; b < textBytes.length; b += chunkSize) {
              s += String.fromCharCode.apply(null, Array.from(textBytes.subarray(b, b + chunkSize)));
            }
            strData = s;
          }
        } else {
          try {
            strData = new TextDecoder('utf-8').decode(chunkData);
          } catch {
            let s = '';
            const chunkSize = 8192;
            for (let b = 0; b < chunkData.length; b += chunkSize) {
              s += String.fromCharCode.apply(null, Array.from(chunkData.subarray(b, b + chunkSize)));
            }
            strData = s;
          }
        }

        // Search for base64 payload 'eyJ'
        const eyjIdx = strData.indexOf('eyJ');
        if (eyjIdx !== -1) {
          let b64Str = strData.slice(eyjIdx).trim();
          const match = b64Str.match(/^[A-Za-z0-9+/=]+/);
          if (match) b64Str = match[0];

          try {
            const jsonStr = decodeURIComponent(escape(atob(b64Str)));
            const parsed = JSON.parse(jsonStr);
            if (parsed && (parsed.data || parsed.description || parsed.name)) {
              return parsed.data || parsed;
            }
          } catch {
            try {
              const jsonStr = atob(b64Str);
              const parsed = JSON.parse(jsonStr);
              if (parsed && (parsed.data || parsed.description || parsed.name)) {
                return parsed.data || parsed;
              }
            } catch {}
          }
        }

        // Direct JSON string check
        const jsonStart = strData.indexOf('{"');
        if (jsonStart !== -1) {
          try {
            const jsonEnd = strData.lastIndexOf('}');
            if (jsonEnd > jsonStart) {
              const parsed = JSON.parse(strData.slice(jsonStart, jsonEnd + 1));
              if (parsed && (parsed.data || parsed.description || parsed.name)) {
                return parsed.data || parsed;
              }
            }
          } catch {}
        }
      }

      if (type === 'IEND') break;
      offset += 12 + length;
    }
  } catch (e) {
    // Ignore malformed binary
  }
  return null;
}

export class ChubImporterService {
  /**
   * Fetch live characters from Chub AI API with pagination, tag filter, nsfw filter, and search query
   */
  public async fetchChubCards(
    searchQuery: string = '',
    selectedTag: string = 'All',
    sortOption: 'popular' | 'trending' | 'latest' = 'popular',
    page: number = 1,
    pageSize: number = 24,
    nsfwFilter: 'all' | 'nsfw_only' | 'sfw_only' = 'all'
  ): Promise<{ cards: ChubCharacterCard[]; totalCount: number; totalPages: number }> {
    let chubSort = 'star_count';
    if (sortOption === 'popular') chubSort = 'star_count';
    if (sortOption === 'trending') chubSort = 'default';
    if (sortOption === 'latest') chubSort = 'created_at';

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12_000);
      const { signal } = controller;

      try {
      const searchParams = new URLSearchParams();
      if (searchQuery.trim()) searchParams.append('search', searchQuery.trim());
      if (selectedTag && selectedTag !== 'All') searchParams.append('topics', selectedTag);
      
      searchParams.append('sort', chubSort);
      searchParams.append('page', page.toString());
      searchParams.append('first', pageSize.toString());
      searchParams.append('include_nsfw', 'true');
      searchParams.append('nsfw', 'true');

      if (nsfwFilter === 'nsfw_only') searchParams.append('require_nsfw', 'true');
      if (nsfwFilter === 'sfw_only') {
        searchParams.set('include_nsfw', 'false');
        searchParams.set('nsfw', 'false');
      }

      const url = `/chub-search?${searchParams.toString()}`;
      const res = await fetch(url, {
        signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Chub AI returned HTTP ${res.status}`);
      }

      if (res.ok) {
        const data = await res.json();
        const dataObj = data.data || data;
        const rawNodes = dataObj.nodes || dataObj.results || dataObj.data || [];
        const reportedTotal = Number(dataObj.count || dataObj.totalCount || dataObj.total || 0);
        const totalCount = reportedTotal > 0 ? reportedTotal : rawNodes.length;
        const totalPages = reportedTotal > 0
          ? Math.ceil(reportedTotal / pageSize)
          : (rawNodes.length >= pageSize ? page + 1 : page);

        if (Array.isArray(rawNodes) && rawNodes.length > 0) {
          const cards: ChubCharacterCard[] = rawNodes.map((node: any) => {
            const fullPath = node.fullPath || node.full_path || `${node.group || node.username || node.topics?.[0] || 'character'}/${node.name}`;
            const avatarUrl = node.avatar_url || node.avatarUrl || `https://avatars.charhub.io/avatars/${fullPath}/avatar.webp`;
            const maxResUrl = `https://avatars.charhub.io/avatars/${fullPath}/chara_card_v2.png`;

            return {
              id: String(node.id || `chub_${fullPath}`),
              fullPath,
              name: node.name || node.title || 'Unnamed Persona',
              creator: node.user || node.creator || fullPath.split('/')[0] || 'Unknown',
              tagline: node.tagline || node.headline || 'Ролевая персона с Chub AI',
              publicDescription: node.description || '',
              description: node.definition?.description || '',
              personality: node.definition?.personality || node.personality || '',
              scenario: node.definition?.scenario || node.scenario || '',
              firstMessage: node.definition?.first_mes || node.first_mes || node.firstMessage || '',
              alternateGreetings: node.definition?.alternate_greetings || node.alternate_greetings || [],
              mesExample: node.definition?.mes_example || node.mes_example || '',
              postHistoryInstructions: node.definition?.post_history_instructions || node.post_history_instructions || '',
              avatarUrl,
              maxResUrl,
              tags: Array.isArray(node.topics) ? node.topics : (node.tags || ['Chub AI']),
              chatsCount: node.nChats || node.chats_count || node.starCount || 0,
              starCount: node.starCount || node.star_count || 0,
              rating: node.rating ? Number(node.rating) : 5,
              lorebookEntriesCount: node.definition?.character_book?.entries?.length || 0,
              rawCharacterBook: node.definition?.character_book || null,
              definitionLoaded: Boolean(node.definition),
              rawDefinition: node.definition || undefined,
              createdAt: node.createdAt || node.created_at,
            };
          });

          return { cards, totalCount, totalPages };
        }

        throw new Error('Chub AI returned an empty or unsupported response');
      }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown Chub AI error');
        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    throw new Error(`Не удалось синхронизировать каталог Chub AI: ${lastError?.message || 'неизвестная ошибка'}`);
  }

  /**
   * Parse Chub AI URL or path into fullPath (e.g., "short_machine_2816/the-free-use-license-d2e5ee378041")
   */
  public parseFullPathFromUrl(urlOrPath: string): string {
    let clean = urlOrPath.trim();
    clean = clean.replace(/^https?:\/\/(www\.)?chub\.ai\/characters\//i, '');
    clean = clean.replace(/^https?:\/\/(www\.)?characterhub\.org\/characters\//i, '');
    clean = clean.split('?')[0]?.split('#')[0] || clean;
    clean = clean.replace(/^\/+|\/+$/g, '');
    return clean;
  }

  /**
   * Fetch full card definition directly from any Chub AI URL or fullPath
   */
  public async fetchCardByUrl(urlOrPath: string): Promise<ChubCharacterCard> {
    const fullPath = this.parseFullPathFromUrl(urlOrPath);
    const creator = fullPath.split('/')[0] || 'Chub Creator';
    const name = fullPath.split('/')[1]?.split('-')[0] || 'Chub Persona';

    const stubCard: ChubCharacterCard = {
      id: `chub_${fullPath}`,
      fullPath,
      name,
      creator,
      tagline: `Персонаж ${fullPath} с Chub AI`,
      description: '',
      avatarUrl: `/chub-avatars/avatars/${fullPath}/avatar.webp`,
      maxResUrl: `/chub-avatars/avatars/${fullPath}/chara_card_v2.png`,
      tags: ['Chub AI', 'Imported URL'],
      chatsCount: 0,
    };

    return this.fetchFullCardDefinition(stubCard);
  }

  /**
   * Fetch 100% full un-truncated card definition from Chub AI by decoding chara_card_v2.json / PNG metadata / Chub API
   */
  public async fetchFullCardDefinition(card: ChubCharacterCard): Promise<ChubCharacterCard> {
    if (!card.fullPath) return card;

    // Method 1: Call Chub AI Download API POST endpoint (Returns complete 100% V2 Spec JSON)
    try {
      const res = await fetch('/chub-api/api/characters/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullPath: card.fullPath, format: 'v2' }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const raw = await res.json();
        const d = raw.data || raw.definition || raw;
        if (d && (d.description || d.first_mes || d.personality)) {
          const ensureArray = (v: any) => Array.isArray(v) ? v.map(String).filter(Boolean) : (typeof v === 'string' && v.trim() ? [v.trim()] : []);
          return {
            ...card,
            name: d.name || card.name,
            description: d.description || card.description,
            personality: d.personality || card.personality || '',
            scenario: d.scenario || card.scenario || '',
            firstMessage: d.first_mes || d.firstMessage || card.firstMessage || '',
            alternateGreetings: ensureArray(d.alternate_greetings || d.alternateGreetings),
            mesExample: d.mes_example || d.mesExample || '',
            postHistoryInstructions: d.post_history_instructions || d.postHistoryInstructions || '',
            systemPrompt: d.system_prompt || d.systemPrompt || '',
            creatorNotes: d.creator_notes || d.creatorNotes || '',
            characterVersion: d.character_version || d.characterVersion || '',
            creator: d.creator || card.creator,
            tags: Array.isArray(d.tags) ? d.tags : card.tags,
            lorebookEntriesCount: d.character_book?.entries?.length || 0,
            rawCharacterBook: d.character_book || null,
            definitionLoaded: true,
            rawDefinition: d,
          };
        }
      }
    } catch {}

    // Method 2: Fetch raw chara_card_v2.json or v2.png from Charhub CDN via proxy
    const cdnUrls = [
      `/chub-avatars/avatars/${card.fullPath}/chara_card_v2.json`,
      `/chub-avatars/avatars/${card.fullPath}/chara_card_v2.png`,
    ];

    for (const cdnUrl of cdnUrls) {
      try {
        const res = await fetch(cdnUrl, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          if (cdnUrl.endsWith('.json')) {
            const raw = await res.json();
            const d = raw.data || raw.definition || raw;
            if (d && (d.description || d.first_mes || d.personality)) {
              const ensureArray = (v: any) => Array.isArray(v) ? v.map(String).filter(Boolean) : (typeof v === 'string' && v.trim() ? [v.trim()] : []);
              return {
                ...card,
                name: d.name || card.name,
                description: d.description || card.description,
                personality: d.personality || card.personality || '',
                scenario: d.scenario || card.scenario || '',
                firstMessage: d.first_mes || d.firstMessage || card.firstMessage || '',
                alternateGreetings: ensureArray(d.alternate_greetings || d.alternateGreetings),
                mesExample: d.mes_example || d.mesExample || '',
                postHistoryInstructions: d.post_history_instructions || d.postHistoryInstructions || '',
                systemPrompt: d.system_prompt || d.systemPrompt || '',
                creatorNotes: d.creator_notes || d.creatorNotes || '',
                characterVersion: d.character_version || d.characterVersion || '',
                creator: d.creator || card.creator,
                tags: Array.isArray(d.tags) ? d.tags : card.tags,
                lorebookEntriesCount: d.character_book?.entries?.length || 0,
                rawCharacterBook: d.character_book || null,
                definitionLoaded: true,
                rawDefinition: d,
              };
            }
          } else {
            const arrayBuffer = await res.arrayBuffer();
            const d = parsePngMetadata(arrayBuffer);
            if (d && (d.description || d.first_mes || d.personality)) {
              const ensureArray = (v: any) => Array.isArray(v) ? v.map(String).filter(Boolean) : (typeof v === 'string' && v.trim() ? [v.trim()] : []);
              return {
                ...card,
                name: d.name || card.name,
                description: d.description || card.description,
                personality: d.personality || card.personality || '',
                scenario: d.scenario || card.scenario || '',
                firstMessage: d.first_mes || d.firstMessage || card.firstMessage || '',
                alternateGreetings: ensureArray(d.alternate_greetings || d.alternateGreetings),
                mesExample: d.mes_example || d.mesExample || '',
                postHistoryInstructions: d.post_history_instructions || d.postHistoryInstructions || '',
                systemPrompt: d.system_prompt || d.systemPrompt || '',
                creatorNotes: d.creator_notes || d.creatorNotes || '',
                characterVersion: d.character_version || d.characterVersion || '',
                creator: d.creator || card.creator,
                tags: Array.isArray(d.tags) ? d.tags : card.tags,
                lorebookEntriesCount: d.character_book?.entries?.length || 0,
                rawCharacterBook: d.character_book || null,
                definitionLoaded: true,
                rawDefinition: d,
              };
            }
          }
        }
      } catch {
        // Try next
      }
    }

    // Method 3: Try Chub API definition GET endpoints
    const apiUrls = [
      `/chub-api/api/characters/${card.fullPath}`,
      `/chub-api/v2/characters/${card.fullPath}/definition`,
    ];

    for (const url of apiUrls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const raw = await res.json();
          const d = raw.character?.definition || raw.definition || raw.data || raw;

          if (d && (d.description || d.first_mes || d.personality)) {
            return {
              ...card,
              name: d.name || card.name,
              description: d.description || card.description,
              personality: d.personality || card.personality || '',
              scenario: d.scenario || card.scenario || '',
              firstMessage: d.first_mes || d.firstMessage || card.firstMessage || '',
              alternateGreetings: d.alternate_greetings || d.alternateGreetings || [],
              mesExample: d.mes_example || d.mesExample || '',
              postHistoryInstructions: d.post_history_instructions || d.postHistoryInstructions || '',
              systemPrompt: d.system_prompt || d.systemPrompt || '',
              creatorNotes: d.creator_notes || d.creatorNotes || '',
              characterVersion: d.character_version || d.characterVersion || '',
              creator: d.creator || card.creator,
              tags: Array.isArray(d.tags) ? d.tags : card.tags,
              lorebookEntriesCount: d.character_book?.entries?.length || 0,
              rawCharacterBook: d.character_book || null,
              definitionLoaded: true,
              rawDefinition: d,
            };
          }
        }
      } catch {
        // Continue
      }
    }

    return { ...card, definitionLoaded: false };
  }

  /**
   * 1-Click Import Chub Character into Arcaneum IndexedDB and optionally create chat session
   */
  public async importCharacter(
    cardInput: ChubCharacterCard,
    startChatImmediately: boolean = false,
    userPersonaId?: string
  ): Promise<{ persona: Persona; sessionId?: string }> {
    const card = await this.fetchFullCardDefinition(cardInput);
    const sourceId = this.parseFullPathFromUrl(card.fullPath);
    const existingPersona = await globalPersonaService.getPersonaBySource('chub.ai', sourceId);
    const lorebookIds: string[] = [];

    // Import linked lorebook entries if present
    if (card.rawCharacterBook && card.rawCharacterBook.entries && card.rawCharacterBook.entries.length > 0) {
      let createdLorebookId: string | undefined;
      try {
        const { globalLorebookService } = await import('@/services/lorebook/lorebook-service');
        const lb = await globalLorebookService.createLorebook(
          `Лорбук ${card.name}`,
          `Встроенный World Info для персонажа ${card.name} с Chub AI`
        );
        createdLorebookId = lb.id;
        lorebookIds.push(lb.id);

        for (const entry of card.rawCharacterBook.entries) {
          await globalLorebookService.addEntry(lb.id, {
            keys: entry.keys || (entry.key ? [entry.key] : [card.name]),
            secondaryKeys: entry.secondary_keys || [],
            content: entry.content || entry.text || '',
            enabled: entry.enabled !== false,
            insertionOrder: entry.insertion_order || entry.order || 10,
            priority: 10,
          });
        }
      } catch (error) {
        if (createdLorebookId) {
          const { globalLorebookService } = await import('@/services/lorebook/lorebook-service');
          await globalLorebookService.deleteLorebook(createdLorebookId).catch(() => undefined);
        }
        throw new Error(`Не удалось импортировать встроенный лорбук: ${error instanceof Error ? error.message : 'неизвестная ошибка'}`);
      }
    }

    const personaPayload = {
      type: card.tags.includes('Dungeon Master') ? 'dungeon-master' : card.tags.includes('Assistant') ? 'assistant' : 'character',
      data: {
        name: card.name,
        summary: card.tagline || card.description.slice(0, 100),
        description: card.description,
        personality: card.personality || '',
        scenario: card.scenario || '',
        firstMessage: card.firstMessage || '',
        alternateGreetings: card.alternateGreetings || [],
        mesExample: card.mesExample || '',
        postHistoryInstructions: card.postHistoryInstructions || '',
      },
      metadata: {
        creator: card.creator,
        version: 1,
        tags: card.tags,
        avatarUrl: card.maxResUrl || card.avatarUrl,
        customFields: {
          source: 'chub.ai',
          sourceId,
          sourceUrl: `https://chub.ai/characters/${sourceId}`,
          syncedAt: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      lorebookIds,
    } satisfies Omit<Persona, 'id'>;

    const newPersona = existingPersona
      ? await globalPersonaService.updatePersona(existingPersona.id, {
          type: personaPayload.type,
          data: personaPayload.data,
          lorebookIds: Array.from(new Set([...existingPersona.lorebookIds, ...lorebookIds])),
          tags: personaPayload.metadata.tags,
          metadata: {
            ...personaPayload.metadata,
            createdAt: existingPersona.metadata.createdAt,
          },
        })
      : await globalPersonaService.createPersona(personaPayload);

    let sessionId: string | undefined = undefined;
    if (startChatImmediately) {
      const session = await globalChatService.createSession(
        newPersona.id,
        `Диалог с ${card.name}`,
        userPersonaId
      );
      sessionId = session.id;
    }

    return { persona: newPersona, sessionId };
  }

}

export const globalChubImporterService = new ChubImporterService();
