/**
 * AI Provider & Model Domain Entities
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/PROVIDER_ADAPTER.md
 */

export type ProviderType = 
  | 'ai-horde' 
  | 'openrouter' 
  | 'ollama' 
  | 'lm-studio' 
  | 'koboldcpp' 
  | 'openai' 
  | 'anthropic' 
  | 'google-gemini' 
  | 'custom-openai-compatible';

export interface AIProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  isCustom?: boolean;
}

export interface AIModel {
  id: string;
  providerId: string;
  name: string;
  contextWindow: number;
  maxTokens?: number;
  supportsStreaming: boolean;
  supportsImages: boolean;
  isAvailable: boolean;
  /** Live worker count for this model (AI Horde) */
  workerCount?: number;
  /** NSFW model capability flag */
  isNsfw?: boolean;
  /** Russian language optimization flag */
  supportsRussian?: boolean;
  /** Tokens per second performance metric */
  performance?: number;
  /** Number of queued requests */
  queued?: number;
  /** Estimated time in seconds */
  eta?: number;
}

export interface GenerationOptions {
  modelId?: string;
  providerId?: string;
  temperature?: number;
  maxTokens?: number;
  repetitionPenalty?: number;
  topP?: number;
  topK?: number;
  typicalP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  contextLimit?: number;
  stopSequences?: string[];
  apiKey?: string;
  baseUrl?: string;
}
