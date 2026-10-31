import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';

import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';
import type { RegistrationRequestDto, RegistrationStatus } from '../../../../models/backend-dto/registration/registration';
import type { SelectOption } from '../../../../models/common/select-option.model';
import { RegistrationRequestsService } from '../../../../services/admin/registration-requests.service';
import { UserEditService } from '../../../../services/admin/user-edit.service';
import { AppSelectComponent } from '../../../shared/components/app-select/app-select.component';
import { AppTextareaDirective } from '../../../shared/components/form-controls/app-textarea.directive';
import { AppHeadingDirective } from '../../../shared/components/app-page-header/app-page-header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';

/**
 * Regisztrációs kérelmek: függők jóváhagyása (ügyfélnél opcionálisan edzővel) vagy elutasítása,
 * valamint a már eldöntött kérelmek listája.
 */
@Component({
  selector: 'app-registration-requests',
  standalone: true,
  imports: [
    AppTextareaDirective,
    AppHeadingDirective,
    CommonModule,
    FormsModule,
    TranslatePipe,
    MessageComponent,
    PaginationComponent,
    AppIconComponent,
    AppSelectComponent,
  ],
  templateUrl: './registration-requests.component.html',
})
export class RegistrationRequestsComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(RegistrationRequestsService);
  private readonly members = inject(UserEditService);

  private readonly listLoadCancelled$ = new Subject<void>();

  readonly tabs: RegistrationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
  readonly pageSizeOptions = [10, 20, 50];

  status: RegistrationStatus = 'PENDING';
  requests: RegistrationRequestDto[] = [];
  loading = false;
  busyId: number | null = null;

  currentPage = 1;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  message = '';
  messageType: 'success' | 'error' | '' = '';

  coachOptions: SelectOption<number | null>[] = [{ value: null, label: 'adminRegistrations.noCoach' }];
  /** Jóváhagyáskor választott edző kérelmenként (csak ügyfél kérelemnél). */
  selectedCoach: Record<number, number | null> = {};
  /** Az elutasítás megerősítése alatt álló kérelem és indoklása. */
  rejectingId: number | null = null;
  rejectReason = '';

  constructor() {
    this.members
      .getCoaches()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (coaches) =>
          (this.coachOptions = [
            { value: null, label: 'adminRegistrations.noCoach' },
            ...coaches.map((coach) => ({ value: coach.id, label: coach.name })),
          ]),
        error: () => undefined,
      });
    this.load(1);
  }

  selectTab(status: RegistrationStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.cancelReject();
    this.message = '';
    this.load(1);
  }

  onPageChange(page: number): void {
    this.load(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.load(1);
  }

  approve(request: RegistrationRequestDto): void {
    if (this.busyId !== null) return;
    const coachId = request.accountType === 'USER' ? this.selectedCoach[request.id] ?? null : null;
    this.busyId = request.id;
    this.service
      .approve(request.id, coachId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (message) => this.afterDecision(message),
        error: (error) => this.failed(error, 'adminRegistrations.errors.approve'),
      });
  }

  startReject(request: RegistrationRequestDto): void {
    this.rejectingId = request.id;
    this.rejectReason = '';
  }

  cancelReject(): void {
    this.rejectingId = null;
    this.rejectReason = '';
  }

  confirmReject(request: RegistrationRequestDto): void {
    if (this.busyId !== null) return;
    const reason = this.rejectReason.trim();
    if (reason.length > 500) {
      this.showMessage('adminRegistrations.errors.reasonTooLong', 'error');
      return;
    }
    this.busyId = request.id;
    this.service
      .reject(request.id, reason || null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (message) => this.afterDecision(message),
        error: (error) => this.failed(error, 'adminRegistrations.errors.reject'),
      });
  }

  genderKey(gender: string | null): string {
    return gender === 'MALE' ? 'register.genderMale' : gender === 'FEMALE' ? 'register.genderFemale' : '';
  }

  private load(page: number): void {
    this.listLoadCancelled$.next();
    this.loading = true;
    this.requests = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.currentPage = page;
    this.service
      .list(this.status, page - 1, this.pageSize)
      .pipe(takeUntil(this.listLoadCancelled$), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.loading = false;
          this.requests = result.content;
          this.currentPage = result.page + 1;
          this.totalElements = result.totalElements;
          this.totalPages = result.totalPages;
          // Ha az utolsó elem is eltűnt az oldalról (döntés után), az előző oldal jön.
          if (this.requests.length === 0 && this.currentPage > 1 && this.totalPages > 0) {
            this.load(Math.min(this.currentPage - 1, this.totalPages));
          }
        },
        error: (error) => {
          this.loading = false;
          this.requests = [];
          this.showMessage(errorMessage(error, 'adminRegistrations.errors.load'), 'error');
        },
      });
  }

  private afterDecision(message: string): void {
    this.busyId = null;
    this.rejectingId = null;
    this.rejectReason = '';
    this.showMessage(message, 'success');
    this.load(this.currentPage);
  }

  private failed(error: unknown, fallback: string): void {
    this.busyId = null;
    this.showMessage(errorMessage(error, fallback), 'error');
    this.load(this.currentPage);
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
  }
}
