import { Component, DestroyRef, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, Subscription, catchError, mergeMap, takeUntil, tap } from 'rxjs';

import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';
import type { BugReportDto, BugReportScreenshot } from '../../../../models/backend-dto/bug-report/bug-report';
import { BugReportService } from '../../../../services/bug-report/bug-report.service';
import { AppDialogComponent } from '../../../shared/components/app-dialog/app-dialog.component';
import { AppHeadingDirective } from '../../../shared/components/app-page-header/app-page-header.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { BugReportPreviewVisibleDirective } from './bug-report-preview-visible.directive';

const MAX_PARALLEL_PREVIEWS = 3;

interface PreviewRequest {
  report: BugReportDto;
  screenshot: BugReportScreenshot;
  preview: Preview;
}

interface Preview {
  url: string | null;
  loading: boolean;
  failed: boolean;
}

/**
 * Hibabejelentések (csak admin): ki küldte, mikor, a leírás, az oldal és a képernyőképek.
 * A képek hitelesített kéréssel, Blobként töltődnek be, és nagyítva is megnézhetők.
 */
@Component({
  selector: 'app-bug-reports',
  standalone: true,
  imports: [
    AppDialogComponent,
    AppHeadingDirective,
    CommonModule,
    TranslatePipe,
    MessageComponent,
    PaginationComponent,
    AppIconComponent,
    BugReportPreviewVisibleDirective,
  ],
  templateUrl: './bug-reports.component.html',
})
export class BugReportsComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(BugReportService);
  private readonly listCancelled$ = new Subject<void>();
  private readonly previewRequests$ = new Subject<PreviewRequest>();
  private previewSubscription: Subscription | null = null;

  readonly pageSizeOptions = [10, 20, 50];

  reports: BugReportDto[] = [];
  loading = false;
  message = '';
  currentPage = 1;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  /** Force reused thumbnail directives to observe again after pagination/reload. */
  previewRevision = 0;

  /** Képernyőkép-előnézetek a képazonosító szerint. */
  previews: Record<number, Preview | undefined> = {};
  /** A nagyítva megnyitott kép. */
  zoomed: { report: BugReportDto; screenshot: BugReportScreenshot } | null = null;

  constructor() {
    this.load(1);
  }

  ngOnDestroy(): void {
    this.listCancelled$.next();
    this.previewSubscription?.unsubscribe();
    this.releasePreviews();
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.load(1);
  }

  reload(): void {
    this.load(this.currentPage);
  }

  openScreenshot(report: BugReportDto, screenshot: BugReportScreenshot): void {
    if (this.previews[screenshot.id]?.url) this.zoomed = { report, screenshot };
  }

  closeScreenshot(): void {
    this.zoomed = null;
  }

  formatSize(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  private load(page: number): void {
    this.listCancelled$.next();
    // Unsubscribe before releasing object URLs; queued requests from the old page
    // must not start after pagination or reload.
    this.previewSubscription?.unsubscribe();
    this.releasePreviews();
    this.previewSubscription = this.previewRequests$.pipe(
      mergeMap(({ report, screenshot, preview }) =>
        this.service.screenshot(report.id, screenshot.id).pipe(
          tap(blob => {
            if (this.previews[screenshot.id] !== preview) return;
            // Preserve the existing PNG/JPEG fallback and blob URL lifecycle.
            const type = blob.type === 'image/png' || blob.type === 'image/jpeg' ? blob.type : screenshot.contentType;
            preview.url = URL.createObjectURL(new Blob([blob], { type }));
            preview.loading = false;
          }),
          catchError(() => {
            if (this.previews[screenshot.id] === preview) {
              preview.loading = false;
              preview.failed = true;
            }
            return EMPTY;
          }),
        ),
      MAX_PARALLEL_PREVIEWS),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
    this.zoomed = null;
    this.loading = true;
    this.message = '';
    this.currentPage = page;
    this.service
      .list(page - 1, this.pageSize)
      .pipe(takeUntil(this.listCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.loading = false;
          this.reports = result.content;
          ++this.previewRevision;
          this.currentPage = result.page + 1;
          this.totalElements = result.totalElements;
          this.totalPages = result.totalPages;
          // Preview requests are started by the visibility observer in the template.
        },
        error: (error) => {
          this.loading = false;
          this.reports = [];
          this.message = errorMessage(error, 'adminBugReports.errors.load');
        },
      });
  }

  /** Called when a thumbnail approaches the viewport. Duplicate events are harmless. */
  loadPreview(report: BugReportDto, screenshot: BugReportScreenshot): void {
    if (this.loading || !this.reports.includes(report) || this.previews[screenshot.id]) return;
    const preview: Preview = { url: null, loading: true, failed: false };
    this.previews[screenshot.id] = preview;
    this.previewRequests$.next({ report, screenshot, preview });
  }

  private releasePreviews(): void {
    for (const preview of Object.values(this.previews)) {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    }
    this.previews = {};
  }
}
