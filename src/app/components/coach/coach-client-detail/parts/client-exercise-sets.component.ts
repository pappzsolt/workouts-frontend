import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AppInputDirective } from '../../../shared/components/form-controls/app-input.directive';
import { AppCheckboxDirective } from '../../../shared/components/form-controls/app-check.directive';

import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { type EditableSet, type ExerciseSets, type NumericSetField, isSetChanged, isSetFieldInvalid, isSetInvalid } from '../client-plan';

/** Egy gyakorlat sorozatai soronként szerkeszthetően (cél, tényleges, RPE, teljesítés, megjegyzés). */
@Component({
  selector: 'app-client-exercise-sets',
  standalone: true,
  imports: [AppInputDirective, AppCheckboxDirective, FormsModule, TranslatePipe, AppIconComponent],
  templateUrl: './client-exercise-sets.component.html',
  styleUrl: './client-exercise-sets.component.css',
  host: { class: 'contents' },
})
export class ClientExerciseSetsComponent {
  @Input({ required: true }) entry!: ExerciseSets;
  /** A gyakorlat helye az edzésben (0-tól); a mezőnevek és a sorszám ebből készülnek. */
  @Input({ required: true }) index = 0;
  @Input() setBusy = false;
  @Input() deleteSetId: number | null = null;

  @Output() readonly fillDown = new EventEmitter<void>();
  @Output() readonly addSet = new EventEmitter<void>();
  @Output() readonly askDelete = new EventEmitter<EditableSet>();
  @Output() readonly cancelDelete = new EventEmitter<void>();
  @Output() readonly confirmDelete = new EventEmitter<void>();

  readonly isChanged = isSetChanged;
  readonly isInvalid = isSetInvalid;
  readonly isFieldInvalid = isSetFieldInvalid;
  readonly fieldErrors: Record<NumericSetField, string> = {
    targetRepetitions: 'coachWorkspace.client.setRepetitionError',
    actualRepetitions: 'coachWorkspace.client.setRepetitionError',
    restSeconds: 'coachWorkspace.client.setRestError',
    targetWeightKg: 'coachWorkspace.client.setWeightError',
    actualWeightKg: 'coachWorkspace.client.setWeightError',
    targetRpe: 'coachWorkspace.client.setRpeError',
  };

  readonly fieldLabels = {
    targetRepetitions: 'coachWorkspace.client.targetReps',
    targetWeightKg: 'coachWorkspace.client.targetWeight',
    restSeconds: 'coachWorkspace.restSeconds',
    actualRepetitions: 'coachWorkspace.client.actualReps',
    actualWeightKg: 'coachWorkspace.client.actualWeight',
    targetRpe: 'setEffort.targetRpe',
    actualRpe: 'setEffort.actualRpe',
    rir: 'setEffort.rir',
    completed: 'coachWorkspace.client.done',
    notes: 'coachWorkspace.client.notes',
  };

  get completedCount(): number {
    return this.entry.sets.filter((row) => row.original.completed).length;
  }
}
