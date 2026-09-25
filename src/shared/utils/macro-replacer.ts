/**
 * Arcaneum Macro Replacer Utility
 * Replaces {{char}} with active character name and {{user}} with active user persona name.
 */
export function substituteMacros(
  text: string | undefined | null,
  charName: string = 'Персонаж',
  userName: string = 'User'
): string {
  if (!text) return '';
  return text
    .replace(/\{\{char\}\}/gi, charName)
    .replace(/\{\{user\}\}/gi, userName);
}
