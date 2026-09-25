/**
 * Character Domain Entity Definitions
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/DOMAIN_MODEL.md
 * @see file:///c:/Users/reali/Documents/antigravity/resilient-bohr/PERSONA_SYSTEM.md
 */

export interface CharacterPersona {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  alternateGreetings: string[];
  mesExample: string;
  systemPrompt?: string;
  postHistoryInstructions?: string;
}

export interface CharacterMetadata {
  creator: string;
  characterVersion: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  avatarUrl?: string;
}

export interface Character {
  id: string;
  name: string;
  persona: CharacterPersona;
  metadata: CharacterMetadata;
  lorebookIds: string[];
}
