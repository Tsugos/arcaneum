/**
 * Arcaneum AI Provider Service Manager
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/SYSTEM_MODULES.md
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/PROVIDER_ADAPTER.md
 */

import type { AIModel } from '@/domain/entities';
import type { IAIProviderAdapter, GenerationOptions, UnifiedGenerationResult } from '@/infrastructure/ai/adapter.interface';
import { aiHordeAdapter } from '@/infrastructure/ai/horde-adapter';
import type { HordeConnectionStatus, HordeModelInfo } from '@/infrastructure/ai/horde-adapter';
import { globalServiceRegistry } from '@/core/service-registry';

const STORAGE_KEY_API = 'arcaneum_provider_apikey';
const STORAGE_KEY_MODEL = 'arcaneum_active_model';

export class AIProviderService {
  private adapters = new Map<string, IAIProviderAdapter>();
  private activeProviderId: string = 'ai-horde';
  private activeModelId: string = '';
  private _cachedModels: AIModel[] = [];

  constructor() {
    this.registerAdapter(aiHordeAdapter);
    this.loadSavedSettings();
  }

  // --- Adapter Registry ---

  public registerAdapter(adapter: IAIProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public getAdapter(id?: string): IAIProviderAdapter {
    const targetId = id || this.activeProviderId;
    const adapter = this.adapters.get(targetId);
    if (!adapter) {
      throw new Error(`[AIProviderService] Provider adapter '${targetId}' not found.`);
    }
    return adapter;
  }

  public setActiveProvider(id: string): void {
    if (!this.adapters.has(id)) {
      throw new Error(`[AIProviderService] Unknown provider '${id}'.`);
    }
    this.activeProviderId = id;
  }

  public getActiveProviderId(): string {
    return this.activeProviderId;
  }

  public getAllProviders(): { id: string; name: string }[] {
    return Array.from(this.adapters.values()).map((a) => ({
      id: a.id,
      name: a.name,
    }));
  }

  // --- API Key Management ---

  public setApiKey(key: string): void {
    if ('setApiKey' in aiHordeAdapter) {
      aiHordeAdapter.setApiKey(key);
    }
    try {
      localStorage.setItem(STORAGE_KEY_API, key);
    } catch {
      throw new Error('Браузер не позволил сохранить API-ключ. После перезапуска он будет потерян.');
    }
  }

  public getApiKey(): string {
    try {
      return localStorage.getItem(STORAGE_KEY_API) || '0000000000';
    } catch {
      return '0000000000';
    }
  }

  public isAnonymous(): boolean {
    return this.getApiKey() === '0000000000';
  }

  // --- Model Management ---

  public setActiveModel(modelId: string): void {
    this.activeModelId = modelId;
    try {
      localStorage.setItem(STORAGE_KEY_MODEL, modelId);
    } catch {
      throw new Error('Браузер не позволил сохранить выбранную модель.');
    }
  }

  public getActiveModel(): string {
    return this.activeModelId;
  }

  public getCachedModels(): AIModel[] {
    return this._cachedModels;
  }

  public async fetchModels(): Promise<AIModel[]> {
    const adapter = this.getAdapter();
    const models = await adapter.fetchAvailableModels();
    this._cachedModels = models;

    // Auto-select first available model if none is selected
    if (!this.activeModelId && models.length > 0) {
      const firstAvailable = models.find((m) => m.isAvailable);
      if (firstAvailable) {
        this.setActiveModel(firstAvailable.id);
      }
    }

    return models;
  }

  // --- Connection Check ---

  public async checkConnection(): Promise<HordeConnectionStatus> {
    return aiHordeAdapter.checkConnection();
  }

  // --- Raw model info for detailed UI ---

  public async fetchRawModels(): Promise<HordeModelInfo[]> {
    return aiHordeAdapter.fetchRawModels();
  }

  // --- Generation ---

  public async generate(
    promptContext: string,
    options: GenerationOptions
  ): Promise<UnifiedGenerationResult> {
    const adapter = this.getAdapter();
    // Inject saved API key if not provided in options
    const finalOptions: GenerationOptions = {
      ...options,
      apiKey: options.apiKey || this.getApiKey(),
      modelId: options.modelId || this.activeModelId,
    };
    return adapter.generateResponse(promptContext, finalOptions);
  }

  // --- Persistence ---

  private loadSavedSettings(): void {
    try {
      const savedKey = localStorage.getItem(STORAGE_KEY_API);
      if (savedKey) {
        aiHordeAdapter.setApiKey(savedKey);
      }
      const savedModel = localStorage.getItem(STORAGE_KEY_MODEL);
      if (savedModel) {
        this.activeModelId = savedModel;
      }
    } catch {
      // localStorage may not be available
    }
  }
}

export const globalAIProviderService = new AIProviderService();
globalServiceRegistry.register('AIProviderService', globalAIProviderService);
