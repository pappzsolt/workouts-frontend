import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import type { PersonalProgramExercise } from '../../../../models/personal-program.model';
import { WORKOUT_PRESCRIPTION_LIMITS } from '../../../../models/workout-prescription-limits';
import { initialSetTargets, syncExercisePrescription } from './personal-prescriptions';

/** Draft prescriptions use the same target columns as the coach's client set editor. */
@Component({
  selector: 'app-personal-exercise-targets',
  standalone: true,
  host: { class: 'block min-w-0' },
  imports: [FormsModule, TranslatePipe, AppInputDirective],
  templateUrl: './personal-exercise-targets.component.html',
  styles: [
    `
      :host {
        container-type: inline-size;
      }
      .target-field-label {
        display: none;
      }
      @container (max-width: 720px) {
        table {
          min-width: 0;
        }
        thead {
          display: none;
        }
        tbody tr {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          padding: 0.5rem;
        }
        tbody th,
        tbody td:nth-child(6),
        tbody td:last-child {
          grid-column: 1 / -1;
        }
        tbody th {
          text-align: left;
        }
        tbody td {
          min-width: 0;
        }
        tbody td:last-child {
          justify-self: end;
        }
        .target-field-label {
          display: block;
        }
      }
    `,
  ],
})
export class PersonalExerciseTargetsComponent {
  @Input({ required: true }) exercise!: PersonalProgramExercise;
  @Input({ required: true }) exerciseName = '';
  @Input() locked = false;
  /** Started executions edit their own targets; notes and performed results remain unchanged. */
  @Input() targetOnly = false;
  @Output() readonly changed = new EventEmitter<void>();
  readonly limits = WORKOUT_PRESCRIPTION_LIMITS;
  readonly standalone = { standalone: true };

  update(): void {
    if (this.locked) return;
    // Keep the aggregate count in sync for both drafts and editable execution copies.
    // Started workouts receive a cloned exercise, never the frozen program template.
    syncExercisePrescription(this.exercise);
    this.changed.emit();
  }

  addSet(): void {
    if (this.locked || this.exercise.sets >= this.limits.maxSets) return;
    this.exercise.setTargets ??= initialSetTargets(this.exercise);
    const last = this.exercise.setTargets.at(-1)!;
    const newSet = { ...last };
    delete newSet.userWorkoutSetId;
    this.exercise.setTargets.push(newSet);
    this.update();
  }

  removeSet(index: number): void {
    if (this.locked || !this.exercise.setTargets || this.exercise.setTargets.length <= 1 ||
        !Number.isInteger(index) || index < 0 || index >= this.exercise.setTargets.length) return;
    this.exercise.setTargets.splice(index, 1);
    this.update();
  }

  fillDown(): void {
    if (this.locked || !this.exercise.setTargets?.length) return;
    const first = this.exercise.setTargets[0];
    this.exercise.setTargets = this.exercise.setTargets.map((row) =>
      this.targetOnly ? { ...row, targetRepetitions: first.targetRepetitions,
        targetWeightKg: first.targetWeightKg, restSeconds: first.restSeconds, targetRpe: first.targetRpe } : { ...first });
    this.update();
  }
}
