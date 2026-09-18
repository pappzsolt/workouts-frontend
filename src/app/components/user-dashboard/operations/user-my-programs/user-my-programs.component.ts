import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, Subject, takeUntil } from 'rxjs';

import { UserMyProgramsService } from '../../../../services/user/user-my-program/user-my-programs.service';

import { UserProgram, ProgramProgress } from '../../../../models/program.model';

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

  /**
   * Programonként tárolja a haladási adatokat.
   *
   * Kulcs: programId
   * Érték: az adott program progress adatai
   */
  programProgress: Record<number, ProgramProgress> = {};

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

    this.programProgress = {};

    this.programs$ = this.programsService.getPrograms();

    this.programs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (programs) => {
        if (!programs || programs.length === 0) {
          this.message = 'userMyPrograms.noPrograms';
          this.programProgress = {};
          return;
        }

        this.message = '';

        /*
         * Az összes program progress adatát
         * egyetlen batch API-hívással kérjük le.
         */
        this.programsService
          .getProgramProgress(programs.map((program) => program.id))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (progress) => {
              this.programProgress = Object.fromEntries(
                progress.map((item) => [item.programId, item]),
              );
            },

            error: () => {
              /*
               * Ha a progress lekérése nem sikerül,
               * a programlista ettől még megjelenik.
               */
              this.programProgress = {};
            },
          });
      },

      error: () => {
        this.message = 'userMyPrograms.loadError';
        this.programProgress = {};
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
