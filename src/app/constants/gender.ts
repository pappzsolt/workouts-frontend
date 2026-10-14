import type { SelectOption } from '../models/common/select-option.model';

/**
 * A backend és az adatbázis kanonikus nem-értékei (users.gender CHECK:
 * MALE, FEMALE vagy NULL). Minden űrlap ugyanezeket az értékeket küldi.
 */
export type Gender = 'MALE' | 'FEMALE';

export const GENDER_OPTIONS: SelectOption[] = [
  { value: 'MALE', label: 'common.male' },
  { value: 'FEMALE', label: 'common.female' },
];

/** Üres választás felirata ("nincs megadva"); értéke üres string → backend: NULL. */
export const GENDER_NOT_SPECIFIED_LABEL = 'common.genderNotSpecified';

/**
 * Régi vagy kézzel bevitt értékeket (pl. "male", " Female ") a kanonikus
 * formára hoz. Ismeretlen értéknél üres stringet ad vissza, így a választó
 * "nincs megadva" állapotban jelenik meg, és nem küld érvénytelen értéket.
 */
export function normalizeGender(value: string | null | undefined): Gender | '' {
  const normalized = (value ?? '').trim().toUpperCase();
  return normalized === 'MALE' || normalized === 'FEMALE' ? normalized : '';
}
