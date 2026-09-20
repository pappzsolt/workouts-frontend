import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';
import { Program } from '../../../../../models/program.model';
import { USER_MESSAGES } from '../../../../../constants/user-messages';
import { LanguageService } from '../../../../../services/shared/language.service';
import { SHARED_IMPORTS } from '../../../../shared/shared-imports';
import { AppCardComponent } from '../../../../shared/components/app-card/app-card.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
@Component({
  selector: 'app-coach-program',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppCardComponent, PaginationComponent],
  templateUrl: './coach-program.component.html',
  styleUrls: ['./coach-program.component.css'],
})
export class CoachProgramComponent implements OnInit {
  programs: Program[] = [];

  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  showProgramsList = false;

  currentPage = 1;
  itemsPerPage = 6;
  totalPages = 1;
  totalItems = 0;

  // Keresés
  searchTerm = '';

  // Rendezés
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private router: Router,
    private programService: CoachProgramService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.languageService.language$.subscribe(() => {
      this.loadCoachPrograms();
    });
  }
  private loadCoachPrograms(): void {
    const backendPage = this.currentPage - 1;

    this.programService
      .searchProgramsForCoach(
        this.searchTerm.trim(),
        backendPage,
        this.itemsPerPage,
        'hu',
        this.sortDirection,
      )
      .subscribe({
        next: (response) => {
          console.log('Coach program search response:', response);

          // Backend lapozási adatok
          this.totalItems = response.totalElements ?? 0;
          this.totalPages = Math.max(1, response.totalPages ?? 0);

          if (response.content?.length) {
            this.programs = response.content.map((program: any): Program => ({
              id: program.programId,
              programName: program.programName,
              programDescription: program.programDescription,
              name: program.name,
              description: program.description,
              coachId: program.coachId,
              startDate: program.startDate,
              endDate: program.endDate,
              durationDays: program.durationDays,
              difficultyLevel: program.difficultyLevel,
              workoutCount: program.workoutCount,
              workouts: program.workouts,
            }));

            this.showProgramsList = true;
            this.clearMessage();
          } else {
            this.programs = [];
            this.totalItems = 0;
            this.totalPages = 1;
            this.currentPage = 1;
            this.showProgramsList = false;

            this.setMessage('coachPrograms.noPrograms', 'info');
          }
        },

        error: (error) => {
          console.error('Hiba a coach programok keresésekor:', error);

          this.programs = [];
          this.totalItems = 0;
          this.totalPages = 1;
          this.currentPage = 1;
          this.showProgramsList = false;

          this.setMessage('coachPrograms.loadError', 'error');
        },
      });
  }

  /**
   * Keresett és rendezett programok.
   */
  get filteredPrograms(): Program[] {
    const search = this.searchTerm.trim().toLowerCase();

    const result = this.programs.filter((program) => {
      const programName = program.programName?.toLowerCase() ?? '';

      return programName.includes(search);
    });

    return result.sort((a, b) => {
      const nameA = a.programName?.toLowerCase() ?? '';
      const nameB = b.programName?.toLowerCase() ?? '';

      const comparison = nameA.localeCompare(nameB, 'hu', {
        sensitivity: 'base',
      });

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Lapozás előtt frissítjük az oldalak számát.
   */
  private updatePagination(): void {
    const count = this.filteredPrograms.length;

    this.totalPages = Math.max(1, Math.ceil(count / this.itemsPerPage));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  /**
   * Keresés megváltozott.
   */
  onSearchChange(): void {
    this.currentPage = 1;
    this.loadCoachPrograms();
  }

  /**
   * Rendezés megfordítása.
   */
  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';

    this.currentPage = 1;
    this.loadCoachPrograms();
  }

  /**
   * Aktuális oldal programjai.
   */
  get pagedPrograms(): Program[] {
    return this.programs;
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadCoachPrograms();
    }
  }

  createNewProgram(): void {
    this.router.navigate(['/coach/programs/new']).catch((error) => {
      console.error('Hiba az új program oldal megnyitásakor:', error);

      this.setMessage(USER_MESSAGES.programClickError, 'error');
    });
  }

  editProgram(programId: number | undefined, event: MouseEvent): void {
    event.stopPropagation();

    console.log('Szerkesztés gomb megnyomva. programId =', programId);

    if (programId === undefined || programId === null || programId <= 0) {
      console.error('Érvénytelen program ID:', programId);

      this.setMessage(USER_MESSAGES.programClickError, 'error');

      return;
    }

    this.router
      .navigate(['/coach/program-builder'], {
        queryParams: {
          programId,
        },
      })
      .then((success) => {
        console.log('Program Builder navigáció eredménye:', success);
      })
      .catch((error) => {
        console.error('Hiba a Program Builder megnyitásakor:', error);

        this.setMessage(USER_MESSAGES.programClickError, 'error');
      });
  }

  goToWorkouts(programId: number | undefined): void {
    if (programId === undefined || programId === null || programId <= 0) {
      return;
    }

    this.router.navigate(['/coach/programs', programId, 'workouts']);
  }

  private setMessage(message: string, type: 'success' | 'error' | 'info'): void {
    this.message = message;
    this.messageType = type;
  }

  private clearMessage(): void {
    this.message = '';
    this.messageType = 'info';
  }
}
