/**
 * Arcaneum 13-Stage Neutral Prompt Pipeline
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/PROMPT_PIPELINE.md
 */

import type { ChatMessage } from '@/domain/entities';

export interface PromptStageOutput {
  stageName: string;
  order: number;
  content: string;
  tokensCount: number;
}

export interface PromptPipelineInput {
  systemInstructions?: string;
  userPersona?: string;
  activePersona?: string;
  sessionRules?: string;
  lorebookContent?: string;
  longTermMemory?: string;
  shortTermMemory?: string;
  summary?: string;
  authorNotes?: string;
  dynamicContext?: string;
  conversationHistory: ChatMessage[];
  currentMessage: string;
}

export interface PromptPipelineResult {
  fullPrompt: string;
  stages: PromptStageOutput[];
  totalTokens: number;
}

export class PromptPipeline {
  /**
   * Simple token estimation (approx 4 chars per token)
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  public async buildContext(input: PromptPipelineInput): Promise<PromptPipelineResult> {
    const stages: PromptStageOutput[] = [];

    const addStage = (order: number, stageName: string, content?: string) => {
      if (!content || !content.trim()) return;
      const cleanContent = content.trim();
      stages.push({
        order,
        stageName,
        content: cleanContent,
        tokensCount: this.estimateTokens(cleanContent),
      });
    };

    // 1. System Instructions
    addStage(1, 'System Instructions', input.systemInstructions);

    // 2. User Persona
    addStage(2, 'User Persona', input.userPersona);

    // 3. Active Persona
    addStage(3, 'Active Persona', input.activePersona);

    // 4. Session Rules
    addStage(4, 'Session Rules', input.sessionRules);

    // 5. Lorebook
    addStage(5, 'Lorebook Entries', input.lorebookContent);

    // 6. Long-Term Memory
    addStage(6, 'Long-Term Memory', input.longTermMemory);

    // 7. Short-Term Memory
    addStage(7, 'Short-Term Memory', input.shortTermMemory);

    // 8. Summary
    addStage(8, 'Summary', input.summary);

    // 9. Author Notes
    addStage(9, 'Author Notes', input.authorNotes);

    // 10. Dynamic Context
    addStage(10, 'Dynamic Context', input.dynamicContext);

    // 11. Current Conversation
    const historyText = input.conversationHistory
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
    addStage(11, 'Current Conversation History', historyText);

    // 12. User Message
    addStage(12, 'User Message', `USER: ${input.currentMessage}`);

    // Sort by stage order
    stages.sort((a, b) => a.order - b.order);

    const fullPrompt = stages.map((s) => `--- [${s.stageName}] ---\n${s.content}`).join('\n\n');
    const totalTokens = stages.reduce((acc, curr) => acc + curr.tokensCount, 0);

    return {
      fullPrompt,
      stages,
      totalTokens,
    };
  }
}

export const defaultPromptPipeline = new PromptPipeline();
