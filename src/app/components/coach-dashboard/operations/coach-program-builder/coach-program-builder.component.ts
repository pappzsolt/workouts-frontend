import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { WorkoutCopyService } from '../../../../services/coach/workout-copy.service';
import { ExerciseService } from '../../../../services/coach/coach-exercises/coach-exercises.service';
import { CoachWorkoutsService } from '../../../../services/coach/coach-workouts/coach-workouts.service';
import { CoachExercisesBoardComponent } from '../../../shared/coach/coach-exercises-board/coach-exercises-board.component';
import { ApiResponse } from '../../../../models/api-response.model';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { skip } from 'rxjs';
import { ProgramWorkoutService } from '../../../../services/coach/program-workout.service';
import { WorkoutExerciseService } from '../../../../services/coach/workout-exercises.service';
import { AppCardComponent } from '../../../../components/shared/components/app-card/app-card.component';
import { AssignProgramService } from '../../../../services/coach/assign-program/assignprogram.service';
import { LanguageService } from '../../../../services/shared/language.service';
import { UserSelectComponent } from '../../../shared/user/user-select.component';
import { AppSelectComponent } from '../../../../components/shared/components/app-select/app-select.component';
import { Exercise, WorkoutDto, WorkoutExercise } from '../../../../models/exercise.model';
import { ProgramCreationRequest, ProgramDto } from '../../../../models/program.model';
import { ProgramWorkout } from '../../../../models/program-workout.model';
import { WorkoutCopyRequest } from '../../../../models/workout-copy.model';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { WorkoutCopyDialogComponent } from './workout-copy-dialog.component';

@Component({
  selector: 'app-coach-program-builder',
  standalone: true,
  imports: [
    ...SHARED_IMPORTS,
    CoachExercisesBoardComponent,
    UserSelectComponent,
    AppCardComponent,
    AppSelectComponent,
    WorkoutCopyDialogComponent,
  ],
  templateUrl: './coach-program-builder.component.html',
  styleUrl: './coach-program-builder.component.css',
})
export class CoachProgramBuilderComponent implements OnInit {
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

  // ==========================================================
  // WORKOUTOK
  // ==========================================================

  workouts: WorkoutDto[] = [];

  exercises: Exercise[] = [];

  selectedExercises: Exercise[] = [];

  /**
   * A jelenleg kiválasztott workoutban
   * már meglévő WorkoutExercise kapcsolatokat tárolja.
   */
  selectedWorkoutExercises: WorkoutExercise[] = [];

  selectedWorkoutId: number | null = null;

  selectedWorkout: WorkoutDto | null = null;

  selectedWorkouts: WorkoutDto[] = [];

  loadingWorkouts = false;

  loadingExercises = false;

  /**
   * true:
   *   az aktuálisan kiválasztott workout újonnan létrehozott workout.
   *
   * false:
   *   meglévő workout.
   *
   * Meglévő workout esetén az exercise-ek LOCKOLVA vannak.
   */
  isNewWorkout = false;

  // ==========================================================
  // WORKOUT MÁSOLÁS
  // ==========================================================

  copyDialogOpen = false;

  copySourceWorkout: WorkoutDto | null = null;

  copyWorkoutName = '';

  copyWorkoutDate = '';

  copyWorkoutDayIndex = 1;

  copyInProgress = false;

  // ==========================================================
  // PROGRAM WORKOUT KAPCSOLATOK
  // ==========================================================

  /**
   * A backend által visszaadott program-workout
   * kapcsolatokat tároljuk itt.
   *
   * Ebben van:
   * - id
   * - programId
   * - workoutId
   * - dayIndex
   */
  programWorkouts: ProgramWorkout[] = [];

  constructor(
    private exerciseService: ExerciseService,
    private coachProgramService: CoachProgramService,
    private programWorkoutService: ProgramWorkoutService,
    private workoutExerciseService: WorkoutExerciseService,
    private route: ActivatedRoute,
    private workoutCopyService: WorkoutCopyService,
    private coachWorkoutsService: CoachWorkoutsService,
    private router: Router,
    private assignProgramService: AssignProgramService,
    private languageService: LanguageService,
  ) {}

  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {
    // ==========================================================
    // NYELVVÁLTÁS FIGYELÉSE
    // ==========================================================

    this.languageService.language$.pipe(skip(1)).subscribe(() => {
      this.loadExercises();

      if (this.programId !== null) {
        this.loadProgram();
      }

      this.loadWorkouts();
    });

    // ==========================================================
    // EREDETI INICIALIZÁLÁS
    // ==========================================================

    this.isEditMode = false;

    this.loadExercises();

    const programId = this.route.snapshot.queryParamMap.get('programId');
    const newWorkoutId = this.route.snapshot.queryParamMap.get('newWorkoutId');

    // ----------------------------------------------------------
    // MEGLÉVŐ PROGRAM
    // ----------------------------------------------------------

    if (programId) {
      this.isEditMode = true;

      const parsedProgramId = Number(programId);

      if (Number.isNaN(parsedProgramId) || parsedProgramId <= 0) {
        console.error('Érvénytelen program ID:', programId);

        this.message = 'coachProgramBuilder.invalidProgramId';
        this.messageType = 'error';

        return;
      }

      this.programId = parsedProgramId;

      console.log('Meglévő program betöltése:', this.programId);

      this.loadProgram();

      if (newWorkoutId) {
        const workoutId = Number(newWorkoutId);

        if (!Number.isNaN(workoutId) && workoutId > 0) {
          console.log('Újonnan létrehozott workout ID:', workoutId);

          this.isNewWorkout = true;
          this.currentStep = 2;
        } else {
          console.error('Érvénytelen newWorkoutId:', newWorkoutId);

          this.message = 'coachProgramBuilder.invalidWorkoutId';
          this.messageType = 'error';

          this.currentStep = 1;
        }
      } else {
        this.currentStep = 1;
      }

      this.loadWorkouts();

      return;
    }

    // ----------------------------------------------------------
    // NORMÁL BELÉPÉS / ÚJ PROGRAM
    // ----------------------------------------------------------

    this.isEditMode = false;
    this.currentStep = 1;

    this.loadWorkouts();
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

    this.coachProgramService.getProgramById(this.programId).subscribe({
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

    this.assignProgramService.getAssignedUserIds(this.programId).subscribe({
      next: (response) => {
        const assignedUserIds = response?.data ?? [];

        this.selectedUserId =
          assignedUserIds.length > 0
            ? Number(assignedUserIds[0])
            : undefined;
      },
      error: (err) => {
        console.error(
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

    this.assignProgramService.assignProgramToUser(this.selectedUserId, this.programId).subscribe({
      next: () => {
        this.router.navigate(['/coach/dashboard'], {
          queryParams: {
            section: 'assignments',
            programId: this.programId,
          },
        });
      },

      error: (err: any) => {
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

  loadWorkouts(): void {
    this.loadingWorkouts = true;

    this.coachWorkoutsService.getUniqueWorkoutsWithExercises().subscribe({
      next: (response: ApiResponse<WorkoutDto[]>) => {
        this.workouts = response.data ?? [];

        this.loadingWorkouts = false;

        if (this.programId !== null) {
          this.loadProgramWorkouts();
        }
      },

      error: () => {
        this.workouts = [];

        this.loadingWorkouts = false;

        this.message = 'coachProgramBuilder.loadWorkoutsError';
        this.messageType = 'error';
      },
    });
  }
  // ==========================================================
  // EXERCISE-EK BETÖLTÉSE
  // ==========================================================
  loadExercises(): void {
    this.loadingExercises = true;

    this.exerciseService.getAllExercises().subscribe({
      next: (response: ApiResponse<Exercise[]>) => {
        this.exercises = response.data ?? [];

        this.loadingExercises = false;
      },

      error: () => {
        this.exercises = [];

        this.loadingExercises = false;

        this.message = 'coachProgramBuilder.loadExercisesError';
        this.messageType = 'error';
      },
    });
  }

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
    };

    this.coachProgramService.createProgram(request).subscribe({
      next: (response: any) => {
        if (response.success && response.data !== null) {
          this.programId = response.data;

          this.loadProgramWorkouts();

          this.currentStep = 2;
        } else {
          this.message = response.message || 'coachProgramBuilder.createError';

          this.messageType = 'error';
        }

        this.creatingProgram = false;
      },

      error: (error: any) => {
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
    };

    this.coachProgramService.updateProgram(this.programId, request).subscribe({
      next: (response) => {
        if (response.success) {
          this.creatingProgram = false;

          this.currentStep = 2;

          this.loadProgramWorkouts();
        } else {
          this.message = response.message || 'coachProgramBuilder.updateError';

          this.messageType = 'error';

          this.creatingProgram = false;
        }
      },

      error: (error: any) => {
        this.message = error?.error?.message || 'coachProgramBuilder.updateError';

        this.messageType = 'error';

        this.creatingProgram = false;
      },
    });
  }

  // ==========================================================
  // PROGRAMHOZ TARTOZÓ WORKOUTOK BETÖLTÉSE
  // ==========================================================

  loadProgramWorkouts(): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.loadProgramWorkoutsError';
      this.messageType = 'error';

      return;
    }

    this.programWorkoutService.getWorkoutsForProgram(this.programId).subscribe({
      next: (response: ApiResponse<ProgramWorkout[]>) => {
        const data = response.data ?? [];

        this.programWorkouts = [...data].sort(
          (a: ProgramWorkout, b: ProgramWorkout) => a.dayIndex - b.dayIndex,
        );

        this.exerciseService.getWorkoutsWithExercises().subscribe({
          next: (response: ApiResponse<WorkoutDto[]>) => {
            const allWorkouts = response.data ?? [];

            this.selectedWorkouts = this.programWorkouts
              .map((programWorkout) =>
                allWorkouts.find((workout) => workout.id === programWorkout.workoutId),
              )
              .filter((workout): workout is WorkoutDto => workout !== undefined);

            const newWorkoutId = this.route.snapshot.queryParamMap.get('newWorkoutId');

            if (newWorkoutId) {
              const workoutId = Number(newWorkoutId);

              if (!Number.isNaN(workoutId) && workoutId > 0) {
                const newWorkout = allWorkouts.find((workout) => workout.id === workoutId);

                if (newWorkout) {
                  this.isNewWorkout = true;

                  this.selectWorkout(newWorkout.id);
                } else {
                  this.message = 'coachProgramBuilder.newWorkoutNotFound';
                  this.messageType = 'error';
                }
              }
            }
          },

          error: () => {
            this.message = 'coachProgramBuilder.loadProgramWorkoutsError';
            this.messageType = 'error';
          },
        });
      },

      error: () => {
        this.programWorkouts = [];
        this.selectedWorkouts = [];

        this.message = 'coachProgramBuilder.loadProgramWorkoutsError';
        this.messageType = 'error';
      },
    });
  }

  // ==========================================================
  // WORKOUT KIVÁLASZTÁSA
  // ==========================================================

  selectWorkout(workoutId: number): void {
    if (!workoutId) {
      return;
    }

    if (this.selectedWorkoutId === workoutId) {
      this.selectedWorkoutId = null;
      this.selectedWorkout = null;
      this.selectedWorkoutExercises = [];
      this.selectedExercises = [];
      this.loadingExercises = false;
      this.isNewWorkout = false;

      return;
    }

    this.selectedWorkoutId = workoutId;

    this.selectedWorkout = null;

    this.loadingExercises = true;

    this.selectedWorkoutExercises = [];
    this.selectedExercises = [];

    const newWorkoutId = this.route.snapshot.queryParamMap.get('newWorkoutId');

    this.isNewWorkout = newWorkoutId !== null && Number(newWorkoutId) === workoutId;

    this.exerciseService.getWorkoutExercises(workoutId).subscribe({
      next: (workout: WorkoutDto) => {
        this.selectedWorkout = workout;

        this.selectedWorkoutExercises = workout.exercises || [];

        this.selectedExercises = this.selectedWorkoutExercises
          .map((workoutExercise) => workoutExercise.exercise)
          .filter((exercise): exercise is Exercise => exercise != null);

        this.loadingExercises = false;
      },

      error: () => {
        this.selectedWorkoutExercises = [];
        this.selectedExercises = [];

        this.loadingExercises = false;

        this.message = 'coachProgramBuilder.loadWorkoutExercisesError';
        this.messageType = 'error';
      },
    });
  }
  // ==========================================================
  // EXERCISE-EK SZERKESZTHETŐSÉGE
  // ==========================================================

  get lockSelectedExercises(): boolean {
    return !this.isNewWorkout;
  }

  // ==========================================================
  // KIVÁLASZTOTT EXERCISE-OK
  // ==========================================================
  onExercisesChange(updatedExercises: Exercise[]): void {
    if (!this.isNewWorkout) {
      return;
    }

    this.selectedExercises = [...updatedExercises];
  }

  // ==========================================================
  // ÚJ EXERCISE-EK MEGHATÁROZÁSA
  // ==========================================================

  getNewExercisesForWorkout(): Exercise[] {
    const existingExerciseIds = this.selectedWorkoutExercises
      .map((workoutExercise) => workoutExercise.exercise?.id)
      .filter((id): id is number => id != null);

    return this.selectedExercises.filter(
      (exercise) => exercise.id != null && !existingExerciseIds.includes(exercise.id),
    );
  }

  // ==========================================================
  // EXERCISE-EK MENTÉSE AZ AKTUÁLIS WORKOUT-HOZ
  // ==========================================================
  saveSelectedExercises(): void {
    if (this.selectedWorkoutId === null) {
      this.message = 'coachProgramBuilder.noWorkoutSelected';
      this.messageType = 'error';

      return;
    }

    if (!this.isNewWorkout) {
      return;
    }

    const newExercises = this.getNewExercisesForWorkout();

    if (newExercises.length === 0) {
      return;
    }

    for (const exercise of newExercises) {
      if (exercise.id == null) {
        continue;
      }

      this.workoutExerciseService
        .assignExerciseToWorkout(this.selectedWorkoutId, exercise.id)
        .subscribe({
          next: (response: any) => {
            const alreadyExists = this.selectedWorkoutExercises.some(
              (workoutExercise) => workoutExercise.exercise?.id === exercise.id,
            );

            if (!alreadyExists) {
              this.selectedWorkoutExercises.push({
                id: Number(response) || 0,
                workoutId: this.selectedWorkoutId!,
                exercise,
                sets: 0,
                repetitions: 0,
                orderIndex: this.selectedWorkoutExercises.length,
                restSeconds: 0,
                done: false,
              });
            }
          },

          error: () => {
            this.message = 'coachProgramBuilder.saveExerciseError';
            this.messageType = 'error';
          },
        });
    }
  }
  // ==========================================================
  // WORKOUT MÁR KIVÁLASZTVA?
  // ==========================================================

  isWorkoutSelected(workoutId: number): boolean {
    return this.selectedWorkouts.some((workout) => workout.id === workoutId);
  }

  // ==========================================================
  // WORKOUT HOZZÁADÁSA
  // ==========================================================

  addSelectedWorkout(): void {
    if (!this.selectedWorkout) {
      return;
    }

    if (this.programId === null) {
      this.message = 'coachProgramBuilder.addWorkoutError';
      this.messageType = 'error';

      return;
    }

    if (this.isWorkoutSelected(this.selectedWorkout.id)) {
      return;
    }

    const workout = this.selectedWorkout;

    const dayIndex = this.selectedWorkouts.length + 1;

    this.programWorkoutService.addWorkoutToProgram(this.programId, workout.id, dayIndex).subscribe({
      next: (response: ApiResponse<ProgramWorkout>) => {
        if (!response.success || !response.data) {
          this.message = response.message || 'coachProgramBuilder.addWorkoutError';

          this.messageType = 'error';

          return;
        }

        this.selectedWorkouts.push(workout);

        this.programWorkouts.push(response.data);

        if (this.isNewWorkout) {
          this.saveSelectedExercises();
        }
      },

      error: (error: any) => {
        this.message = error.error?.message || 'coachProgramBuilder.addWorkoutError';

        this.messageType = 'error';
      },
    });
  }
  // ==========================================================
  // WORKOUT ELTÁVOLÍTÁSA
  // ==========================================================

  removeWorkout(workoutId: number): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.removeWorkoutError';
      this.messageType = 'error';

      return;
    }

    this.programWorkoutService.deleteProgramWorkout(this.programId, workoutId).subscribe({
      next: (response: ApiResponse<void>) => {
        if (!response.success) {
          this.message = response.message || 'coachProgramBuilder.removeWorkoutError';

          this.messageType = 'error';

          return;
        }

        this.selectedWorkouts = this.selectedWorkouts.filter((workout) => workout.id !== workoutId);

        this.programWorkouts = this.programWorkouts.filter(
          (programWorkout) => programWorkout.workoutId !== workoutId,
        );

        if (this.selectedWorkoutId === workoutId) {
          this.selectedWorkoutId = null;
          this.selectedWorkout = null;
          this.selectedWorkoutExercises = [];
          this.selectedExercises = [];
          this.isNewWorkout = false;
        }

        this.reindexProgramWorkouts();
      },

      error: (error: any) => {
        this.message = error.error?.message || 'coachProgramBuilder.removeWorkoutError';

        this.messageType = 'error';
      },
    });
  }

  // ==========================================================
  // DAY INDEX ÚJRASZÁMOZÁSA
  // ==========================================================

  reindexProgramWorkouts(): void {
    if (this.programId === null) {
      return;
    }

    const updates = this.programWorkouts.map((programWorkout, index) => ({
      ...programWorkout,
      dayIndex: index + 1,
    }));

    this.programWorkouts = updates;

    // A reindexelésnek a backendben is meg kell jelennie.
    updates.forEach((programWorkout) => {
      if (programWorkout.id == null) {
        return;
      }

      this.programWorkoutService
        .updateProgramWorkout(programWorkout.id, programWorkout.dayIndex)
        .subscribe({
          next: (response) => {
            if (response.success && response.data) {
              const current = this.programWorkouts.find(
                (pw) => pw.id === programWorkout.id,
              );

              if (current) {
                current.dayIndex = response.data.dayIndex;
              }
            }
          },
          error: (error) => {
            console.error(
              'Program workout dayIndex frissítési hiba:',
              programWorkout.id,
              error,
            );
          },
        });
    });
  }

  // ==========================================================
  // WORKOUT NAPJÁNAK MÓDOSÍTÁSA
  // ==========================================================

  updateWorkoutDay(workoutId: number, dayIndex: number): void {
    const programWorkout = this.programWorkouts.find((pw) => pw.workoutId === workoutId);

    if (!programWorkout) {
      this.message = 'coachProgramBuilder.updateWorkoutDayError';
      this.messageType = 'error';

      return;
    }

    if (programWorkout.id === undefined) {
      this.message = 'coachProgramBuilder.updateWorkoutDayError';
      this.messageType = 'error';

      return;
    }

    this.programWorkoutService.updateProgramWorkout(programWorkout.id, dayIndex).subscribe({
      next: (response: ApiResponse<ProgramWorkout>) => {
        if (!response.success || !response.data) {
          this.message = response.message || 'coachProgramBuilder.updateWorkoutDayError';

          this.messageType = 'error';

          return;
        }

        programWorkout.dayIndex = response.data.dayIndex;

        this.programWorkouts = [...this.programWorkouts].sort((a, b) => a.dayIndex - b.dayIndex);

        this.selectedWorkouts = this.programWorkouts
          .map((pw) => this.workouts.find((workout) => workout.id === pw.workoutId))
          .filter((workout): workout is WorkoutDto => workout !== undefined);
      },

      error: (error: any) => {
        this.message = error.error?.message || 'coachProgramBuilder.updateWorkoutDayError';

        this.messageType = 'error';
      },
    });
  }

  // ==========================================================
  // WORKOUT DAY INDEX LEKÉRÉSE
  // ==========================================================

  getWorkoutDayIndex(workoutId: number): number {
    const programWorkout = this.programWorkouts.find((pw) => pw.workoutId === workoutId);

    return programWorkout?.dayIndex ?? 1;
  }

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

  // ==========================================================
  // WORKOUT MÁSOLÁS
  // ==========================================================

  copyWorkout(workout: WorkoutDto): void {
    if (this.programId === null) {
      console.error('Nincs program ID.');

      return;
    }

    this.copySourceWorkout = workout;

    this.copyWorkoutName = `${workout.name} - másolat`;

    this.copyWorkoutDate = workout.workoutDate ?? '';

    this.copyWorkoutDayIndex = this.selectedWorkouts.length + 1;

    this.copyDialogOpen = true;

    console.log('Workout másoló ablak megnyitva:', {
      sourceWorkoutId: workout.id,
      programId: this.programId,
      workoutName: this.copyWorkoutName,
      workoutDate: this.copyWorkoutDate,
      dayIndex: this.copyWorkoutDayIndex,
    });
  }

  cancelCopyWorkout(): void {
    console.log('Workout másolás megszakítva.');

    this.copyDialogOpen = false;

    this.copySourceWorkout = null;

    this.copyWorkoutName = '';

    this.copyWorkoutDate = '';

    this.copyWorkoutDayIndex = 1;
  }

  confirmCopyWorkout(): void {
    if (this.programId === null) {
      this.message = 'coachProgramBuilder.copyError';
      this.messageType = 'error';

      return;
    }

    if (this.copySourceWorkout === null) {
      this.message = 'coachProgramBuilder.copyError';
      this.messageType = 'error';

      return;
    }

    if (!this.copyWorkoutName.trim()) {
      this.message = 'coachProgramBuilder.copyNameRequired';
      this.messageType = 'error';

      return;
    }

    if (!this.copyWorkoutDate) {
      this.message = 'coachProgramBuilder.copyDateRequired';
      this.messageType = 'error';

      return;
    }

    if (!Number.isInteger(this.copyWorkoutDayIndex) || this.copyWorkoutDayIndex < 1) {
      this.message = 'coachProgramBuilder.invalidWorkoutDay';
      this.messageType = 'error';

      return;
    }

    const request: WorkoutCopyRequest = {
      sourceWorkoutId: this.copySourceWorkout.id,
      programId: this.programId,
      workoutName: this.copyWorkoutName.trim(),
      workoutDate: this.copyWorkoutDate,
      dayIndex: this.copyWorkoutDayIndex,
    };

    this.copyInProgress = true;

    this.workoutCopyService.copyWorkout(request).subscribe({
      next: (response) => {
        this.copyInProgress = false;

        if (response.status === 'success' && response.data !== null) {
          this.message = 'coachProgramBuilder.copySuccess';
          this.messageType = 'success';

          this.cancelCopyWorkout();

          this.loadWorkouts();
        } else {
          this.message = response.message || 'coachProgramBuilder.copyError';
          this.messageType = 'error';
        }
      },

      error: (error: any) => {
        this.copyInProgress = false;

        this.message = error?.error?.message || 'coachProgramBuilder.copyError';

        this.messageType = 'error';
      },
    });
  }
}
