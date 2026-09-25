/**
 * User Persona Service Manager
 * Manages player/user identities (Avatar, Name, Description) passed into Prompt Pipeline Stage 2
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/PERSONA_IDENTITY.md
 */

import type { UserPersona } from '@/domain/entities';
import { db } from '@/infrastructure/storage/db';
import { globalServiceRegistry } from '@/core/service-registry';

export class UserPersonaService {
  public async createUserPersona(
    name: string,
    description: string,
    avatarUrl?: string,
    isDefault?: boolean
  ): Promise<UserPersona> {
    const id = `user_persona_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    // If setting as default, unset previous default
    if (isDefault) {
      await this.clearDefault();
    }

    const newPersona: UserPersona = {
      id,
      name,
      description,
      avatarUrl,
      isDefault: !!isDefault,
      createdAt: now,
      updatedAt: now,
    };

    await db.userPersonas.add(newPersona);
    return newPersona;
  }

  public async getUserPersona(id: string): Promise<UserPersona | undefined> {
    return db.userPersonas.get(id);
  }

  public async getAllUserPersonas(): Promise<UserPersona[]> {
    return db.userPersonas.orderBy('updatedAt').reverse().toArray();
  }

  public async getDefaultUserPersona(): Promise<UserPersona | undefined> {
    const all = await this.getAllUserPersonas();
    return all.find((p) => Boolean(p.isDefault));
  }

  public async updateUserPersona(
    id: string,
    updates: Partial<Omit<UserPersona, 'id' | 'createdAt'>>
  ): Promise<UserPersona> {
    const existing = await this.getUserPersona(id);
    if (!existing) {
      throw new Error(`[UserPersonaService] User Persona '${id}' not found.`);
    }

    if (updates.isDefault) {
      await this.clearDefault();
    }

    const updated: UserPersona = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.userPersonas.put(updated);
    return updated;
  }

  public async deleteUserPersona(id: string): Promise<void> {
    await db.userPersonas.delete(id);
    const linkedSessions = await db.sessions.where('userPersonaId').equals(id).toArray();
    for (const session of linkedSessions) {
      await db.sessions.update(session.id, { userPersonaId: undefined, updatedAt: Date.now() });
    }
  }

  public async setDefaultUserPersona(id: string): Promise<UserPersona> {
    await this.clearDefault();
    return this.updateUserPersona(id, { isDefault: true });
  }

  public async unsetDefaultUserPersona(id: string): Promise<UserPersona> {
    return this.updateUserPersona(id, { isDefault: false });
  }

  private async clearDefault(): Promise<void> {
    const all = await db.userPersonas.toArray();
    const defaults = all.filter((p) => Boolean(p.isDefault));
    for (const d of defaults) {
      await db.userPersonas.update(d.id, { isDefault: false });
    }
  }
}

export const globalUserPersonaService = new UserPersonaService();
globalServiceRegistry.register('UserPersonaService', globalUserPersonaService);
