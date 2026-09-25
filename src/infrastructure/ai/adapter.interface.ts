/**
 * Arcaneum Provider Adapter Interfaces & Capability Detection
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/PROVIDER_ADAPTER.md
 */

import type { AIModel } from '@/domain/entities';

export interface GenerationOptions {
  modelId: string;
  providerId?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  typicalP?: number;
  contextLimit?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  repetitionPenalty?: number;
  stopSequences?: string[];
  systemPromptOverride?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface ModelCapabilities {
  maxContext: number;
  supportsImages: boolean;
  supportsStreaming: boolean;
  supportsJson: boolean;
  supportsRoleplay: boolean;
  languageSupport: string[];
}

export interface UnifiedGenerationResult {
  text: string;
  finishReason: 'stop' | 'length' | 'error' | 'content_filter';
  usageTokens?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  providerId: string;
  modelId: string;
  rawResponse?: unknown;
}

export interface IAIProviderAdapter {
  readonly id: string;
  readonly name: string;
  
  /**
   * Generates a text response from the provider given a neutral prompt string
   */
  generateResponse(
    promptContext: string,
    options: GenerationOptions
  ): Promise<UnifiedGenerationResult>;

  /**
   * Generates a streaming text response (if supported by provider)
   */
  generateStream?(
    promptContext: string,
    options: GenerationOptions,
    onChunk: (chunk: string) => void
  ): Promise<UnifiedGenerationResult>;

  /**
   * Fetches list of available models from provider
   */
  fetchAvailableModels(): Promise<AIModel[]>;

  /**
   * Gets specific capabilities of a model
   */
  getCapabilities(modelId: string): ModelCapabilities;
}
