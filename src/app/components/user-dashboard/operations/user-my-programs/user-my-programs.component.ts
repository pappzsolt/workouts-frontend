import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, Subject, takeUntil } from 'rxjs';

import {
  UserMyProgramsService,
  UserProgram,
} from '../../../../services/user/user-my-program/user-my-programs.service';

import { LanguageService } from '../../../../services/shared/language.service';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-my-programs',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './user-my-programs.component.html',
  styleUrls: ['./user-my-programs.component.css'],
})
export class UserMyProgramsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  programs$!: Observable<UserProgram[]>;

  message = 'userMyPrograms.loading';

  constructor(
    private programsService: UserMyProgramsService,
    private router: Router,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    /*
     * Nyelvváltás figyelése.
     *
     * A BehaviorSubject az aktuális nyelvet
     * azonnal kibocsátja, ezért az első
     * programbetöltés is innen történik.
     */
    this.languageService.language$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadPrograms();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPrograms(): void {
    this.message = 'userMyPrograms.loading';

    this.programs$ = this.programsService.getPrograms();

    this.programs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (programs) => {
        if (!programs || programs.length === 0) {
          this.message = 'userMyPrograms.noPrograms';
        } else {
          this.message = '';
        }
      },

      error: () => {
        this.message = 'userMyPrograms.loadError';
      },
    });
  }

  /** Navigáció a programhoz tartozó workouts oldalára + programName átadás state-ben */
  goToWorkouts(programId: number, programName: string): void {
    this.router.navigate(['/user/programs', programId, 'workouts'], {
      state: { programName },
    });
  }
}
