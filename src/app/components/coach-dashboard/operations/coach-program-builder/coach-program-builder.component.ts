import { HttpErrorResponse } from '@angular/common/http';

import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { LoggerService } from '../../../../services/logger.service';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiResponse } from '../../../../models/backend-dto/common/api-response';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { skip } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppCardComponent } from '../../../../components/shared/components/app-card/app-card.component';
import { AssignProgramService } from '../../../../services/coach/assign-program/assignprogram.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { AppSelectComponent } from '../../../../components/shared/components/app-select/app-select.component';
import type { ProgramDto } from '../../../../models/backend-dto/programs/program-dto';
import type { ProgramCreationRequest } from '../../../../models/backend-dto/programcreator/program-creation-request';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { CoachProgramBuilderWorkoutsComponent } from './coach-program-builder-workouts.component';

@Component({
  selector: 'app-coach-program-builder',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    AppCardComponent,
    AppSelectComponent,
    CoachProgramBuilderWorkoutsComponent,
  ],
  templateUrl: './coach-program-builder.component.html',
  styleUrl: './coach-program-builder.component.css',
})
export class CoachProgramBuilderComponent implements OnInit {
  private readonly logger = inject(LoggerService);

  private readonly destroyRef = inject(DestroyRef);

  currentStep = 1;

  // ==========================================================
  // PROGRAM ADATOK
  // ==========================================================

  programName = '';

  programDescription = '';

  startDate = '';

  endDate = '';

  selectedUserId?: number;

  durationDays: number | null = null;

  difficultyLevel = '';

  programId: number | null = null;

  /**
   * true:
   *   meglévő program szerkesztése
   *
   * false:
   *   új program létrehozása
   */
  isEditMode = false;

  creatingProgram = false;

  // ==========================================================
  // ÜZENETEK
  // ==========================================================

  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  constructor(
    private coachProgramService: CoachProgramService,
    private route: ActivatedRoute,
    private router: Router,
    private assignProgramService: AssignProgramService,
    private languageService: LanguageService,
  ) {}

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    this.isEditMode = false;

    const programId = this.route.snapshot.queryParamMap.get('programId');
    const newWorkoutId = this.route.snapshot.queryParamMap.get('newWorkoutId');

    this.languageService.language$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.programId !== null) {
          this.loadProgram();
        }
      });

    if (programId) {
      const parsedProgramId = Number(programId);

      if (Number.isNaN(parsedProgramId) || parsedProgramId <= 0) {
        this.message = 'coachProgramBuilder.invalidProgramId';
        this.messageType = 'error';
        return;
      }

      this.isEditMode = true;
      this.programId = parsedProgramId;
      this.currentStep = newWorkoutId ? 2 : 1;
      this.loadProgram();
      return;
    }

    this.currentStep = 1;
  }

  // ==========================================================
  // PROGRAM BETÖLTÉSE
  // ==========================================================
  loadProgram(): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.loadProgramError';
      this.messageType = 'error';

      return;
    }

    this.coachProgramService.getProgramById(this.programId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          const program = response.data;

          this.programName = program.programName ?? '';
          this.programDescription = program.programDescription ?? '';
          this.startDate = program.startDate ?? '';
          this.endDate = program.endDate ?? '';
          this.durationDays = program.durationDays ?? null;
          this.difficultyLevel = program.difficultyLevel ?? '';

          // ==================================================
          // PROGRAMHOZ RENDELT USER
          // ==================================================
          //
          // A backend a hozzárendelt user(eke)t külön endpointon adja:
          // GET /api/programs/{programId}/assigned-users
          //
          // A builder UI jelenleg egy felhasználót tud megjeleníteni,
          // ezért meglévő program szerkesztésekor az első hozzárendelt
          // usert állítjuk be a select értékének.
          this.loadAssignedUser();
        } else {
          this.message = 'coachProgramBuilder.loadProgramError';
          this.messageType = 'error';
        }
      },

      error: () => {
        this.message = 'coachProgramBuilder.loadProgramError';
        this.messageType = 'error';
      },
    });
  }
  private loadAssignedUser(): void {
    if (this.programId === null) {
      this.selectedUserId = undefined;
      return;
    }

    this.assignProgramService.getAssignedUserIds(this.programId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const assignedUserIds = response?.data ?? [];

        this.selectedUserId =
          assignedUserIds.length > 0
            ? Number(assignedUserIds[0])
            : undefined;
      },
      error: (err) => {
        this.logger.error(
          'Hiba a programhoz rendelt felhasználó lekérésekor:',
          err,
        );
        this.selectedUserId = undefined;
      },
    });
  }

  // ==========================================================
  // ÚJ WORKOUT LÉTREHOZÁSA
  // ==========================================================
  goToCreateWorkout(): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.loadProgramError';
      this.messageType = 'error';

      return;
    }

    this.router.navigate(['/coach/workouts/new'], {
      queryParams: {
        fromProgramBuilder: 'true',
        programId: this.programId,
      },
    });
  }

  // ==========================================================
  // PROGRAM BEFEJEZÉSE
  // ==========================================================

  finishProgram(): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.loadProgramError';
      this.messageType = 'error';

      return;
    }

    if (!this.selectedUserId) {
      this.message = 'coachProgramBuilder.noUserSelected';
      this.messageType = 'error';

      return;
    }

    this.assignProgramService.assignProgramToUser(this.selectedUserId, this.programId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.router.navigate(['/coach/dashboard'], {
          queryParams: {
            section: 'assignments',
            programId: this.programId,
          },
        });
      },

      error: (err: HttpErrorResponse) => {
        const backendMessage = err?.error?.message ?? err?.message;

        this.message = backendMessage || 'coachProgramBuilder.assignError';

        this.messageType = 'error';
      },
    });
  }

  // ==========================================================
  // WORKOUTOK BETÖLTÉSE
  // ==========================================================

  // ==========================================================
  // WORKOUTOK BETÖLTÉSE
  // ==========================================================

  // ==========================================================
  // EXERCISE-EK BETÖLTÉSE
  // ==========================================================
  // ==========================================================
  // KALKULÁLT BEFEJEZÉSI DÁTUM
  // ==========================================================

  get calculatedEndDate(): string {
    if (!this.startDate || !this.durationDays || this.durationDays <= 0) {
      return '';
    }

    const date = new Date(`${this.startDate}T00:00:00`);
    date.setDate(date.getDate() + this.durationDays);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // ==========================================================
  // PROGRAM LÉTREHOZÁSA
  createProgram(): void {
    if (!this.programName.trim()) {
      return;
    }

    if (!this.startDate) {
      this.message = 'coachProgramBuilder.startDateRequired';
      this.messageType = 'error';
      return;
    }

    if (this.durationDays === null || this.durationDays <= 0) {
      return;
    }

    if (!this.difficultyLevel) {
      return;
    }

    this.creatingProgram = true;

    const request: ProgramCreationRequest = {
      programName: this.programName.trim(),
      programDescription: this.programDescription.trim(),
      startDate: this.startDate || null,
      durationDays: this.durationDays,
      difficultyLevel: this.difficultyLevel,
      userId: null,
      languageCode: this.languageService.getCurrentLanguage(),
      workouts: null,
    };

    this.coachProgramService.createProgram(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: ApiResponse<number>) => {
        if (response.success && response.data !== null) {
          this.programId = response.data;


          this.currentStep = 2;
        } else {
          this.message = response.message || 'coachProgramBuilder.createError';

          this.messageType = 'error';
        }

        this.creatingProgram = false;
      },

      error: (error: HttpErrorResponse) => {
        this.message = error?.error?.message || 'coachProgramBuilder.createError';

        this.messageType = 'error';

        this.creatingProgram = false;
      },
    });
  }

  // ==========================================================
  // PROGRAM MÓDOSÍTÁSA
  // ==========================================================

  updateProgram(): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.updateError';
      this.messageType = 'error';

      return;
    }

    if (!this.programName.trim()) {
      return;
    }

    if (!this.startDate) {
      this.message = 'coachProgramBuilder.startDateRequired';
      this.messageType = 'error';
      return;
    }

    if (this.durationDays === null || this.durationDays <= 0) {
      return;
    }

    if (!this.difficultyLevel) {
      return;
    }

    this.creatingProgram = true;

    const request: ProgramCreationRequest = {
      programName: this.programName.trim(),
      programDescription: this.programDescription.trim(),
      startDate: this.startDate || null,
      durationDays: this.durationDays,
      difficultyLevel: this.difficultyLevel,
      userId: null,
      languageCode: this.languageService.getCurrentLanguage(),
      workouts: null,
    };

    this.coachProgramService.updateProgram(this.programId, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success) {
          this.creatingProgram = false;

          this.currentStep = 2;

        } else {
          this.message = response.message || 'coachProgramBuilder.updateError';

          this.messageType = 'error';

          this.creatingProgram = false;
        }
      },

      error: (error: HttpErrorResponse) => {
        this.message = error?.error?.message || 'coachProgramBuilder.updateError';

        this.messageType = 'error';

        this.creatingProgram = false;
      },
    });
  }

  // ==========================================================
  // WORKOUT MÁR KIVÁLASZTVA?
  // ==========================================================

  // ==========================================================
  // WORKOUT HOZZÁADÁSA
  // ==========================================================

  // ==========================================================
  // WORKOUT ELTÁVOLÍTÁSA
  // ==========================================================

  // ==========================================================
  // DAY INDEX ÚJRASZÁMOZÁSA
  // ==========================================================

  // ==========================================================
  // WORKOUT NAPJÁNAK MÓDOSÍTÁSA
  // ==========================================================

  // ==========================================================
  // WORKOUT DAY INDEX LEKÉRÉSE
  // ==========================================================

  // ==========================================================
  // KÖVETKEZŐ LÉPÉS
  // ==========================================================

  nextStep(): void {
    if (this.currentStep === 1) {
      if (this.programId === null) {
        this.createProgram();
      } else {
        this.updateProgram();
      }

      return;
    }

    if (this.currentStep < 2) {
      this.currentStep++;
    }
  }

  // ==========================================================
  // ELŐZŐ LÉPÉS
  // ==========================================================

  previousStep(): void {
    if (this.currentStep === 2 && this.isEditMode) {
      this.router.navigate(['/coach/dashboard'], {
        queryParams: {
          section: 'programs',
        },
      });

      return;
    }

    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

}
