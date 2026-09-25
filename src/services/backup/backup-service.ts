/**
 * Backup, Sync & Snapshot Engine Service
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/SYNC_AND_BACKUP.md
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/IMPORT_EXPORT_SYSTEM.md
 */

import type { 
  Persona, 
  UserPersona,
  Lorebook, 
  Session, 
  ChatMessage, 
  MemoryRecord, 
  AIProviderConfig 
} from '@/domain/entities';
import { db } from '@/infrastructure/storage/db';
import { globalServiceRegistry } from '@/core/service-registry';

export interface ArcaneumWorkspacePackage {
  format: 'arcaneum_workspace_v1';
  version: string;
  timestamp: number;
  data: {
    personas: Persona[];
    userPersonas?: UserPersona[];
    lorebooks: Lorebook[];
    sessions: Session[];
    messages: ChatMessage[];
    memories: MemoryRecord[];
    providers: AIProviderConfig[];
  };
}

export class BackupService {
  public async exportWorkspace(): Promise<ArcaneumWorkspacePackage> {
    const personas = await db.personas.toArray();
    const userPersonas = await db.userPersonas.toArray();
    const lorebooks = await db.lorebooks.toArray();
    const sessions = await db.sessions.toArray();
    const messages = await db.messages.toArray();
    const memories = await db.memories.toArray();
    const providers = await db.providers.toArray();

    return {
      format: 'arcaneum_workspace_v1',
      version: '0.1.0',
      timestamp: Date.now(),
      data: {
        personas,
        userPersonas,
        lorebooks,
        sessions,
        messages,
        memories,
        providers,
      },
    };
  }

  public async importWorkspace(pkg: ArcaneumWorkspacePackage): Promise<void> {
    if (!pkg || pkg.format !== 'arcaneum_workspace_v1') {
      throw new Error('Некорректный формат файла резервной копии Arcaneum Workspace');
    }

    if (!pkg.data) {
      throw new Error('Пакет резервной копии не содержит данных');
    }

    // Clear existing DB tables safely
    await db.transaction('rw', [db.personas, db.userPersonas, db.lorebooks, db.sessions, db.messages, db.memories, db.providers], async () => {
      await db.personas.clear();
      await db.userPersonas.clear();
      await db.lorebooks.clear();
      await db.sessions.clear();
      await db.messages.clear();
      await db.memories.clear();
      await db.providers.clear();

      if (pkg.data.personas?.length) await db.personas.bulkAdd(pkg.data.personas);
      if (pkg.data.userPersonas?.length) await db.userPersonas.bulkAdd(pkg.data.userPersonas);
      if (pkg.data.lorebooks?.length) await db.lorebooks.bulkAdd(pkg.data.lorebooks);
      if (pkg.data.sessions?.length) await db.sessions.bulkAdd(pkg.data.sessions);
      if (pkg.data.messages?.length) await db.messages.bulkAdd(pkg.data.messages);
      if (pkg.data.memories?.length) await db.memories.bulkAdd(pkg.data.memories);
      if (pkg.data.providers?.length) await db.providers.bulkAdd(pkg.data.providers);
    });
  }

  public async getStorageStats() {
    const personasCount = await db.personas.count();
    const userPersonasCount = await db.userPersonas.count();
    const lorebooksCount = await db.lorebooks.count();
    const sessionsCount = await db.sessions.count();
    const messagesCount = await db.messages.count();
    const memoriesCount = await db.memories.count();

    return {
      personasCount,
      userPersonasCount,
      lorebooksCount,
      sessionsCount,
      messagesCount,
      memoriesCount,
    };
  }
}

export const globalBackupService = new BackupService();
globalServiceRegistry.register('BackupService', globalBackupService);
