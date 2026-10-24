/** Excel-fájl neve a program és a felhasználó nevéből: ékezet és különleges karakter nélkül. */
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
