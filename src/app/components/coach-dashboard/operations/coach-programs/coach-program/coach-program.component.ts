import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';
import { Program } from '../../../../../models/program.model';
import { USER_MESSAGES } from '../../../../../constants/user-messages';

@Component({
  selector: 'app-coach-program',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './coach-program.component.html',
  styleUrls: ['./coach-program.component.css']
})
export class CoachProgramComponent implements OnInit {

  programs: Program[] = [];

  message = '';
  showProgramsList = false;

  currentPage = 1;
  itemsPerPage = 4;
  totalPages = 1;

  // Keresés
  searchTerm = '';

  // Rendezés
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private router: Router,
    private programService: CoachProgramService
  ) {}

  ngOnInit(): void {
    this.loadCoachPrograms();
  }

  private loadCoachPrograms(): void {

    this.programService
      .getProgramsForLoggedInCoach()
      .subscribe({

        next: (response) => {

          console.log(
            'Coach program response:',
            response
          );

          if (
            response.status === 'success' &&
            response.data?.length
          ) {

            this.programs = response.data.map(
              (program: any): Program => ({

                id:
                program.programId,

                programName:
                program.programName,

                programDescription:
                program.programDescription,

                name:
                program.name,

                description:
                program.description,

                coachId:
                program.coachId,

                startDate:
                program.startDate,

                endDate:
                program.endDate,

                durationDays:
                program.durationDays,

                difficultyLevel:
                program.difficultyLevel,

                workouts:
                program.workouts

              })
            );

            console.log(
              'Programok frontend modellként:',
              this.programs
            );

            console.log(
              'Első program:',
              this.programs[0]
            );

            console.log(
              'Első program ID:',
              this.programs[0]?.id
            );

            this.updatePagination();

            this.showProgramsList = true;
            this.message = '';

          } else {

            this.programs = [];
            this.totalPages = 1;
            this.currentPage = 1;
            this.showProgramsList = false;

            this.message =
              'Nincsenek programok a coachhoz.';
          }

        },

        error: (error) => {

          console.error(
            'Hiba a coach programok betöltésekor:',
            error
          );

          this.programs = [];
          this.totalPages = 1;
          this.currentPage = 1;
          this.showProgramsList = false;

          this.message =
            'Nem sikerült lekérni a programokat.';
        }

      });
  }

  /**
   * Keresett és rendezett programok.
   */
  get filteredPrograms(): Program[] {

    const search = this.searchTerm
      .trim()
      .toLowerCase();

    let result = this.programs.filter(
      (program) => {

        const programName =
          program.programName
            ?.toLowerCase() ?? '';

        return programName.includes(search);
      }
    );

    result.sort((a, b) => {

      const nameA =
        a.programName
          ?.toLowerCase() ?? '';

      const nameB =
        b.programName
          ?.toLowerCase() ?? '';

      const comparison =
        nameA.localeCompare(
          nameB,
          'hu',
          {
            sensitivity: 'base'
          }
        );

      return this.sortDirection === 'asc'
        ? comparison
        : -comparison;
    });

    return result;
  }

  /**
   * Lapozás előtt frissítjük az oldalak számát.
   */
  private updatePagination(): void {

    const count =
      this.filteredPrograms.length;

    this.totalPages =
      Math.max(
        1,
        Math.ceil(
          count / this.itemsPerPage
        )
      );

    if (
      this.currentPage >
      this.totalPages
    ) {
      this.currentPage =
        this.totalPages;
    }
  }

  /**
   * Keresés megváltozott.
   */
  onSearchChange(): void {

    this.currentPage = 1;

    this.updatePagination();
  }

  /**
   * Rendezés megfordítása.
   */
  toggleSort(): void {

    this.sortDirection =
      this.sortDirection === 'asc'
        ? 'desc'
        : 'asc';

    this.currentPage = 1;

    this.updatePagination();
  }

  /**
   * Aktuális oldal programjai.
   */
  get pagedPrograms(): Program[] {

    const startIndex =
      (this.currentPage - 1) *
      this.itemsPerPage;

    return this.filteredPrograms.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  nextPage(): void {

    if (
      this.currentPage <
      this.totalPages
    ) {

      this.currentPage++;
    }
  }

  prevPage(): void {

    if (this.currentPage > 1) {

      this.currentPage--;
    }
  }

  createNewProgram(): void {

    this.router
      .navigate([
        '/coach/programs/new'
      ])
      .catch((error) => {

        console.error(
          'Hiba az új program oldal megnyitásakor:',
          error
        );

        this.message =
          USER_MESSAGES.programClickError;
      });
  }

  editProgram(
    programId: number | undefined,
    event: MouseEvent
  ): void {

    event.stopPropagation();

    console.log(
      'Szerkesztés gomb megnyomva. programId =',
      programId
    );

    if (
      programId === undefined ||
      programId === null ||
      programId <= 0
    ) {

      console.error(
        'Érvénytelen program ID:',
        programId
      );

      this.message =
        USER_MESSAGES.programClickError;

      return;
    }

    this.router
      .navigate(
        ['/coach/program-builder'],
        {
          queryParams: {
            programId: programId
          }
        }
      )
      .then((success) => {

        console.log(
          'Program Builder navigáció eredménye:',
          success
        );

      })
      .catch((error) => {

        console.error(
          'Hiba a Program Builder megnyitásakor:',
          error
        );

        this.message =
          USER_MESSAGES.programClickError;
      });
  }

  goToWorkouts(
    programId: number | undefined
  ): void {

    if (
      programId === undefined ||
      programId === null ||
      programId <= 0
    ) {

      return;
    }

    this.router.navigate([
      '/coach/programs',
      programId,
      'workouts'
    ]);
  }

}
