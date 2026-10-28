import { Component, EventEmitter, Input, Output } from '@angular/core';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';
import { type EditableSet, type ExerciseSets, isSetChanged, isSetInvalid } from '../client-plan';

/** Egy gyakorlat sorozatai soronként szerkeszthetően (cél, tényleges, RPE, teljesítés, megjegyzés). */
@Component({
  selector: 'app-client-exercise-sets',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './client-exercise-sets.component.html',
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

  get completedCount(): number {
    return this.entry.sets.filter((row) => row.original.completed).length;
  }
}
