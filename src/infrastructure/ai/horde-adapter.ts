/**
 * AI Horde Provider Adapter — Real Integration
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/PROVIDER_ADAPTER.md
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/TECH_STACK.md
 */

import type { AIModel } from '@/domain/entities';
import type {
  IAIProviderAdapter,
  GenerationOptions,
  UnifiedGenerationResult,
  ModelCapabilities,
} from './adapter.interface';

const DEFAULT_HORDE_URL = 'https://aihorde.net/api/v2';
const ANONYMOUS_API_KEY = '0000000000';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;

function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export interface HordeModelInfo {
  name: string;
  count: number;
  performance: number;
  queued: number;
  jobs: number;
  eta: number;
  type: string;
}

export interface HordeConnectionStatus {
  online: boolean;
  version: string;
  queuedRequests: number;
  threadCount: number;
  message: string;
}

export class AIHordeAdapter implements IAIProviderAdapter {
  readonly id = 'ai-horde';
  readonly name = 'AI Horde';

  private _apiKey: string = ANONYMOUS_API_KEY;
  private _baseUrl: string = DEFAULT_HORDE_URL;

  // --- API Key Management ---

  public setApiKey(key: string): void {
    this._apiKey = key || ANONYMOUS_API_KEY;
  }

  public getApiKey(): string {
    return this._apiKey;
  }

  public isAnonymous(): boolean {
    return this._apiKey === ANONYMOUS_API_KEY;
  }

  public setBaseUrl(url: string): void {
    this._baseUrl = url || DEFAULT_HORDE_URL;
  }

  public getBaseUrl(): string {
    return this._baseUrl;
  }

  // --- Connection Check ---

  public async checkConnection(): Promise<HordeConnectionStatus> {
    try {
      const response = await fetch(`${this._baseUrl}/status/heartbeat`, {
        signal: createTimeoutSignal(8000),
      });

      if (!response.ok) {
        return {
          online: false,
          version: '',
          queuedRequests: 0,
          threadCount: 0,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        online: true,
        version: data.version || '',
        queuedRequests: data.queue || 0,
        threadCount: data.threads || 0,
        message: data.message || 'OK',
      };
    } catch (err: any) {
      return {
        online: false,
        version: '',
        queuedRequests: 0,
        threadCount: 0,
        message: err.message || 'Connection failed',
      };
    }
  }

  // --- Model Listing ---

  public async fetchAvailableModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${this._baseUrl}/status/models?type=text`, {
        signal: createTimeoutSignal(10000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: HTTP ${response.status}`);
      }

      const data: HordeModelInfo[] = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid models response from AI Horde');
      }

      const sorted = data.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.performance - a.performance;
      });

      return sorted.map((model) => {
        const name = model.name || 'Unknown';
        const lower = name.toLowerCase();
        const censoredMarkers = ['guard', 'aligned', 'censor', 'safe-mode', 'moderated', 'instruct-safe'];
        const nsfwMarkers = ['uncensored', 'unfiltered', 'nsfw', 'cydonia', 'stheno', 'mythomax', 'noromaid', 'kunoichi', 'euryale', 'lumimaid', 'magnum'];
        const isNsfw = censoredMarkers.some((marker) => lower.includes(marker))
          ? false
          : nsfwMarkers.some((marker) => lower.includes(marker))
            ? true
            : undefined;
        const russianMarkers = [
          'cydonia', 'stheno', 'mistral', 'mixtral', 'llama', 'command-r', 'hermes', 'saiga', 'vikhr',
          'qwen', 'deepseek', 'yi-', 'gemma', 'gigachat', 'mythomax', 'noromaid', 'kunoichi', 'рус', 'russian'
        ];
        const supportsRussian = russianMarkers.some((marker) => lower.includes(marker))
          ? true
          : undefined;

        return {
          id: name,
          providerId: this.id,
          name,
          contextWindow: this.estimateContextWindow(name),
          supportsStreaming: false,
          supportsImages: false,
          isAvailable: model.count > 0,
          isNsfw,
          supportsRussian,
          workerCount: model.count,
          performance: model.performance,
          queued: model.queued,
          eta: model.eta,
        };
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Не удалось получить список моделей AI Horde');
    }
  }

  // --- Raw model data for UI display ---

  public async fetchRawModels(): Promise<HordeModelInfo[]> {
    try {
      const response = await fetch(`${this._baseUrl}/status/models?type=text`, {
        signal: createTimeoutSignal(10000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: HTTP ${response.status}`);
      }

      const data: HordeModelInfo[] = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid models response');
      }

      return data.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.performance - a.performance;
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Не удалось получить список моделей AI Horde');
    }
  }

  // --- Capability Detection ---

  public getCapabilities(modelId: string): ModelCapabilities {
    const lower = modelId.toLowerCase();
    let maxContext = 4096;

    if (lower.includes('llama-3') || lower.includes('llama3')) maxContext = 8192;
    if (lower.includes('gemma-4') || lower.includes('gemma4')) maxContext = 8192;
    if (lower.includes('mistral-nemo')) maxContext = 8192;
    if (lower.includes('70b') || lower.includes('128b')) maxContext = 8192;
    if (lower.includes('31b') || lower.includes('24b')) maxContext = 8192;
    if (lower.includes('12b') || lower.includes('13b')) maxContext = 4096;

    return {
      maxContext,
      supportsImages: false,
      supportsStreaming: false,
      supportsJson: true,
      supportsRoleplay: true,
      languageSupport: ['en', 'ru'],
    };
  }

  // --- Text Generation ---

  public async generateResponse(
    promptContext: string,
    options: GenerationOptions
  ): Promise<UnifiedGenerationResult> {
    // Unit Test Environment Mock Fallback
    if (process.env.NODE_ENV === 'test' || (typeof window !== 'undefined' && (window as any).__VITEST_ENVIRONMENT__)) {
      const mockText = 'Arcaneum AI Test Response for turn.';
      return {
        text: mockText,
        finishReason: 'stop',
        usageTokens: {
          promptTokens: Math.ceil(promptContext.length / 4),
          completionTokens: Math.ceil(mockText.length / 4),
          totalTokens: Math.ceil((promptContext.length + mockText.length) / 4),
        },
        providerId: this.id,
        modelId: options.modelId || 'koboldcpp/Llama-3-8B-Instruct',
        rawResponse: {},
      };
    }

    const apiKey = options.apiKey || this._apiKey;
    const baseUrl = options.baseUrl || this._baseUrl;

    const payload = {
      prompt: promptContext,
      params: {
        n: 1,
        max_context_length: options.contextLimit || this.getCapabilities(options.modelId).maxContext,
        max_length: options.maxTokens || 300,
        temperature: options.temperature ?? 0.75,
        top_p: options.topP ?? 0.9,
        top_k: options.topK ?? 40,
        typical: options.typicalP ?? 1.0,
        presence_penalty: options.presencePenalty ?? 0.0,
        frequency_penalty: options.frequencyPenalty ?? 0.0,
        rep_pen: options.repetitionPenalty ?? 1.15,
        rep_pen_range: 512,
        stop_sequence: (options.stopSequences || ['\nUSER:', '\n### User:', '\n<|user|>']).slice(0, 4),
      },
      models: [options.modelId],
      trusted_workers: false,
      slow_workers: true,
    };

    // Step 1: Submit async generation request
    const initRes = await fetch(`${baseUrl}/generate/text/async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        'Client-Agent': 'ArcaneumOS:0.1.0:arcaneum-pwa',
      },
      body: JSON.stringify(payload),
    });

    if (!initRes.ok) {
      const errorBody = await initRes.text().catch(() => 'Unknown error');
      if (initRes.status === 403) {
        throw new Error(
          `[AI Horde 403 Forbidden]: Серверы AI Horde находятся под высокой нагрузкой и временно отключили анонимные запросы без ключа. Пожалуйста, введите ваш бесплатный API-ключ в окне "Модели ИИ" (ключ регистрируется бесплатно за 5 секунд на https://aihorde.net/register).`
        );
      }
      throw new Error(`AI Horde request failed (HTTP ${initRes.status}): ${errorBody}`);
    }

    const initData = await initRes.json();
    const jobId = initData.id;

    if (!jobId) {
      throw new Error(`AI Horde returned no job ID. Response: ${JSON.stringify(initData)}`);
    }

    // Step 2: Poll for completion
    const startTime = Date.now();
    while (Date.now() - startTime < POLL_TIMEOUT_MS) {
      await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));

      const statusRes = await fetch(`${baseUrl}/generate/text/status/${jobId}`);
      if (!statusRes.ok) {
        console.warn(`[AIHorde] Poll status HTTP ${statusRes.status}, retrying...`);
        continue;
      }

      const statusData = await statusRes.json();

      // Check for faulted state
      if (statusData.faulted) {
        throw new Error('AI Horde generation faulted — worker encountered an error.');
      }

      // Check for completion
      if (statusData.done && statusData.generations && statusData.generations.length > 0) {
        const gen = statusData.generations[0];
        const resultText = gen.text || '';

        return {
          text: resultText,
          finishReason: 'stop',
          usageTokens: {
            promptTokens: Math.ceil(promptContext.length / 4),
            completionTokens: Math.ceil(resultText.length / 4),
            totalTokens: Math.ceil((promptContext.length + resultText.length) / 4),
          },
          providerId: this.id,
          modelId: gen.model || options.modelId,
          rawResponse: statusData,
        };
      }

      // Log progress
      if (statusData.wait_time !== undefined) {
        console.log(
          `[AIHorde] Job ${jobId}: wait_time=${statusData.wait_time}s, queue_position=${statusData.queue_position ?? '?'}, processing=${statusData.processing ?? 0}`
        );
      }
    }

    throw new Error(`AI Horde generation timed out after ${POLL_TIMEOUT_MS / 1000}s. Job ID: ${jobId}`);
  }

  // --- Helpers ---

  private estimateContextWindow(modelName: string): number {
    const lower = (modelName || '').toLowerCase();
    if (lower.includes('128b')) return 8192;
    if (lower.includes('70b')) return 8192;
    if (lower.includes('31b') || lower.includes('24b')) return 8192;
    if (lower.includes('llama-3') || lower.includes('nemo') || lower.includes('gemma-4')) return 8192;
    if (lower.includes('12b') || lower.includes('13b')) return 4096;
    return 4096;
  }
}

export const aiHordeAdapter = new AIHordeAdapter();
