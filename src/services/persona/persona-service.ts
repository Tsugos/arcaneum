/**
 * Arcaneum Persona Service Manager
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/PERSONA_SYSTEM.md
 */

import type { Persona, PersonaType, PersonaData } from '@/domain/entities';
import { db } from '@/infrastructure/storage/db';
import { globalServiceRegistry } from '@/core/service-registry';

export class PersonaService {
  public async createPersona(persona: Omit<Persona, 'id'>): Promise<Persona> {
    const id = `persona_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPersona: Persona = {
      ...persona,
      id,
    };
    await db.personas.add(newPersona);
    return newPersona;
  }

  public async getPersona(id: string): Promise<Persona | undefined> {
    return db.personas.get(id);
  }

  public async getAllPersonas(): Promise<Persona[]> {
    return db.personas.toArray();
  }

  public async getPersonaBySource(source: string, sourceId: string): Promise<Persona | undefined> {
    const personas = await this.getAllPersonas();
    return personas.find((persona) => {
      const fields = persona.metadata.customFields;
      return fields?.source === source && fields?.sourceId === sourceId;
    });
  }

  public async getPersonasByType(type: PersonaType): Promise<Persona[]> {
    return db.personas.where('type').equals(type).toArray();
  }

  public async updatePersona(
    id: string,
    updates: {
      type?: PersonaType;
      data?: Partial<PersonaData>;
      lorebookIds?: string[];
      tags?: string[];
      metadata?: Partial<Persona['metadata']>;
    }
  ): Promise<Persona> {
    const existing = await this.getPersona(id);
    if (!existing) {
      throw new Error(`[PersonaService] Persona with id '${id}' not found.`);
    }

    const updated: Persona = {
      ...existing,
      type: updates.type || existing.type,
      data: {
        ...existing.data,
        ...updates.data,
      },
      lorebookIds: updates.lorebookIds !== undefined ? updates.lorebookIds : existing.lorebookIds,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        tags: updates.tags !== undefined ? updates.tags : existing.metadata.tags,
        version: existing.metadata.version + 1,
        updatedAt: Date.now(),
      },
    };

    await db.personas.put(updated);
    return updated;
  }

  public async deletePersona(id: string): Promise<void> {
    await db.personas.delete(id);
  }
}

export const globalPersonaService = new PersonaService();
globalServiceRegistry.register('PersonaService', globalPersonaService);
