import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, skip } from 'rxjs';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { CoachWorkoutBoardComponent } from '../../../shared/coach/coach-workouts-board/coach-workout-board.component';
import { UserMultiSelectComponent } from '../../../shared/user/user-multi-select.component';
import { LanguageService } from '../../../../services/shared/language.service';
import { ProgramWorkoutOccurrenceStore } from '../../../../services/coach/program-builder/program-workout-occurrence.store';
import type { WorkoutWithExercises } from '../../../../models/exercise.model';
import type { ProgramWorkoutOccurrence } from '../../../../models/program-workout-state';
import { ProgramExerciseDialogComponent } from './program-exercise-dialog.component';
import { ProgramWorkoutCopyComponent } from './program-workout-copy.component';

/** View coordination only: picker visibility and which dialog is open. */
@Component({
  selector: 'app-coach-program-builder-workouts', standalone: true,
  imports: [...SHARED_IMPORTS, CoachWorkoutBoardComponent, UserMultiSelectComponent, ProgramExerciseDialogComponent, ProgramWorkoutCopyComponent],
  providers: [ProgramWorkoutOccurrenceStore],
  templateUrl: './coach-program-builder-workouts.component.html',
})
export class CoachProgramBuilderWorkoutsComponent implements OnInit, OnChanges {
  readonly occurrences = inject(ProgramWorkoutOccurrenceStore);
  private readonly route = inject(ActivatedRoute);
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  @Input() selectedUserIds: number[] = [];
  @Input() assignedUserIds: number[] = [];
  @Input() assignmentBusy = false;
  @Input() isEditMode = false;
  @Input() programId: number | null = null;
  @Input() currentStep = 2;
  @Output() readonly previousStep = new EventEmitter<void>();
  @Output() readonly finishProgram = new EventEmitter<void>();
  @Output() readonly selectedUserIdsChange = new EventEmitter<number[]>();
  @Output() readonly userSelectionReadyChange = new EventEmitter<boolean>();
  @Output() readonly goToCreateWorkout = new EventEmitter<void>();
  userSelectionReady = false;
  pendingWorkoutIds: number[] = [];
  showWorkoutPicker = false;
  exerciseWorkoutId: number | null = null;
  exerciseOccurrenceId: number | null = null;
  copySourceWorkout: WorkoutWithExercises | null = null;
  private initialized = false;
  private openedNewWorkout = false;

  ngOnInit(): void {
    this.initialized = true;
    this.reload();
    this.language.language$.pipe(skip(1), filter(() => !this.occurrences.busy), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['programId'] && this.initialized) {
      this.exerciseWorkoutId = null;
      this.copySourceWorkout = null;
      this.openedNewWorkout = false;
      this.reload();
    }
  }
  reload(): void {
    this.occurrences.load(this.programId, () => {
      const value = this.route.snapshot.queryParamMap.get('newWorkoutId');
      if (value === null || this.openedNewWorkout) return;
      const id = Number(value);
      if (!this.occurrences.workouts.some(workout => workout.id === id)) {
        this.occurrences.fail('coachProgramBuilder.newWorkoutNotFound'); return;
      }
      this.openedNewWorkout = true;
      this.selectWorkout(id);
    });
  }
  selectWorkout(id: number, occurrenceId: number | null = null): void {
    this.exerciseWorkoutId = id;
    this.exerciseOccurrenceId = occurrenceId;
  }
  get exerciseIsNewWorkout(): boolean {
    return this.exerciseWorkoutId !== null && Number(this.route.snapshot.queryParamMap.get('newWorkoutId')) === this.exerciseWorkoutId;
  }
  addPendingWorkouts(): void {
    this.occurrences.add(this.pendingWorkoutIds, addedIds => {
      this.pendingWorkoutIds = this.pendingWorkoutIds.filter(id => !addedIds.includes(id));
      if (!this.pendingWorkoutIds.length) this.showWorkoutPicker = false;
    });
  }
  closeExerciseDialog(): void { this.exerciseWorkoutId = null; this.exerciseOccurrenceId = null; }
  onCopied(): void { this.occurrences.success('coachProgramBuilder.copySuccess'); this.reload(); }
  readonly trackBySelectedWorkoutOccurrence = (_index: number, row: ProgramWorkoutOccurrence): number => row.assignment.id;
}
