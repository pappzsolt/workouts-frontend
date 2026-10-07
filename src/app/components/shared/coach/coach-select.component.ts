import { matchesSearch } from '../components/app-search/search-match';
import { AppSearchComponent } from '../components/app-search/app-search.component';
import { errorMessage, responseMessage } from '../../../models/backend-dto/common/api-response-message';
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
  imports: [AppSearchComponent, ...SHARED_IMPORTS, AppSelectComponent],
  template: `
    <div>

      <app-search
        inputId="coachSelectSearch"
        [searchTerm]="searchTerm"
        label="appSearch.coachesLabel"
        placeholder="appSearch.coachesPlaceholder"
        [showClearButton]="true"
        (searchTermChange)="onSearchChange($event)"
        class="mb-3 block"
      ></app-search>
    <app-message *ngIf="searchTerm.trim() && !matchingOptions.length" message="appSearch.noResults" type="info" class="mb-3 block"></app-message>
      <app-form-field labelKey="coachSelect.coach" controlId="coachSelect">
        <app-select
          id="coachSelect"
          [value]="selectedCoachId"
          [options]="coachOptions"
          placeholder="coachSelect.select"
          [placeholderValue]="undefined"
          (valueChange)="selectedCoachId = $event; onCoachChange()"
        ></app-select>
      </app-form-field>
      <app-message [message]="message" [type]="messageType" class="block mt-3"></app-message>
    </div>
  `,
})
export class CoachSelectComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  private readonly logger = inject(LoggerService);

  coaches: CoachNameId[] = [];
  message = '';
  messageType: 'info' | 'error' = 'info';

  @Input()
  selectedCoachId?: number;

  @Output()
  selectedCoachIdChange = new EventEmitter<number>();

  @Output()
  coachSelected = new EventEmitter<CoachNameId>();

  constructor(private coachService: CoachNameIdService) {}

  searchTerm = '';

  get matchingOptions(): CoachNameId[] {
    return this.coaches.filter(coach => matchesSearch(this.searchTerm, coach.name));
  }

  get coachOptions(): SelectOption<number>[] {
    return this.coaches.filter(coach => coach.id === this.selectedCoachId || matchesSearch(this.searchTerm, coach.name)).map((coach) => ({ value: coach.id, label: coach.name }));
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    if (!term.trim()) return;
    const first = this.matchingOptions[0];
    if (!first || first.id === this.selectedCoachId) return;
    this.selectedCoachId = first.id;
    this.onCoachChange();
  }

  ngOnInit(): void {
    this.coachService.getAllCoaches().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.coaches = response.success ? response.data ?? [] : [];
        this.message = responseMessage([response], response.success ? '' : 'coachSelect.loadError');
        this.messageType = response.success ? 'info' : 'error';
      },

      error: err => {
        this.coaches = [];
        this.message = errorMessage(err, 'coachSelect.loadError'); this.messageType = 'error';
        this.logger.error('Hiba a coachok lekérésénél', err);
      },
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
