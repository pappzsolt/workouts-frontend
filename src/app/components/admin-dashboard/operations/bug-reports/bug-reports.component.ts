import { Component, DestroyRef, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';

import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';
import type { BugReportDto, BugReportScreenshot } from '../../../../models/backend-dto/bug-report/bug-report';
import { BugReportService } from '../../../../services/bug-report/bug-report.service';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

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
  imports: [...SHARED_IMPORTS],
  templateUrl: './bug-reports.component.html',
})
export class BugReportsComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(BugReportService);
  private readonly listCancelled$ = new Subject<void>();

  readonly pageSizeOptions = [10, 20, 50];

  reports: BugReportDto[] = [];
  loading = false;
  message = '';
  currentPage = 1;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  /** Képernyőkép-előnézetek a képazonosító szerint. */
  previews: Record<number, Preview | undefined> = {};
  /** A nagyítva megnyitott kép. */
  zoomed: { report: BugReportDto; screenshot: BugReportScreenshot } | null = null;

  constructor() {
    this.load(1);
  }

  ngOnDestroy(): void {
    this.listCancelled$.next();
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
    this.releasePreviews();
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
          this.currentPage = result.page + 1;
          this.totalElements = result.totalElements;
          this.totalPages = result.totalPages;
          for (const report of this.reports) {
            for (const screenshot of report.screenshots) this.loadPreview(report, screenshot);
          }
        },
        error: (error) => {
          this.loading = false;
          this.reports = [];
          this.message = errorMessage(error, 'adminBugReports.errors.load');
        },
      });
  }

  private loadPreview(report: BugReportDto, screenshot: BugReportScreenshot): void {
    const preview: Preview = { url: null, loading: true, failed: false };
    this.previews[screenshot.id] = preview;
    this.service
      .screenshot(report.id, screenshot.id)
      .pipe(takeUntil(this.listCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          // Csak képként kezelhető tartalom kap URL-t (a szerver is csak PNG/JPEG-et ad).
          const type = blob.type === 'image/png' || blob.type === 'image/jpeg' ? blob.type : screenshot.contentType;
          preview.url = URL.createObjectURL(new Blob([blob], { type }));
          preview.loading = false;
        },
        error: () => {
          preview.loading = false;
          preview.failed = true;
        },
      });
  }

  private releasePreviews(): void {
    for (const preview of Object.values(this.previews)) {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    }
    this.previews = {};
  }
}
