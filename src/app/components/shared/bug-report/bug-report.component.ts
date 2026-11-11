import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { errorMessage } from '../../../models/backend-dto/common/api-response-message';
import { BugReportAttachments } from './bug-report-attachments';
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

export { detectImageType } from './bug-report-attachments';

/** A proxy (nginx) 413-as válasza HTML; azt nem írjuk ki, helyette érthető üzenet jelenik meg. */
export function submitError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 413) return 'bugReport.errors.tooLarge';
  if (error instanceof HttpErrorResponse && typeof error.error === 'string') return 'bugReport.errors.submit';
  return errorMessage(error, 'bugReport.errors.submit');
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

  private readonly attachmentStore = new BugReportAttachments();
  get attachments() { return this.attachmentStore.items; }
  get fileError(): string { return this.attachmentStore.error; }
  get fileErrorParams(): Record<string, unknown> { return this.attachmentStore.errorParams; }
  dragging = false;
  submitted = false;
  sending = false;
  errorMessage = '';
  created: BugReportCreated | null = null;
  successMessage = '';

  ngOnDestroy(): void {
    this.attachmentStore.destroy();
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
    this.attachmentStore.remove(index);
  }

  addFiles(files: File[]): Promise<void> {
    return this.attachmentStore.add(files);
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

  private clearAttachments(): void {
    this.attachmentStore.clear();
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
