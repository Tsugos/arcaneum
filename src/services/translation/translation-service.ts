/**
 * Arcaneum Global AI Translation Service
 * 100% Free, Client-Side, Zero-Cost Translation Engine
 * 
 * Features:
 * - Rate Limiter & Request Queue (max 1 req/sec to prevent Google 429)
 * - Tokenization of Markdown (*actions*), Character Names, and Lorebook terms
 * - IndexedDB Caching (db.translationCache)
 * - Circuit Breaker & Graceful Degradation fallback
 */

import { db } from '@/infrastructure/storage/db';

export interface TranslationOptions {
  sourceLang?: string; // default 'auto'
  targetLang?: string; // default 'en'
  protectedTerms?: string[]; // character names, lorebook terms
}

export interface TranslationResult {
  text: string;
  originalText: string;
  sourceLang: string;
  targetLang: string;
  fromCache: boolean;
  error?: boolean;
}

export class TranslationService {
  private _memoryCache: Map<string, string> = new Map();
  private _requestQueue: Array<() => Promise<void>> = [];
  private _isProcessingQueue = false;
  private _lastRequestTime = 0;
  private _minDelayMs = 800; // Rate limit 800ms
  private _consecutiveErrors = 0;
  private _circuitBreakerUntil = 0;

  // --- Hashing Utility ---
  private _hashText(text: string, sourceLang: string, targetLang: string): string {
    const str = `format-v2:${sourceLang}:${targetLang}:${text}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `tr_${Math.abs(hash)}`;
  }

  // --- Tokenization / Placeholder Protection ---
  private _tokenizeText(text: string, protectedTerms: string[] = []): { tokenizedText: string; placeholders: Map<string, string> } {
    const placeholders = new Map<string, string>();
    let counter = 0;
    let tokenizedText = text;

    // 1. Protect code blocks ```...```
    tokenizedText = tokenizedText.replace(/```[\s\S]*?```/g, (match) => {
      const key = `__PH_CODE_${counter++}__`;
      placeholders.set(key, match);
      return key;
    });

    // 2. Protect custom protected terms (character names, lorebook terms) with Unicode boundary
    for (const term of protectedTerms) {
      if (!term || term.trim().length < 2) continue;
      const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match with unicode boundary matching non-word chars (Cyrillic + ASCII safe)
      const regex = new RegExp(`(?:^|(?<=[^a-zA-Z0-9_\\u0400-\\u04FF]))${escaped}(?=$|[^a-zA-Z0-9_\\u0400-\\u04FF])`, 'gi');
      tokenizedText = tokenizedText.replace(regex, (match) => {
        const key = `__PH_TERM_${counter++}__`;
        placeholders.set(key, match);
        return key;
      });
    }

    return { tokenizedText, placeholders };
  }

  private _detokenizeText(text: string, placeholders: Map<string, string>): string {
    let result = text;
    placeholders.forEach((originalValue, placeholderKey) => {
      // 1. Try exact replacement first
      if (result.includes(placeholderKey)) {
        result = result.split(placeholderKey).join(originalValue);
      } else {
        // 2. Fuzzy replacement if Google/Lingva modified spaces or casing in placeholder
        // e.g. "__ PH_TERM_0 __" or "__ph_term_0__"
        const coreKey = placeholderKey.replace(/^__|__$/g, '');
        const coreParts = coreKey.split('_'); // ['PH', 'TERM', '0']
        if (coreParts.length >= 3) {
          const type = coreParts[1];
          const idx = coreParts[2];
          const fuzzyRegex = new RegExp(`__\\s*ph_${type}_${idx}\\s*__`, 'gi');
          result = result.replace(fuzzyRegex, originalValue);
        }
      }
    });

    // Clean up any extra spaces inserted around asterisks by MT engines (e.g. "* text *" -> "*text*")
    result = result.replace(/\*[ \t]+([^*\n]+?)[ \t]+\*/g, '*$1*');
    return result;
  }

  // --- Main Public Translate Method ---
  public async translate(text: string, options: TranslationOptions = {}): Promise<TranslationResult> {
    const sourceLang = options.sourceLang || 'auto';
    const targetLang = options.targetLang || 'en';
    const originalText = text;

    if (!text || text.trim().length === 0) {
      return { text, originalText, sourceLang, targetLang, fromCache: false };
    }

    const hash = this._hashText(text, sourceLang, targetLang);

    // 1. Check Memory Cache
    if (this._memoryCache.has(hash)) {
      return {
        text: this._memoryCache.get(hash)!,
        originalText,
        sourceLang,
        targetLang,
        fromCache: true,
      };
    }

    // 2. Check IndexedDB Cache
    try {
      const cached = await db.translationCache.get(hash);
      if (cached && cached.translatedText) {
        // Invalidate stale/poisoned cache entries (e.g. containing old placeholders, untranslated Latin words, or lost newlines)
        const hasUntranslatedLatin = targetLang === 'ru' && /[a-zA-Z]{4,}/.test(cached.translatedText);
        const lostNewlines = text.includes('\n') && !cached.translatedText.includes('\n');
        const isBadCache = cached.translatedText.includes('__PH_ACT_') || hasUntranslatedLatin || lostNewlines;
        if (isBadCache) {
          db.translationCache.delete(hash).catch(() => {});
        } else {
          this._memoryCache.set(hash, cached.translatedText);
          return {
            text: cached.translatedText,
            originalText,
            sourceLang,
            targetLang,
            fromCache: true,
          };
        }
      }
    } catch {
      // Ignore storage error
    }

    // 3. Check Circuit Breaker
    if (Date.now() < this._circuitBreakerUntil) {
      console.warn('[TranslationService] Circuit breaker active. Returning original text.');
      return { text, originalText, sourceLang, targetLang, fromCache: false, error: true };
    }

    // 4. Tokenize Formatting
    const { tokenizedText, placeholders } = this._tokenizeText(text, options.protectedTerms);

    // 5. Execute Rate-Limited Translation Query
    try {
      const rawTranslated = await this._enqueueRequest(() => this._performTranslation(tokenizedText, sourceLang, targetLang));
      const finalText = this._detokenizeText(rawTranslated, placeholders);

      // Save to memory cache & IndexedDB
      this._memoryCache.set(hash, finalText);
      this._saveToDbCache(hash, text, sourceLang, targetLang, finalText);
      this._consecutiveErrors = 0;

      return {
        text: finalText,
        originalText,
        sourceLang,
        targetLang,
        fromCache: false,
      };
    } catch (err) {
      console.error('[TranslationService] Translation failed:', err);
      this._consecutiveErrors++;
      if (this._consecutiveErrors >= 3) {
        this._circuitBreakerUntil = Date.now() + 60000; // Trip breaker for 60s
        console.warn('[TranslationService] 3 consecutive failures. Circuit breaker tripped for 60s.');
      }
      return {
        text: originalText,
        originalText,
        sourceLang,
        targetLang,
        fromCache: false,
        error: true,
      };
    }
  }

  // --- Queue Executor ---
  private async _enqueueRequest<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this._requestQueue.push(async () => {
        try {
          const now = Date.now();
          const elapsed = now - this._lastRequestTime;
          if (elapsed < this._minDelayMs) {
            await new Promise((r) => setTimeout(r, this._minDelayMs - elapsed));
          }
          this._lastRequestTime = Date.now();
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this._processQueue();
    });
  }

  private async _processQueue() {
    if (this._isProcessingQueue) return;
    this._isProcessingQueue = true;

    while (this._requestQueue.length > 0) {
      const task = this._requestQueue.shift();
      if (task) {
        await task();
      }
    }

    this._isProcessingQueue = false;
  }

  // --- Multi-Engine Translation Executer ---
  private async _performTranslation(text: string, sourceLang: string, targetLang: string): Promise<string> {
    // Preserve exact paragraph, indentation, list markers and roleplay Markdown.
    const lines = text.split('\n');
    const translatedLines: string[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        translatedLines.push(''); // Preserve empty newlines/paragraph breaks
        continue;
      }

      const indentation = line.match(/^\s*/)?.[0] || '';
      let body = line.slice(indentation.length);
      const listMarker = body.match(/^(?:[-+•]|\d+[.)])\s+/)?.[0] || '';
      if (listMarker) body = body.slice(listMarker.length);

      // Translation engines generally preserve HTML tags more reliably than
      // Markdown delimiters. Restore the original Markdown after translation.
      body = body
        .replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>')
        .replace(/\*([^*\n]+?)\*/g, '<i>$1</i>');

      const translatedBody = await this._translateSingleChunk(body, sourceLang, targetLang);
      const restoredBody = translatedBody
        .replace(/<\s*b\s*>/gi, '**')
        .replace(/<\s*\/\s*b\s*>/gi, '**')
        .replace(/<\s*i\s*>/gi, '*')
        .replace(/<\s*\/\s*i\s*>/gi, '*');

      translatedLines.push(`${indentation}${listMarker}${restoredBody}`);
    }

    return translatedLines.join('\n');
  }

  private async _translateSingleChunk(text: string, sourceLang: string, targetLang: string): Promise<string> {
    // Engine 1: Google GTX Endpoint (via Vite proxy or direct fetch)
    try {
      return await this._engineGoogleGTX(text, sourceLang, targetLang);
    } catch (e1) {
      console.warn('[TranslationService] Engine 1 (Google GTX) failed, trying Lingva...', e1);
    }

    // Engine 2: Lingva Open-Source API
    try {
      return await this._engineLingva(text, sourceLang, targetLang);
    } catch (e2) {
      console.warn('[TranslationService] Engine 2 (Lingva) failed, trying Chrome AI...', e2);
    }

    // Engine 3: Chrome Built-in AI Translation API
    try {
      return await this._engineChromeAI(text, sourceLang, targetLang);
    } catch (e3) {
      console.warn('[TranslationService] Engine 3 (Chrome AI) unavailable.', e3);
    }

    throw new Error('All translation engines failed');
  }

  // --- Engine 1 Implementation: Google GTX ---
  private async _engineGoogleGTX(text: string, sourceLang: string, targetLang: string): Promise<string> {
    let sl = sourceLang === 'auto' ? 'auto' : sourceLang;
    // If target is Russian and text contains Latin characters, force source language to 'en'
    if (targetLang === 'ru' && (sl === 'auto' || sl === 'en') && /[a-zA-Z]{3,}/.test(text)) {
      sl = 'en';
    }

    const tl = targetLang;
    const q = encodeURIComponent(text);

    // Try via Vite proxy first, fallback to direct googleapis
    const urls = [
      `/google-translate/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${q}`,
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${q}`,
    ];

    let lastErr: any;
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const sentences = data[0].map((item: any) => item[0]).filter(Boolean);
          if (sentences.length > 0) {
            return sentences.join('');
          }
        }
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Google GTX response invalid');
  }

  // --- Engine 2 Implementation: Lingva ---
  private async _engineLingva(text: string, sourceLang: string, targetLang: string): Promise<string> {
    let sl = sourceLang === 'auto' ? 'auto' : sourceLang;
    if (targetLang === 'ru' && (sl === 'auto' || sl === 'en') && /[a-zA-Z]{3,}/.test(text)) {
      sl = 'en';
    }
    const url = `https://lingva.ml/api/v1/${sl}/${targetLang}/${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Lingva HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.translation) {
      return data.translation;
    }
    throw new Error('Lingva response invalid');
  }

  // --- Engine 3 Implementation: Chrome Built-in AI Translation API ---
  private async _engineChromeAI(text: string, sourceLang: string, targetLang: string): Promise<string> {
    if (typeof window !== 'undefined' && 'translation' in window && (window as any).translation) {
      const translation = (window as any).translation;
      const translator = await translation.createTranslator({
        sourceLanguage: sourceLang === 'auto' ? 'ru' : sourceLang,
        targetLanguage: targetLang,
      });
      return await translator.translate(text);
    }
    throw new Error('Chrome Translation API not supported');
  }

  // --- Save to IndexedDB Cache ---
  private async _saveToDbCache(hash: string, sourceText: string, sourceLang: string, targetLang: string, translatedText: string) {
    try {
      await db.translationCache.put({
        hash,
        sourceText,
        sourceLang,
        targetLang,
        translatedText,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Cleanup cache if size exceeds 5000 records
      const count = await db.translationCache.count();
      if (count > 5000) {
        const oldest = await db.translationCache.orderBy('updatedAt').limit(500).keys();
        await db.translationCache.bulkDelete(oldest as string[]);
      }
    } catch {
      // Non-critical background operation
    }
  }

  // --- Public Cache Operations ---
  public clearCache() {
    this._memoryCache.clear();
    db.translationCache.clear().catch(() => {});
  }
}

export const globalTranslationService = new TranslationService();
