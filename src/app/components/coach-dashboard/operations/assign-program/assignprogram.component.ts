import { AppSelectComponent } from '../../../shared/components/app-select/app-select.component';
import type { SelectOption } from '../../../../models/common/select-option.model';
import type { UserNameId } from '../../../../models/common/user-name-id.model';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { errorMessage } from '../../../../models/backend-dto/common/api-response-message';

import { Subject, Subscription, finalize, takeUntil } from 'rxjs';

import { AssignProgramService } from '../../../../services/coach/assign-program/assignprogram.service';
import { UserNameIdService } from '../../../../services/user/user-name-id.service';

import { LanguageService } from '../../../../services/shared/language.service';

import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-assignprogram',
  standalone: true,
  imports: [...SHARED_IMPORTS, CoachProgramSelectComponent, AppSelectComponent],
  templateUrl: './assignprogram.component.html',
  styleUrls: ['./assignprogram.component.css'],
})
export class AssignProgramComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  private assignService = inject(AssignProgramService);

  private userNameIdService = inject(UserNameIdService);

  private route = inject(ActivatedRoute);


  private languageService = inject(LanguageService);

  userId: number | null = null;
  usersReady = false;
  programReady = false;
  private usersRequest?: Subscription;
  private assignmentRequest?: Subscription;

  selectedProgramId?: number;
  assignedUserIds: number[] = [];
  assignmentStateReady = false;

  loading = false;

  message = '';

  success = false;
  messageType: 'success' | 'error' | 'info' = 'info';

  users: UserNameId[] = [];

  get userOptions(): SelectOption<number | null>[] {
    return this.users.map(user => ({ value: user.id, label: user.username }));
  }

  get selectedPairValid(): boolean {
    return this.usersReady && this.programReady && this.assignmentStateReady &&
      Number.isInteger(this.userId) && !!this.userId && this.userId > 0 &&
      Number.isInteger(this.selectedProgramId) && !!this.selectedProgramId && this.selectedProgramId > 0 &&
      this.users.some(user => user.id === this.userId);
  }

  get selectedPairAssigned(): boolean {
    return this.selectedPairValid && !!this.userId && this.assignedUserIds.includes(this.userId);
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const programId = params['programId'];

      const id = Number(programId);
      if (Number.isInteger(id) && id > 0) {
        this.onProgramSelected(id);
      } else {
        this.selectedProgramId = undefined;
        this.assignedUserIds = [];
        this.assignmentStateReady = false;
      }
    });

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadUsers();
    });
  }

  loadUsers(): void {
    this.usersRequest?.unsubscribe();
    this.usersReady = false;
    this.usersRequest = this.userNameIdService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (!response.success || !Array.isArray(response.data)) {
          this.users = [];
          this.message = response.message || 'assignProgram.loadUsersError';
          this.success = false;
          this.messageType = 'error';
          return;
        }
        this.users = response.data;
        this.usersReady = true;
        this.message = response.message || '';
        this.messageType = 'info';
        if (!this.users.some(user => user.id === this.userId)) this.userId = null;
      },

      error: error => {
        this.message = errorMessage(error, 'assignProgram.loadUsersError');

        this.success = false;
      this.messageType = 'error';

        this.users = [];
      },
    });
  }

  onProgramSelected(programId: number): void {
    if (!Number.isInteger(programId) || programId <= 0) {
      this.selectedProgramId = undefined;
      this.assignedUserIds = [];
      this.assignmentStateReady = false;
      return;
    }

    this.selectedProgramId = programId;
    this.loadAssignedUsers(programId);
  }

  private loadAssignedUsers(programId: number): void {
    this.assignmentRequest?.unsubscribe();
    this.assignmentStateReady = false;
    this.assignedUserIds = [];

    this.assignmentRequest = this.assignService.getAssignedUserIds(programId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (!response.success || !Array.isArray(response.data) ||
              response.data.some(id => !Number.isInteger(id) || id <= 0)) {
            this.message = response.message || 'assignProgram.error';
            this.success = false;
            this.messageType = 'error';
            return;
          }

          this.assignedUserIds = [...new Set(response.data)];
          this.assignmentStateReady = true;
        },
        error: error => {
          this.message = errorMessage(error, 'assignProgram.error');
          this.success = false;
          this.messageType = 'error';
        },
      });
  }

  assignProgram(): void {
    if (this.loading) return;
    if (!this.selectedPairValid || this.selectedPairAssigned ||
        this.userId === null || this.selectedProgramId === undefined) {
      this.message = 'assignProgram.selectUserAndProgram';

      this.success = false;
      this.messageType = 'error';

      return;
    }

    const userId = this.userId;
    const programId = this.selectedProgramId;

    this.loading = true;

    this.message = '';

    this.success = false;
    this.messageType = 'info';

    this.assignService.assignProgramToUser(userId, programId).pipe(
      finalize(() => { this.loading = false; }), takeUntil(this.destroy$),
    ).subscribe({
      next: (response) => {
        this.loading = false;

        this.success = response.success;
        this.messageType = response.success ? 'success' : 'error';

        this.message = response.message || (response.success ? 'assignProgram.success' : 'assignProgram.error');

        if (response.success && !this.assignedUserIds.includes(userId)) {
          this.assignedUserIds = [...this.assignedUserIds, userId];
        }
      },

      error: error => {
        this.loading = false;

        this.success = false;
      this.messageType = 'error';

        this.message = errorMessage(error, 'assignProgram.error');
      },
    });
  }

  revokeProgram(): void {
    if (this.loading || !this.selectedPairAssigned || !this.userId || !this.selectedProgramId) return;

    const userId = this.userId;
    const programId = this.selectedProgramId;

    this.loading = true;
    this.message = '';
    this.success = false;
    this.messageType = 'info';

    this.assignService.revokeProgramFromUser(userId, programId).pipe(
      finalize(() => { this.loading = false; }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: response => {
        this.success = response.success;
        this.messageType = response.success ? 'success' : 'error';
        this.message = response.message || (response.success ? 'common.remove' : 'assignProgram.error');

        if (response.success) {
          this.assignedUserIds = this.assignedUserIds.filter(id => id !== userId);
        }
      },
      error: error => {
        this.success = false;
        this.messageType = 'error';
        this.message = errorMessage(error, 'assignProgram.error');
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();

    this.destroy$.complete();
  }

  trackByUser(index: number, user: UserNameId): number {
    return user.id;
  }

}
