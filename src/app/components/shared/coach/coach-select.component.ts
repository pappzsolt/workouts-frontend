import type { CoachNameId } from '../../../models/common/coach-name-id.model';
import { Component, EventEmitter, Output, Input, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '../../../services/logger.service';

import { CoachNameIdService } from '../../../services/coach/coach-name-id.service';

import { AppSelectComponent } from '../components/app-select/app-select.component';
import type { SelectOption } from '../../../models/common/select-option.model';

import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-coach-select',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSelectComponent],
  template: `
    <div>
      <label for="coachSelect" class="block mb-1">
        {{ 'coachSelect.coach' | translate }}
      </label>

      <app-select
        id="coachSelect"
        [value]="selectedCoachId"
        [options]="coachOptions"
        placeholder="coachSelect.select"
        [placeholderValue]="undefined"
        (valueChange)="selectedCoachId = $event; onCoachChange()"
      ></app-select>
    </div>
  `,
})
export class CoachSelectComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  private readonly logger = inject(LoggerService);

  coaches: CoachNameId[] = [];

  @Input()
  selectedCoachId?: number;

  @Output()
  selectedCoachIdChange = new EventEmitter<number>();

  @Output()
  coachSelected = new EventEmitter<CoachNameId>();

  constructor(private coachService: CoachNameIdService) {}

  get coachOptions(): SelectOption<number>[] {
    return this.coaches.map((coach) => ({ value: coach.id, label: coach.name }));
  }

  ngOnInit(): void {
    this.coachService.getAllCoaches().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (coaches) => {

        this.coaches = coaches;
      },

      error: (err) => this.logger.error('Hiba a coachok lekérésénél', err),
    });
  }

  onCoachChange(): void {
    const selected = this.coaches.find((c) => c.id === this.selectedCoachId);

    if (selected) {
      this.coachSelected.emit(selected);
    }

    const selectedCoachId = this.selectedCoachId;
    if (selectedCoachId == null) {
      return;
    }

    this.selectedCoachIdChange.emit(selectedCoachId);
  }


}
