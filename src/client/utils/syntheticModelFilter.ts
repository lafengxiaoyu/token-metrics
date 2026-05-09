const SYNTHETIC_MODEL_NAMES = new Set(['synthetic', '<synthetic>']);

export function isSyntheticModel(model: string | null | undefined): boolean {
  if (!model) return false;
  const normalized = model.trim().toLowerCase();
  return SYNTHETIC_MODEL_NAMES.has(normalized);
}

export function filterSyntheticModels<T extends { modelName: string }>(items: T[]): T[]{
  return items.filter(item => !isSyntheticModel(item.modelName));
}
