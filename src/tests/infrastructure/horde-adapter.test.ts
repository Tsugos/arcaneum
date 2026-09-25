import { describe, it, expect, vi } from 'vitest';
import { AIHordeAdapter } from '@/infrastructure/ai/horde-adapter';
import { AIProviderService } from '@/services/ai/provider-service';

describe('AI Horde Adapter & Provider Service', () => {
  it('should fetch available models and capabilities', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify([
      { name: 'real-test-model', count: 2, performance: 10, queued: 0, jobs: 0, eta: 0, type: 'text' },
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new AIHordeAdapter();
    const models = await adapter.fetchAvailableModels();
    expect(models.length).toBeGreaterThan(0);

    const caps = adapter.getCapabilities(models[0]!.id);
    expect(caps.maxContext).toBeGreaterThanOrEqual(4096);
    expect(caps.supportsRoleplay).toBe(true);
    vi.restoreAllMocks();
  });

  it('should generate text response via provider service', async () => {
    const service = new AIProviderService();
    const result = await service.generate('System: You are Arcaneum AI.\nUser: Hello!', {
      modelId: 'koboldcpp/Llama-3-8B-Instruct',
      temperature: 0.7,
    });

    expect(result.text).toBeDefined();
    expect(result.providerId).toBe('ai-horde');
    expect(result.usageTokens).toBeDefined();
  });
});
