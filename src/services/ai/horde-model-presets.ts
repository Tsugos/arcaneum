export interface ModelRpPreset {
  modelKeyword: string;
  displayName: string;
  temperature: number;
  topP: number;
  topK: number;
  typicalP: number;
  repetitionPenalty: number;
  presencePenalty: number;
  frequencyPenalty: number;
  contextLimit: number;
  maxTokens: number;
  description: string;
}

export const HORDE_MODEL_RP_PRESETS: ModelRpPreset[] = [
  {
    modelKeyword: 'cydonia',
    displayName: 'Cydonia 24B (Uncensored RP)',
    temperature: 0.95,
    topP: 0.95,
    topK: 40,
    typicalP: 0.9,
    repetitionPenalty: 1.12,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
    contextLimit: 16384,
    maxTokens: 2500,
    description: 'Оптимизировано для эмоционального и глубокого нецензурированного ролевого отыгрыша.',
  },
  {
    modelKeyword: 'stheno',
    displayName: 'Stheno 8B (Llama 3 RP)',
    temperature: 0.9,
    topP: 0.92,
    topK: 50,
    typicalP: 0.95,
    repetitionPenalty: 1.1,
    presencePenalty: 0.1,
    frequencyPenalty: 0.0,
    contextLimit: 8192,
    maxTokens: 2000,
    description: 'Высокая динамика диалогов, точное следование характеру и отклику персонажей.',
  },
  {
    modelKeyword: 'mythomax',
    displayName: 'MythoMax L2 13B',
    temperature: 0.85,
    topP: 0.9,
    topK: 40,
    typicalP: 1.0,
    repetitionPenalty: 1.15,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
    contextLimit: 4096,
    maxTokens: 1800,
    description: 'Классическая золотая модель для глубокого повествовательного отыгрыша.',
  },
  {
    modelKeyword: 'hermes',
    displayName: 'Hermes 3 / Llama 3.1',
    temperature: 0.8,
    topP: 0.9,
    topK: 40,
    typicalP: 1.0,
    repetitionPenalty: 1.08,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
    contextLimit: 16384,
    maxTokens: 2500,
    description: 'Высокая разумность, сложное мышление и удержание сложных сценариев.',
  },
  {
    modelKeyword: 'command-r',
    displayName: 'Command-R / Command-R Plus',
    temperature: 0.75,
    topP: 0.85,
    topK: 0,
    typicalP: 1.0,
    repetitionPenalty: 1.05,
    presencePenalty: 0.2,
    frequencyPenalty: 0.0,
    contextLimit: 16384,
    maxTokens: 3000,
    description: 'Идеально для длинных многофигурных сцен и лорбуков большого контекста.',
  },
  {
    modelKeyword: 'mistral',
    displayName: 'Mistral / Mixtral 8x7B',
    temperature: 0.85,
    topP: 0.9,
    topK: 40,
    typicalP: 0.95,
    repetitionPenalty: 1.1,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
    contextLimit: 16384,
    maxTokens: 2500,
    description: 'Быстрые и грамотные литературные ответы на русском языке.',
  },
  {
    modelKeyword: 'psyfighter',
    displayName: 'Psyfighter / Noromaid',
    temperature: 0.95,
    topP: 0.95,
    topK: 50,
    typicalP: 0.9,
    repetitionPenalty: 1.14,
    presencePenalty: 0.05,
    frequencyPenalty: 0.0,
    contextLimit: 8192,
    maxTokens: 2000,
    description: 'Повышенная экспрессия, эмоциональность и яркое поведение персонажа.',
  },
];

export const DEFAULT_RP_PRESET: ModelRpPreset = {
  modelKeyword: 'default',
  displayName: 'Стандартный шаблон РП',
  temperature: 0.85,
  topP: 0.9,
  topK: 40,
  typicalP: 0.95,
  repetitionPenalty: 1.1,
  presencePenalty: 0.0,
  frequencyPenalty: 0.0,
  contextLimit: 8192,
  maxTokens: 2500,
  description: 'Универсальный сбалансированный пресет генерации.',
};

/**
 * Parses the selected model ID / name and matches the optimal RP preset parameters
 */
export function getRpPresetForModel(modelId: string): ModelRpPreset {
  if (!modelId) return DEFAULT_RP_PRESET;
  const lower = modelId.toLowerCase();

  for (const preset of HORDE_MODEL_RP_PRESETS) {
    if (lower.includes(preset.modelKeyword)) {
      return preset;
    }
  }

  return DEFAULT_RP_PRESET;
}
