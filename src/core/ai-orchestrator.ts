/**
 * Arcaneum Core AI Orchestrator
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/AI_ORCHESTRATOR.md
 */

import { globalChatService } from '@/services/chat/chat-service';
import { globalPersonaService } from '@/services/persona/persona-service';
import { globalUserPersonaService } from '@/services/persona/user-persona-service';
import { globalLorebookService } from '@/services/lorebook/lorebook-service';
import { globalMemoryService } from '@/services/memory/memory-service';
import { defaultPromptPipeline } from '@/services/prompt-pipeline/pipeline';
import { globalAIProviderService } from '@/services/ai/provider-service';
import { globalTranslationService } from '@/services/translation/translation-service';
import { globalEventBus } from '@/core/event-bus';
import type { ChatMessage } from '@/domain/entities';

export interface ProcessTurnInput {
  sessionId: string;
  userMessageContent?: string;
  modelId?: string;
}

export interface ProcessTurnOutput {
  userMessage?: ChatMessage;
  assistantMessage: ChatMessage;
  totalTokens: number;
}

export class AIOrchestrator {
  public async processTurn(input: ProcessTurnInput): Promise<ProcessTurnOutput> {
    const { sessionId, userMessageContent, modelId } = input;

    // 1. Get Session & Active AI Persona
    const session = await globalChatService.getSession(sessionId);
    if (!session) throw new Error(`[AIOrchestrator] Session '${sessionId}' not found.`);

    const persona = await globalPersonaService.getPersona(session.characterId);
    const personaData = persona?.data;

    // Translation Middleware Setup
    const transSettings = session.translationSettings || {};
    const isTranslationActive = Boolean(transSettings.enabled);
    const userLang = transSettings.userLanguage || 'ru';
    const modelLang = transSettings.modelLanguage || 'en';
    const protectedTerms = [personaData?.name, session.title].filter(Boolean) as string[];
    const translateForModel = async (text?: string, sourceLang: string = 'auto'): Promise<string | undefined> => {
      if (!text?.trim() || !isTranslationActive || userLang === modelLang) return text;
      const result = await globalTranslationService.translate(text, {
        sourceLang,
        targetLang: modelLang,
        protectedTerms,
      });
      if (result.error) {
        throw new Error('Не удалось перевести контекст на язык модели. Запрос не был отправлен, чтобы не смешивать языки.');
      }
      return result.text;
    };

    // Fetch User Persona (Player identity)
    const userPersonaObj = session.userPersonaId
      ? await globalUserPersonaService.getUserPersona(session.userPersonaId)
      : await globalUserPersonaService.getDefaultUserPersona();

    const rawUserPersonaText = userPersonaObj
      ? `User Name: ${userPersonaObj.name}\nUser Description: ${userPersonaObj.description}`
      : undefined;
    const userPersonaText = await translateForModel(rawUserPersonaText);

    // 2. Add User Message to History (only if new user input provided)
    let userMessage: ChatMessage | undefined;
    if (userMessageContent && userMessageContent.trim()) {
      userMessage = await globalChatService.addMessage(sessionId, 'user', userMessageContent);
    }
    const history = await globalChatService.getMessages(sessionId);

    const targetMessageText = userMessageContent || history[history.length - 1]?.content || '';

    // If translation active, translate user message from RU -> EN for prompt context
    let promptTargetMessageText = targetMessageText;
    if (isTranslationActive && targetMessageText.trim()) {
      promptTargetMessageText = (await translateForModel(targetMessageText, userLang)) || targetMessageText;
    }

    // Search texts for Memory & Lorebook (check both raw user input & translated input)
    const searchTexts = [targetMessageText, promptTargetMessageText].filter(Boolean);

    // 3. Memory Engine: Retrieve relevant memories for THIS session
    const memories = await globalMemoryService.retrieveRelevantMemories(
      searchTexts,
      sessionId,
      4
    );
    const rawMemoryText = memories.map((m) => `[Memory]: ${m.content}`).join('\n');
    const memoryText = (await translateForModel(rawMemoryText)) || '';

    // 4. Lorebook Engine: Match active entries (safely deduplicate lorebook IDs)
    const combinedLorebookIds = Array.from(
      new Set((session.lorebookIds || []).concat(persona?.lorebookIds || []))
    );
    const lorebookEntries = await globalLorebookService.matchActiveEntries(
      searchTexts,
      combinedLorebookIds
    );
    const rawLorebookText = lorebookEntries.map((e) => `[World Entry]: ${e.content}`).join('\n');
    const lorebookText = (await translateForModel(rawLorebookText)) || '';

    // Prepare history messages: when translation is active, prefer original English response (textOriginal)
    const priorHistory = userMessage ? history.slice(0, -1) : history;
    const processedHistory: ChatMessage[] = isTranslationActive
      ? await Promise.all(priorHistory.map(async (msg) => {
          if (msg.role === 'assistant' && msg.textOriginal) {
            return { ...msg, content: msg.textOriginal };
          }
          return { ...msg, content: (await translateForModel(msg.content, msg.role === 'user' ? userLang : 'auto')) || msg.content };
        }))
      : priorHistory;

    const [systemInstructions, activePersona, translatedSummary, authorNotes] = await Promise.all([
      translateForModel(session.systemPromptOverride || personaData?.systemPrompt || ''),
      translateForModel(personaData
        ? `Character Name: ${personaData.name}\nDescription: ${personaData.description}\nPersonality: ${personaData.personality}\nScenario: ${personaData.scenario}`
        : undefined),
      translateForModel(session.summary || undefined),
      translateForModel(personaData?.postHistoryInstructions),
    ]);

    // 5. Prompt Pipeline: Build 13-stage neutral context with session-specific overrides
    const pipelineResult = await defaultPromptPipeline.buildContext({
      systemInstructions,
      userPersona: userPersonaText,
      activePersona,
      lorebookContent: lorebookText,
      longTermMemory: memoryText,
      summary: translatedSummary,
      authorNotes,
      conversationHistory: processedHistory,
      currentMessage: promptTargetMessageText,
    });

    // 6. Provider Adapter & AI Provider Execution using Session-level Generation Settings
    const genSettings = session.generationSettings || {};
    const selectedModel = genSettings.modelId || modelId || globalAIProviderService.getActiveModel();
    if (!selectedModel) {
      throw new Error('Модель не выбрана. Откройте «API Модели» и выберите реальную доступную модель.');
    }
    const selectedProvider = genSettings.providerId || globalAIProviderService.getActiveProviderId();

    const genResult = await globalAIProviderService.generate(pipelineResult.fullPrompt, {
      modelId: selectedModel,
      providerId: selectedProvider,
      temperature: genSettings.temperature ?? 0.75,
      maxTokens: genSettings.maxTokens ?? 2500,
      repetitionPenalty: genSettings.repetitionPenalty ?? 1.15,
      topP: genSettings.topP ?? 0.9,
      topK: genSettings.topK ?? 40,
      typicalP: genSettings.typicalP ?? 1.0,
      presencePenalty: genSettings.presencePenalty ?? 0.0,
      frequencyPenalty: genSettings.frequencyPenalty ?? 0.0,
      contextLimit: genSettings.contextLimit ?? 8192,
      stopSequences: Array.from(new Set(['\nUSER:', '\n### User:', '\n<|user|>', '\nUser:', ...(session.bannedWords || [])])),
    });

    // Translate Assistant Output if translation active: EN -> RU
    let assistantText = genResult.text;
    let originalAssistantText: string | undefined;
    let isTranslated = false;
    let translationError = false;

    if (isTranslationActive && genResult.text.trim()) {
      originalAssistantText = genResult.text;
      const trRes = await globalTranslationService.translate(genResult.text, {
        sourceLang: modelLang,
        targetLang: userLang,
        protectedTerms,
      });

      assistantText = trRes.text;
      isTranslated = !trRes.error;
      translationError = Boolean(trRes.error);
    }

    // 7. Save Assistant Message to History
    const assistantMessage = await globalChatService.addMessage(
      sessionId,
      'assistant',
      assistantText
    );

    // If translated, attach extra translation fields
    if (isTranslationActive && originalAssistantText) {
      assistantMessage.textOriginal = originalAssistantText;
      assistantMessage.sourceLang = modelLang;
      assistantMessage.isTranslated = isTranslated;
      assistantMessage.translationError = translationError;
      await globalChatService.updateMessage(assistantMessage);
    }

    // 8. Emit Orchestrator Event
    await globalEventBus.emit('orchestrator:turn_complete', {
      sessionId,
      userMessageId: userMessage?.id || '',
      assistantMessageId: assistantMessage.id,
      usageTokens: genResult.usageTokens,
    });

    return {
      userMessage,
      assistantMessage,
      totalTokens: pipelineResult.totalTokens,
    };
  }
}

export const globalAIOrchestrator = new AIOrchestrator();
