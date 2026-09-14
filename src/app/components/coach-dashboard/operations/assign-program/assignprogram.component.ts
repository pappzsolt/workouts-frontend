import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { Subject, takeUntil } from 'rxjs';

import { AssignProgramService } from '../../../../services/coach/assign-program/assignprogram.service';
import { UserNameIdService, UserNameId } from '../../../../services/user/user-name-id.service';

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

  userId!: number;

  selectedProgramId!: number;

  loading = false;

  message = '';

  success = false;

  users: UserNameId[] = [];

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const programId = params['programId'];

      if (programId) {
        this.selectedProgramId = Number(programId);

        console.log('Automatikusan kiválasztott program ID:', this.selectedProgramId);
      }
    });

    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadUsers();
    });
  }

  loadUsers(): void {
    this.userNameIdService.getAllUsers().subscribe({
      next: (response) => {
        this.users = response.data ?? [];
      },

      error: () => {
        this.message = this.translate.instant('assignProgram.loadUsersError');

        this.success = false;

        this.users = [];
      },
    });
  }

  assignProgram(): void {
    if (!this.userId || !this.selectedProgramId) {
      this.message = this.translate.instant('assignProgram.selectUserAndProgram');

      this.success = false;

      return;
    }

    this.loading = true;

    this.message = '';

    this.success = false;

    this.assignService.assignProgramToUser(this.userId, this.selectedProgramId).subscribe({
      next: (response) => {
        this.loading = false;

        this.success = response.status === 'success';

        this.message = response.message || this.translate.instant('assignProgram.success');
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
}
