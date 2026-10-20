/**
 * Gyakorlatképek közös kezelése.
 *
 * Az `exercises.image_url` egy JSON-tömb a képfájlok nevével
 * (pl. `["squat-start.webp", "squat-peak.webp"]`), a fájlok a
 * `public/assets/images/flat` mappában vannak. Régi adatoknál előfordulhat
 * sima URL vagy egyetlen fájlnév is, ezt is elfogadjuk.
 *
 * Ha egy fájl nem tölthető be (pl. hiányzik az assetek közül), a komponens a
 * `markExerciseImageBroken`-nel jelzi, és onnantól kimarad a listából, így a
 * felület a „nincs kép” nézetet mutatja törött kép helyett.
 */

const IMAGE_BASE_PATH = '/assets/images/flat/';

const brokenImageSources = new Set<string>();

export function exerciseImageFiles(imageUrl: string | null | undefined): string[] {
  const value = imageUrl?.trim();
  if (!value) {
    return [];
  }

  if (value.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
        : [];
    } catch {
      return [];
    }
  }

  return [value];
}

export function exerciseImageSource(file: string): string {
  return /^(https?:)?\/\//.test(file) || file.startsWith('/') ? file : IMAGE_BASE_PATH + file;
}

/** A betölthető képek teljes útvonala; a már hibásnak jelzettek kimaradnak. */
export function exerciseImageSources(imageUrl: string | null | undefined): string[] {
  return exerciseImageFiles(imageUrl)
    .map(exerciseImageSource)
    .filter((source) => !brokenImageSources.has(source));
}

export function markExerciseImageBroken(source: string): void {
  brokenImageSources.add(source);
}
