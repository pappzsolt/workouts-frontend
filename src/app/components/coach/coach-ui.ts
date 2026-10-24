/** A hét napjainak rövid neve (hétfőtől) fordítási kulcsként. */
export const WEEKDAY_KEYS = [
  'coachWorkspace.weekday.mon',
  'coachWorkspace.weekday.tue',
  'coachWorkspace.weekday.wed',
  'coachWorkspace.weekday.thu',
  'coachWorkspace.weekday.fri',
  'coachWorkspace.weekday.sat',
  'coachWorkspace.weekday.sun',
];

export const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', label: 'coachWorkspace.difficulty.BEGINNER' },
  { value: 'INTERMEDIATE', label: 'coachWorkspace.difficulty.INTERMEDIATE' },
  { value: 'ADVANCED', label: 'coachWorkspace.difficulty.ADVANCED' },
];

/** A kliens neve első betűje az avatárhoz. */
export function initial(name: string | null | undefined): string {
  return (name ?? '?').trim().charAt(0).toUpperCase() || '?';
}

/** Hibából megjeleníthető üzenet (backend üzenet vagy fordítási kulcs). */
export function errorText(error: unknown, fallbackKey: string): string {
  if (error && typeof error === 'object') {
    const httpError = error as { error?: { message?: unknown }; message?: unknown };
    if (httpError.error && typeof httpError.error.message === 'string' && httpError.error.message) {
      return httpError.error.message;
    }
    if (typeof httpError.message === 'string' && httpError.message && !httpError.message.startsWith('Http failure')) {
      return httpError.message;
    }
  }
  return fallbackKey;
}

/** Százalék 0–100, osztás nullával nélkül. */
export function percent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

/** Kód (pl. upper_legs) olvasható alakja, ha nincs rá fordítás. */
export function humanizeCode(code: string | null | undefined): string {
  if (!code) return '';
  const text = code.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Fordított címke egy kódhoz (pl. coachWorkspace.bodyPart.chest), különben a kód olvasható alakja. */
export function codeLabel(
  translate: { instant(key: string): string },
  prefix: string,
  code: string | null | undefined,
): string {
  if (!code) return '';
  const key = `${prefix}.${code}`;
  const text = translate.instant(key);
  return text && text !== key ? text : humanizeCode(code);
}

/** Excel-fájl neve a program és az ügyfél nevéből: ékezet és különleges karakter nélkül. */
export function programExportFileName(programName: string | null | undefined, clientName: string | null | undefined): string {
  const slug = (value: string | null | undefined) =>
    (value ?? '')
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .replace(/[^A-Za-z0-9._]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  const base = [slug(programName), slug(clientName)].filter(Boolean).join('-').slice(0, 120);
  return `${base || 'program'}.xlsx`;
}

/** Letölti a fájlt a böngészőben (ideiglenes hivatkozással, ami utána felszabadul). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
