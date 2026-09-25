/**
 * Translation Cache Entry Domain Entity
 */

export interface TranslationCacheEntry {
  hash: string;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  translatedText: string;
  createdAt: number;
  updatedAt: number;
}
