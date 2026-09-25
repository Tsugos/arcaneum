import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranslationService } from '@/services/translation/translation-service';

describe('TranslationService & Tokenization', () => {
  let translationService: TranslationService;

  beforeEach(() => {
    translationService = new TranslationService();
  });

  it('should preserve markdown asterisk actions using tokenization placeholders', async () => {
    // Mock the internal engine to return translated text containing placeholders
    const mockEngine = vi.spyOn(translationService as any, '_engineGoogleGTX');
    mockEngine.mockImplementation(async (tokenizedText: any) => {
      return (tokenizedText as string).replace('Привет', 'Hello');
    });

    const input = 'Привет, *он улыбнулся и подошел близко*.';
    const result = await translationService.translate(input, {
      sourceLang: 'ru',
      targetLang: 'en',
      protectedTerms: ['Мия'],
    });

    expect(result.text).toContain('*он улыбнулся и подошел близко*');
    expect(result.text).toContain('Hello');
  });

  it('should return cached result on second query without calling translation engines', async () => {
    const mockEngine = vi.spyOn(translationService as any, '_engineGoogleGTX');
    mockEngine.mockResolvedValue('Hello world');

    const result1 = await translationService.translate('Привет мир', { sourceLang: 'ru', targetLang: 'en' });
    expect(result1.text).toBe('Hello world');
    expect(result1.fromCache).toBe(false);

    const result2 = await translationService.translate('Привет мир', { sourceLang: 'ru', targetLang: 'en' });
    expect(result2.text).toBe('Hello world');
    expect(result2.fromCache).toBe(true);
  });

  it('should allow text inside asterisks to be translated while preserving markdown formatting', async () => {
    const mockEngine = vi.spyOn(translationService as any, '_engineGoogleGTX');
    mockEngine.mockImplementation(async (text: any) => text.replace('smiles gently', 'мягко улыбается'));

    const input = 'She *smiles gently* at you.';
    const result = await translationService.translate(input, { sourceLang: 'en', targetLang: 'ru' });

    expect(result.text).toBe('She *мягко улыбается* at you.');
  });

  it('should preserve paragraphs, indentation, lists and bold roleplay markup', async () => {
    const mockEngine = vi.spyOn(translationService as any, '_engineGoogleGTX');
    mockEngine.mockImplementation(async (text: any) =>
      (text as string)
        .replace('Title', 'Заголовок')
        .replace('first action', 'первое действие')
        .replace('Important', 'Важно')
    );

    const input = 'Title\n\n  - *first action*\n  **Important**';
    const result = await translationService.translate(input, { sourceLang: 'en', targetLang: 'ru' });

    expect(result.text).toBe('Заголовок\n\n  - *первое действие*\n  **Важно**');
  });

  it('should protect Cyrillic character names and terms correctly', async () => {
    const mockEngine = vi.spyOn(translationService as any, '_engineGoogleGTX');
    mockEngine.mockImplementation(async (tokenizedText: any) => {
      expect(tokenizedText).toContain('__PH_TERM_0__');
      return tokenizedText;
    });

    const input = 'Алиса зашла в комнату.';
    const result = await translationService.translate(input, {
      sourceLang: 'ru',
      targetLang: 'en',
      protectedTerms: ['Алиса'],
    });

    expect(result.text).toBe('Алиса зашла в комнату.');
  });

  it('should fuzzy detokenize term placeholders if translation engine inserts spaces or changes case', async () => {
    const mockEngine = vi.spyOn(translationService as any, '_engineGoogleGTX');
    mockEngine.mockImplementation(async () => {
      // Simulate Google Translate returning modified spaces/casing in placeholder
      return 'Hello __ PH_TERM_0 __ world';
    });

    const input = 'Привет Алиса мир';
    const result = await translationService.translate(input, { sourceLang: 'ru', targetLang: 'en', protectedTerms: ['Алиса'] });

    expect(result.text).toBe('Hello Алиса world');
    expect(result.text).not.toContain('__ PH_TERM_0 __');
  });

  it('should split long text into safe sub-chunks without failing', async () => {
    const mockEngine = vi.spyOn(translationService as any, '_engineGoogleGTX');
    mockEngine.mockImplementation(async (chunk: any) => `[TR:${(chunk as string).slice(0, 10)}]`);

    // Create a 2500-char string
    const longText = 'А'.repeat(2500);
    const result = await translationService.translate(longText, { sourceLang: 'ru', targetLang: 'en' });

    expect(result.error).toBeUndefined();
    expect(result.text).toContain('[TR:АААААААААА]');
  });
});
