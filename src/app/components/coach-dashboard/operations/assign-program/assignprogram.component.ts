import type { UserNameId } from '../../../../models/common/user-name-id.model';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { Subject, Subscription, finalize, takeUntil } from 'rxjs';

import { AssignProgramService } from '../../../../services/coach/assign-program/assignprogram.service';
import { UserNameIdService } from '../../../../services/user/user-name-id.service';

import { LanguageService } from '../../../../services/shared/language.service';

import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-assignprogram',
  standalone: true,
  imports: [...SHARED_IMPORTS, CoachProgramSelectComponent],
  templateUrl: './assignprogram.component.html',
  styleUrls: ['./assignprogram.component.css'],
})
export class AssignProgramComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  private assignService = inject(AssignProgramService);

  private userNameIdService = inject(UserNameIdService);

  private route = inject(ActivatedRoute);

  private translate = inject(TranslateService);

  private languageService = inject(LanguageService);

  userId: number | null = null;
  usersReady = false;
  programReady = false;
  private usersRequest?: Subscription;

  selectedProgramId?: number;

  loading = false;

  message = '';

  success = false;

  users: UserNameId[] = [];

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const programId = params['programId'];

      const id = Number(programId);
      this.selectedProgramId = Number.isInteger(id) && id > 0 ? id : undefined;
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
          this.users = []; this.message = response.message || this.translate.instant('assignProgram.loadUsersError');
          this.success = false; return;
        }
        this.users = response.data;
        this.usersReady = true;
        if (!this.users.some(user => user.id === this.userId)) this.userId = null;
      },

      error: () => {
        this.message = this.translate.instant('assignProgram.loadUsersError');

        this.success = false;

        this.users = [];
      },
    });
  }

  assignProgram(): void {
    if (this.loading) return;
    if (!this.usersReady || !this.programReady || !Number.isInteger(this.userId) || !this.userId || this.userId <= 0 ||
        !Number.isInteger(this.selectedProgramId) || !this.selectedProgramId || this.selectedProgramId <= 0 ||
        !this.users.some(user => user.id === this.userId)) {
      this.message = this.translate.instant('assignProgram.selectUserAndProgram');

      this.success = false;

      return;
    }

    this.loading = true;

    this.message = '';

    this.success = false;

    this.assignService.assignProgramToUser(this.userId, this.selectedProgramId).pipe(
      finalize(() => { this.loading = false; }), takeUntil(this.destroy$),
    ).subscribe({
      next: (response) => {
        this.loading = false;

        this.success = response.success;

        this.message = response.message || this.translate.instant(response.success ? 'assignProgram.success' : 'assignProgram.error');
      },

      error: () => {
        this.loading = false;

        this.success = false;

        this.message = this.translate.instant('assignProgram.error');
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
