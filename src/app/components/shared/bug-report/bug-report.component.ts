import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { errorMessage } from '../../../models/backend-dto/common/api-response-message';
import { BUG_REPORT_LIMITS as L, type BugReportCreated } from '../../../models/backend-dto/bug-report/bug-report';
import { AuthService } from '../../../services/auth/auth.service';
import { BugReportService } from '../../../services/bug-report/bug-report.service';
import { AppFormValidationDirective } from '../components/form-controls/app-form-validation.directive';
import { AppInputDirective } from '../components/form-controls/app-input.directive';
import { AppTextareaDirective } from '../components/form-controls/app-textarea.directive';
import { AppHeadingDirective } from '../components/app-page-header/app-page-header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../components/message/message.component';
import { AppButtonComponent } from '../components/app-button/app-button.component';
import { FormFieldComponent } from '../components/form-field/form-field.component';
import { AppIconComponent } from '../components/app-icon/app-icon.component';

/** Alkalmazáson belüli útvonal (ugyanaz a szabály, mint a backendben). */
export const APP_PATH = /^\/(?!\/)[A-Za-z0-9\-._~/?#[\]@!$&'()*+,;=%:]*$/;

/** A szöveg szóközök nélküli hossza a megadott tartományban (a csak szóközből álló mező üres). */
export function trimmedLength(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const length = String(control.value ?? '').trim().length;
    if (length === 0) return null; // a kötelezőséget a required jelzi
    return length < min || length > max ? { trimmedLength: { min, max } } : null;
  };
}

/** Üres, vagy (szóközök nélkül) alkalmazáson belüli útvonal. */
export const appPathValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  return value === '' || APP_PATH.test(value) ? null : { appPath: true };
};

/** A fájl tartalma alapján: PNG vagy JPEG (a fájlnév és a böngésző által adott típus nem számít). */
export async function detectImageType(file: Blob): Promise<'image/png' | 'image/jpeg' | null> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (head.length >= 8 && png.every((byte, i) => head[i] === byte)) return 'image/png';
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  return null;
}

/** A proxy (nginx) 413-as válasza HTML; azt nem írjuk ki, helyette érthető üzenet jelenik meg. */
export function submitError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 413) return 'bugReport.errors.tooLarge';
  if (error instanceof HttpErrorResponse && typeof error.error === 'string') return 'bugReport.errors.submit';
  return errorMessage(error, 'bugReport.errors.submit');
}

interface Attachment {
  file: File;
  url: string;
  name: string;
  size: number;
}

/**
 * Hibabejelentő a felhasználói és az edzői felületen: rövid leírás, részletes leírás, az
 * oldal, ahol a hiba történt, és legfeljebb 3 képernyőkép (tallózás, behúzás vagy
 * vágólapról beillesztés). A bejelentőt és a dátumot a szerver rögzíti.
 */
@Component({
  selector: 'app-bug-report',
  standalone: true,
  imports: [
    AppFormValidationDirective,
    AppInputDirective,
    AppTextareaDirective,
    AppHeadingDirective,
    CommonModule,
    FormsModule,
    TranslatePipe,
    MessageComponent,
    AppButtonComponent,
    FormFieldComponent,
    AppIconComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './bug-report.component.html',
})
export class BugReportComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(BugReportService);
  private readonly router = inject(Router);

  readonly limits = L;
  readonly reporterName = inject(AuthService).getUserName();
  readonly today = new Date();

  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(L.titleMax), trimmedLength(L.titleMin, L.titleMax)]],
    description: ['', [Validators.required, Validators.maxLength(L.descriptionMax), trimmedLength(L.descriptionMin, L.descriptionMax)]],
    pageUrl: [this.previousPage(), [Validators.maxLength(L.pageUrlMax), appPathValidator]],
  });

  attachments: Attachment[] = [];
  fileError = '';
  fileErrorParams: Record<string, unknown> = {};
  dragging = false;
  submitted = false;
  sending = false;
  errorMessage = '';
  created: BugReportCreated | null = null;
  successMessage = '';

  ngOnDestroy(): void {
    this.clearAttachments();
  }

  get descriptionLength(): number {
    return this.form.controls.description.value.length;
  }

  fieldError(name: 'title' | 'description' | 'pageUrl'): string {
    const control = this.form.controls[name];
    if (!(control.touched || this.submitted) || !control.errors) return '';
    if (control.errors['trimmedLength']) return `bugReport.errors.${name}Length`;
    if (control.errors['appPath']) return 'bugReport.errors.pageUrl';
    return '';
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    void this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  /** Képernyőkép beillesztése a vágólapról (Ctrl+V); a szöveg beillesztését nem zavarja. */
  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    if (this.created) return;
    const images = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;
    event.preventDefault();
    void this.addFiles(images);
  }

  removeAttachment(index: number): void {
    const [removed] = this.attachments.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    this.fileError = '';
  }

  async addFiles(files: File[]): Promise<void> {
    this.fileError = '';
    for (const file of files) {
      if (this.attachments.length >= L.maxScreenshots) {
        this.setFileError('bugReport.errors.tooManyFiles', { max: L.maxScreenshots });
        return;
      }
      if (file.size > L.maxScreenshotBytes) {
        this.setFileError('bugReport.errors.fileTooLarge', { name: file.name, max: L.maxScreenshotBytes / 1024 / 1024 });
        continue;
      }
      const type = await detectImageType(file);
      if (!type) {
        this.setFileError('bugReport.errors.fileType', { name: file.name });
        continue;
      }
      // A megjelenítéshez csak a már ellenőrzött kép kap ideiglenes URL-t.
      const safe = new File([file], file.name || `screenshot.${type === 'image/png' ? 'png' : 'jpg'}`, { type });
      this.attachments.push({ file: safe, url: URL.createObjectURL(safe), name: safe.name, size: safe.size });
    }
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid || this.sending) {
      this.form.markAllAsTouched();
      if (this.form.invalid) this.errorMessage = 'bugReport.errors.fixFields';
      return;
    }
    const value = this.form.getRawValue();
    this.sending = true;
    this.service
      .submit({
        title: value.title.trim(),
        description: value.description.trim(),
        pageUrl: value.pageUrl.trim() || null,
        screenshots: this.attachments.map((a) => a.file),
      })
      .pipe(
        finalize(() => (this.sending = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ created, message }) => {
          this.created = created;
          this.successMessage = message;
          this.clearAttachments();
        },
        error: (error) => (this.errorMessage = submitError(error)),
      });
  }

  newReport(): void {
    this.created = null;
    this.successMessage = '';
    this.submitted = false;
    this.errorMessage = '';
    this.form.reset({ title: '', description: '', pageUrl: '' });
  }

  formatSize(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private setFileError(key: string, params: Record<string, unknown>): void {
    this.fileError = key;
    this.fileErrorParams = params;
  }

  private clearAttachments(): void {
    for (const attachment of this.attachments) URL.revokeObjectURL(attachment.url);
    this.attachments = [];
  }

  /** Az előző oldal az alkalmazásban (ahonnan a bejelentőt megnyitották), ha van. */
  private previousPage(): string {
    // A komponens a navigáció közben jön létre: az előző oldal a folyamatban lévő navigáció előzménye.
    const navigation = this.router.getCurrentNavigation() ?? this.router.lastSuccessfulNavigation;
    const previous = navigation?.previousNavigation?.finalUrl?.toString() ?? '';
    return previous && APP_PATH.test(previous) && !previous.includes('bug-report') && previous.length <= L.pageUrlMax
      ? previous
      : '';
  }
}
