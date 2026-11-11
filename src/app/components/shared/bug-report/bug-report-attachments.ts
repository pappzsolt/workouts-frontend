import { BUG_REPORT_LIMITS as L } from '../../../models/backend-dto/bug-report/bug-report';

export interface BugReportAttachment {
  file: File;
  url: string;
  name: string;
  size: number;
}

/** A fájl tartalma alapján: PNG vagy JPEG (a fájlnév és a böngésző által adott típus nem számít). */
export async function detectImageType(file: Blob): Promise<'image/png' | 'image/jpeg' | null> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (head.length >= 8 && png.every((byte, i) => head[i] === byte)) return 'image/png';
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  return null;
}

/** File validation and blob URL ownership for one report form. */
export class BugReportAttachments {
  private readonly attachments: BugReportAttachment[] = [];
  private generation = 0;
  private destroyed = false;
  error = '';
  errorParams: Record<string, unknown> = {};

  get items(): readonly BugReportAttachment[] { return this.attachments; }

  async add(files: readonly File[]): Promise<void> {
    if (this.destroyed) return;
    const generation = this.generation;
    this.error = '';
    for (const file of files) {
      if (!this.isCurrent(generation)) return;
      if (this.atCapacity()) return;
      if (file.size > L.maxScreenshotBytes) {
        this.setError('bugReport.errors.fileTooLarge', { name: file.name, max: L.maxScreenshotBytes / 1024 / 1024 });
        continue;
      }
      let type: 'image/png' | 'image/jpeg' | null;
      try {
        type = await detectImageType(file);
      } catch {
        if (!this.isCurrent(generation)) return;
        this.setError('bugReport.errors.fileType', { name: file.name });
        continue;
      }
      if (!this.isCurrent(generation)) return;
      if (!type) {
        this.setError('bugReport.errors.fileType', { name: file.name });
        continue;
      }
      // Another file picker/drop/paste can fill the last slot while bytes are read.
      if (this.atCapacity()) return;
      const safe = new File([file], file.name || `screenshot.${type === 'image/png' ? 'png' : 'jpg'}`, { type });
      this.attachments.push({ file: safe, url: URL.createObjectURL(safe), name: safe.name, size: safe.size });
    }
  }

  remove(index: number): void {
    const [removed] = this.attachments.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    this.error = '';
  }

  clear(): void {
    this.generation++;
    for (const attachment of this.attachments) URL.revokeObjectURL(attachment.url);
    this.attachments.length = 0;
  }

  destroy(): void {
    this.destroyed = true;
    this.clear();
  }

  private isCurrent(generation: number): boolean {
    return !this.destroyed && generation === this.generation;
  }

  private atCapacity(): boolean {
    if (this.attachments.length < L.maxScreenshots) return false;
    this.setError('bugReport.errors.tooManyFiles', { max: L.maxScreenshots });
    return true;
  }

  private setError(key: string, params: Record<string, unknown>): void {
    this.error = key;
    this.errorParams = params;
  }
}
