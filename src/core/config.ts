/**
 * Arcaneum Core Configuration Manager
 */

export interface ArcaneumConfig {
  appName: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  defaultProvider: string;
  defaultModel: string;
  storageVersion: number;
}

export const defaultConfig: ArcaneumConfig = {
  appName: 'Arcaneum OS',
  version: '0.1.0-pre-alpha',
  environment: (import.meta.env.MODE as ArcaneumConfig['environment']) || 'development',
  defaultProvider: 'ai-horde',
  defaultModel: '',
  storageVersion: 1,
};
