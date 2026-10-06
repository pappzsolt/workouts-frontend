import { AppSearchComponent } from '../../../shared/components/app-search/app-search.component';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { LoginAuditAccountType, LoginAuditLogDto } from '../../../../models/backend-dto/admin/login-audit-log-dto';
import { LoginAuditLogsService } from '../../../../services/admin/login-audit-logs.service';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

interface LoginAuditFilters {
  accountType: '' | LoginAuditAccountType;
  accountId: number | null;
  username: string;
  from: string;
  to: string;
}

@Component({
  selector: 'app-login-audit-logs',
  standalone: true,
  imports: [AppSearchComponent, ...SHARED_IMPORTS],
  templateUrl: './login-audit-logs.component.html',
  styleUrls: ['./login-audit-logs.component.css'],
})
export class LoginAuditLogsComponent {
  private readonly destroyRef = inject(DestroyRef);

  logs: LoginAuditLogDto[] = [];
  loading = false;

  message = '';
  messageType: 'error' | 'info' | '' = '';

  currentPage = 1;
  pageSize = 50;
  totalElements = 0;
  totalPages = 0;

  readonly pageSizeOptions = [25, 50, 100, 200];

  filters: LoginAuditFilters = this.emptyFilters();

  constructor(private readonly loginAuditLogsService: LoginAuditLogsService) {
    this.loadPage(1);
  }

  applyFilters(): void {
    if (!this.validateFilters()) {
      return;
    }

    this.loadPage(1);
  }

  clearFilters(): void {
    this.filters = this.emptyFilters();
    this.loadPage(1);
  }

  onPageChange(page: number): void {
    this.loadPage(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.loadPage(1);
  }

  trackByLog(_: number, log: LoginAuditLogDto): number {
    return log.id;
  }

  private loadPage(page: number): void {
    this.loading = true;
    this.message = '';
    this.messageType = '';

    this.loginAuditLogsService
      .getLoginAuditLogs({
        page: page - 1,
        size: this.pageSize,
        accountType: this.filters.accountType || null,
        accountId: this.filters.accountId,
        username: this.filters.username,
        from: this.filters.from || null,
        to: this.filters.to || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.logs = result.content;
          this.currentPage = result.page + 1;
          this.pageSize = result.size;
          this.totalElements = result.totalElements;
          this.totalPages = result.totalPages;
          this.loading = false;
        },
        error: (error: Error) => {
          this.logs = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.message = error.message || 'adminLoginAudit.errors.load';
          this.messageType = 'error';
          this.loading = false;
        },
      });
  }

  private validateFilters(): boolean {
    if (this.filters.accountId != null && this.filters.accountId <= 0) {
      this.message = 'adminLoginAudit.errors.invalidAccountId';
      this.messageType = 'error';
      return false;
    }

    if (this.filters.from && this.filters.to && this.filters.from > this.filters.to) {
      this.message = 'adminLoginAudit.errors.invalidDateRange';
      this.messageType = 'error';
      return false;
    }

    return true;
  }

  private emptyFilters(): LoginAuditFilters {
    return {
      accountType: '',
      accountId: null,
      username: '',
      from: '',
      to: '',
    };
  }
}
