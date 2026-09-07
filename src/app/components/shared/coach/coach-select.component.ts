import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';

import { CoachNameId, CoachNameIdService } from '../../../services/coach/coach-name-id.service';

import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-coach-select',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <div>
      <label for="coachSelect" class="block mb-1">
        {{ 'coachSelect.coach' | translate }}
      </label>

      <select
        id="coachSelect"
        [(ngModel)]="selectedCoachId"
        (change)="onCoachChange()"
        class="border rounded px-2 py-1 w-full"
      >
        <option value="">
          {{ 'coachSelect.select' | translate }}
        </option>

        <option *ngFor="let coach of coaches" [ngValue]="coach.id">
          {{ coach.name }}
        </option>
      </select>
    </div>
  `,
})
export class CoachSelectComponent implements OnInit {
  coaches: CoachNameId[] = [];

  @Input()
  selectedCoachId?: number;

  @Output()
  selectedCoachIdChange = new EventEmitter<number>();

  @Output()
  coachSelected = new EventEmitter<CoachNameId>();

  constructor(private coachService: CoachNameIdService) {}

  ngOnInit(): void {
    this.coachService.getAllCoaches().subscribe({
      next: (coaches) => {
        console.log('Coaches loaded:', coaches);

        this.coaches = coaches;
      },

      error: (err) => console.error('Hiba a coachok lekérésénél', err),
    });
  }

  onCoachChange(): void {
    const selected = this.coaches.find((c) => c.id === this.selectedCoachId);

    if (selected) {
      this.coachSelected.emit(selected);
    }

    this.selectedCoachIdChange.emit(this.selectedCoachId!);
  }
}
