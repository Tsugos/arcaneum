export interface ModelFilterSettings {
  requireNsfw: boolean;
  requireRussian: boolean;
}

const STORAGE_KEY = 'arcaneum_model_filters';
const DEFAULTS: ModelFilterSettings = { requireNsfw: false, requireRussian: false };

export function getModelFilterSettings(): ModelFilterSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      requireNsfw: parsed.requireNsfw === true,
      requireRussian: parsed.requireRussian === true,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveModelFilterSettings(settings: ModelFilterSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('arcaneum:model-filters-changed', { detail: settings }));
}

export function modelMatchesFilters(
  model: { isNsfw?: boolean; supportsRussian?: boolean },
  settings: ModelFilterSettings
): boolean {
  if (settings.requireNsfw && model.isNsfw !== true) return false;
  if (settings.requireRussian && model.supportsRussian !== true) return false;
  return true;
}
