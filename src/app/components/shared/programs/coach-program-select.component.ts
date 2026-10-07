import { reserveSelectControlId } from '../components/app-select/select-control-id';
import { matchesSearch } from '../components/app-search/search-match';
import { AppSearchComponent } from '../components/app-search/app-search.component';
import {
  Component,
  OnInit,
  OnChanges,
  Input,
  Output,
  EventEmitter,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CoachProgramSelectService } from '../../../services/coach/coach-program-select/coach-program-select.service';

import type { CoachProgram } from '../../../models/coach-program.model';

import { AppSelectComponent } from '../components/app-select/app-select.component';
import type { SelectOption } from '../../../models/common/select-option.model';

import { errorMessage } from '../../../models/backend-dto/common/api-response-message';
import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-coach-program-select',
  standalone: true,
  host: { class: 'block min-w-0' },
  imports: [AppSearchComponent, ...SHARED_IMPORTS, AppSelectComponent],
  templateUrl: './coach-program-select.component.html',
})
export class CoachProgramSelectComponent implements OnInit, OnChanges {
  @Input() controlId = reserveSelectControlId('coachProgramSelect');

  private readonly destroyRef = inject(DestroyRef);

  private readonly programService = inject(CoachProgramSelectService);

  programs: CoachProgram[] = [];

  loading = false;

  message = '';

  @Input()
  selectedProgramId?: number;

  @Input() searchable = false;

  @Output()
  selectedProgramIdChange = new EventEmitter<number>();

  @Output() readonly readyChange = new EventEmitter<boolean>();

  ngOnChanges(): void {
    this.reportReady();
  }

  private reportReady(): void {
    this.readyChange.emit(
      !this.loading &&
        this.programs.some((program) => program.programId === this.selectedProgramId),
    );
  }

  searchTerm = '';

  get matchingOptions(): CoachProgram[] {
    return this.programs.filter((program) =>
      matchesSearch(this.searchTerm, program.programName, program.programDescription),
    );
  }

  get allProgramOptions(): SelectOption<number>[] {
    return this.programs.map((program) => ({
      value: program.programId,
      label: program.programName,
      searchText: program.programDescription,
    }));
  }

  get programOptions(): SelectOption<number>[] {
    return this.programs
      .filter(
        (program) =>
          program.programId === this.selectedProgramId ||
          matchesSearch(this.searchTerm, program.programName, program.programDescription),
      )
      .map((program) => ({ value: program.programId, label: program.programName }));
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    if (!term.trim()) return;
    const first = this.matchingOptions[0];
    if (!first || first.programId === this.selectedProgramId) return;
    this.onProgramSelect(first.programId);
  }

  ngOnInit(): void {
    this.loadPrograms();
  }

  loadPrograms(): void {
    this.loading = true;
    this.reportReady();

    this.programService
      .getMyPrograms()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.programs = [];

            this.message = response.message ?? 'coachProgramSelect.loadError';

            this.loading = false;
            this.reportReady();

            return;
          }

          this.programs = response.data ?? [];

          this.loading = false;
          this.reportReady();
        },

        error: (error) => {
          this.programs = [];

          this.message = errorMessage(error, 'coachProgramSelect.loadError');

          this.loading = false;
          this.reportReady();
        },
      });
  }

  onProgramSelect(programId: number | undefined): void {
    if (programId === undefined) return;
    this.selectedProgramId = programId;

    this.selectedProgramIdChange.emit(programId);
    this.reportReady();
  }
}
