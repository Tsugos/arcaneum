import { describe, it, expect } from 'vitest';
import { AIOrchestrator } from '@/core/ai-orchestrator';
import { globalChatService } from '@/services/chat/chat-service';
import { globalPersonaService } from '@/services/persona/persona-service';

describe('AI Orchestrator Engine', () => {
  it('should execute end-to-end turn lifecycle cleanly', async () => {
    // 1. Setup persona & session
    const persona = await globalPersonaService.createPersona({
      type: 'character',
      data: {
        name: 'Elena',
        summary: 'A scholar of ancient relics',
        description: 'Elena is a quiet librarian.',
        personality: 'Quiet, observant, smart',
        scenario: 'Reading room',
        firstMessage: 'Hello traveler.',
        alternateGreetings: [],
        mesExample: '',
      },
      metadata: { creator: 'Test', version: 1, tags: [], createdAt: Date.now(), updatedAt: Date.now() },
      lorebookIds: [],
    });

    const session = await globalChatService.createSession(persona.id, 'Test Conversation');

    // 2. Process orchestrator turn
    const orchestrator = new AIOrchestrator();
    const result = await orchestrator.processTurn({
      sessionId: session.id,
      userMessageContent: 'What are you reading today?',
      modelId: 'test-model',
    });

    expect(result.userMessage?.content).toBe('What are you reading today?');
    expect(result.assistantMessage.role).toBe('assistant');
    expect(result.assistantMessage.content).toBeDefined();

    // 3. Verify messages saved to database
    const history = await globalChatService.getMessages(session.id);
    expect(history.length).toBe(2);
  });
});
