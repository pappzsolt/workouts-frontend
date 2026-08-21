import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';
import { Program } from '../../../../../models/program.model';
import { USER_MESSAGES } from '../../../../../constants/user-messages';

@Component({
  selector: 'app-coach-program',
  standalone: true,
  imports: [CommonModule],
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

  constructor(
    private router: Router,
    private programService: CoachProgramService
  ) {}

  ngOnInit(): void {
    this.loadCoachPrograms();
  }

  private loadCoachPrograms(): void {
    this.programService.getProgramsForLoggedInCoach().subscribe({
      next: (response) => {

        if (response.status === 'success' && response.data?.length) {

          this.programs = response.data;

          this.totalPages = Math.ceil(
            this.programs.length / this.itemsPerPage
          );

          this.showProgramsList = true;
          this.message = '';

        } else {
          this.programs = [];
          this.totalPages = 1;
          this.showProgramsList = false;
          this.message = 'Nincsenek programok a coachhoz.';
        }
      },

      error: () => {
        this.programs = [];
        this.totalPages = 1;
        this.showProgramsList = false;
        this.message = 'Nem sikerült lekérni a programokat.';
      }
    });
  }

  get pagedPrograms(): Program[] {
    const startIndex =
      (this.currentPage - 1) * this.itemsPerPage;

    return this.programs.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  createNewProgram(): void {
    this.router.navigate(['/coach/programs/new']).catch(() => {
      this.message = USER_MESSAGES.programClickError;
    });
  }

  editProgram(
    programId: number | undefined,
    event: MouseEvent
  ): void {

    event.stopPropagation();

    if (!programId) {
      this.message = USER_MESSAGES.programClickError;
      return;
    }

    this.router
      .navigate(['/coach/programs', programId, 'edit'])
      .catch(() => {
        this.message = USER_MESSAGES.programClickError;
      });
  }

  goToWorkouts(programId: number | undefined): void {

    if (!programId) {
      return;
    }

    this.router.navigate([
      '/coach/programs',
      programId,
      'workouts'
    ]);
  }
}
