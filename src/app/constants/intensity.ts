import type { SelectOption } from '../models/common/select-option.model';

/**
 * Az edzés intenzitásának kanonikus értékei (workouts.intensity_level: LOW, MEDIUM,
 * HIGH vagy NULL). Az új edzés és a szerkesztés űrlapja is ezeket küldi.
 */
export type IntensityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const INTENSITY_OPTIONS: SelectOption<IntensityLevel>[] = [
  { value: 'LOW', label: 'intensity.LOW' },
  { value: 'MEDIUM', label: 'intensity.MEDIUM' },
  { value: 'HIGH', label: 'intensity.HIGH' },
];

/**
 * Régi értékeket (pl. "low", "Medium", "moderate", "INTERMEDIATE") a kanonikus
 * formára hoz; ismeretlen vagy üres érték esetén üres stringet ad vissza.
 */
export function normalizeIntensity(value: string | null | undefined): IntensityLevel | '' {
  const normalized = (value ?? '').trim().toUpperCase();
  if (normalized === 'LOW') return 'LOW';
  if (normalized === 'MEDIUM' || normalized === 'MODERATE' || normalized === 'INTERMEDIATE') return 'MEDIUM';
  if (normalized === 'HIGH') return 'HIGH';
  return '';
}

/** Megjelenítéshez a fordítási kulcs; ismeretlen értéknél üres string. */
export function intensityLabelKey(value: string | null | undefined): string {
  const level = normalizeIntensity(value);
  return level ? `intensity.${level}` : '';
}
