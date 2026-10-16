import type { NavigationError } from '@angular/router';

/**
 * Új verzió telepítése után a böngészőben még a régi index.html / main.js futhat, amely
 * a már nem létező lusta betöltésű chunkokra hivatkozik („error loading dynamically
 * imported module”). Ilyenkor egyszer újratöltjük az oldalt a kért címen, így a böngésző
 * az új verziót tölti be. Az ismételt újratöltést (végtelen ciklust) 10 mp-es zár védi.
 */
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk [\w-]+ failed/i;
const RELOAD_KEY = 'chunkReloadAt';

export function reloadOnChunkLoadError(event: NavigationError): void {
  const error = event.error as { message?: unknown } | undefined;
  const message = String(error?.message ?? event.error ?? '');
  if (!CHUNK_ERROR.test(message)) return;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // tiltott sessionStorage: ilyenkor is egyszer újratöltünk
  }
  window.location.assign(event.url);
}
