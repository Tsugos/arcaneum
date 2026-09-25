/**
 * Chat & Session Engine Service
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/SESSION_SYSTEM.md
 */

import type { Session, ChatMessage, MessageRole, SessionGenerationSettings, SessionThemeSettings } from '@/domain/entities';
import { db } from '@/infrastructure/storage/db';
import { globalServiceRegistry } from '@/core/service-registry';

export class ChatService {
  public async createSession(characterId: string, title?: string, userPersonaId?: string): Promise<Session> {
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const session: Session = {
      id,
      title: title || 'New Conversation',
      characterId,
      userPersonaId,
      createdAt: now,
      updatedAt: now,
      generationSettings: {
        temperature: 0.75,
        maxTokens: 2500,
        repetitionPenalty: 1.15,
        responseLengthPreset: 'standard',
      },
      lorebookIds: [],
    };
    await db.sessions.add(session);
    return session;
  }

  public async getSession(id: string): Promise<Session | undefined> {
    return db.sessions.get(id);
  }

  public async getAllSessions(): Promise<Session[]> {
    return db.sessions.orderBy('updatedAt').reverse().toArray();
  }

  public async updateSessionUserPersona(sessionId: string, userPersonaId: string): Promise<void> {
    await db.sessions.update(sessionId, { userPersonaId, updatedAt: Date.now() });
  }

  public async updateSessionGenerationSettings(
    sessionId: string,
    generationSettings: SessionGenerationSettings
  ): Promise<void> {
    const existing = await this.getSession(sessionId);
    if (!existing) return;

    await db.sessions.update(sessionId, {
      generationSettings: {
        ...existing.generationSettings,
        ...generationSettings,
      },
      updatedAt: Date.now(),
    });
  }

  public async updateSessionSummary(
    sessionId: string,
    summary: string,
    summaryUpdatedThrough?: number
  ): Promise<void> {
    await db.sessions.update(sessionId, {
      summary,
      ...(summaryUpdatedThrough !== undefined ? { summaryUpdatedThrough } : {}),
      updatedAt: Date.now(),
    });
  }

  public async updateSessionSystemPrompt(sessionId: string, systemPromptOverride: string): Promise<void> {
    await db.sessions.update(sessionId, { systemPromptOverride, updatedAt: Date.now() });
  }

  public async updateSessionBannedWords(sessionId: string, bannedWords: string[]): Promise<void> {
    await db.sessions.update(sessionId, { bannedWords, updatedAt: Date.now() });
  }

  public async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return db.messages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('timestamp');
  }

  public async addMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    swipes?: string[]
  ): Promise<ChatMessage> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msg: ChatMessage = {
      id,
      sessionId,
      role,
      content,
      timestamp: Date.now(),
      tokensCount: Math.ceil(content.length / 4),
      swipes: swipes || [content],
      currentSwipeIndex: 0,
    };
    await db.messages.add(msg);

    // Update session timestamp
    await db.sessions.update(sessionId, { updatedAt: Date.now() });

    return msg;
  }

  public async deleteMessage(sessionId: string, messageId: string): Promise<void> {
    await db.messages.delete(messageId);
    await db.sessions.update(sessionId, { updatedAt: Date.now() });
  }

  public async updateMessageContent(
    sessionId: string,
    messageId: string,
    content: string
  ): Promise<ChatMessage> {
    const msg = await db.messages.get(messageId);
    if (!msg) throw new Error(`Message with id '${messageId}' not found.`);

    const updated: ChatMessage = {
      ...msg,
      content,
      tokensCount: Math.ceil(content.length / 4),
    };
    await db.messages.put(updated);
    await db.sessions.update(sessionId, { updatedAt: Date.now() });
    return updated;
  }

  public async updateSwipe(
    messageId: string,
    swipes: string[],
    currentSwipeIndex: number
  ): Promise<ChatMessage> {
    const msg = await db.messages.get(messageId);
    if (!msg) throw new Error(`Message with id '${messageId}' not found.`);

    const newContent = swipes[currentSwipeIndex] || msg.content;
    const updated: ChatMessage = {
      ...msg,
      content: newContent,
      swipes,
      currentSwipeIndex,
    };
    await db.messages.put(updated);
    return updated;
  }

  public async updateSessionThemeSettings(
    sessionId: string,
    themeSettings: Partial<SessionThemeSettings>
  ): Promise<Session> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found.`);

    const updated: Session = {
      ...session,
      themeSettings: {
        ...session.themeSettings,
        ...themeSettings,
      },
      updatedAt: Date.now(),
    };
    await db.sessions.put(updated);
    return updated;
  }

  public async updateSessionTitle(
    sessionId: string,
    title: string
  ): Promise<Session> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found.`);

    const updated: Session = {
      ...session,
      title: title.trim(),
      updatedAt: Date.now(),
    };
    await db.sessions.put(updated);
    return updated;
  }

  public async updateSessionLorebookIds(
    sessionId: string,
    lorebookIds: string[]
  ): Promise<Session> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found.`);

    const updated: Session = {
      ...session,
      lorebookIds,
      updatedAt: Date.now(),
    };
    await db.sessions.put(updated);
    return updated;
  }

  public async updateSessionTranslationSettings(
    sessionId: string,
    translationSettings: Record<string, any>
  ): Promise<Session> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session '${sessionId}' not found.`);

    const updated: Session = {
      ...session,
      translationSettings: {
        ...(session.translationSettings || {}),
        ...translationSettings,
      },
      updatedAt: Date.now(),
    };
    await db.sessions.put(updated);
    return updated;
  }

  public async updateMessage(message: ChatMessage): Promise<ChatMessage> {
    await db.messages.put(message);
    return message;
  }

  public async deleteSession(id: string): Promise<void> {
    await db.messages.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  }
}

export const globalChatService = new ChatService();
globalServiceRegistry.register('ChatService', globalChatService);
