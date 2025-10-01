import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { USER_MESSAGES } from '../../../../constants/user-messages';
import { Program,CoachProgramsResponse } from '../../../../models/program.model';
@Component({
  selector: 'app-coach-program-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-program-list.component.html',
})
export class CoachProgramListComponent implements OnInit {
  programs: Program[] = [];
  message: string = '';

  constructor(
    private programService: CoachProgramService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCoachPrograms();
  }

  private loadCoachPrograms(): void {
    this.programService.getProgramsForLoggedInCoach().pipe(
      catchError((err) => {
        console.error(err);
        this.message = USER_MESSAGES.loadProgramsError;
        return of({ status: 'error', programCount: 0, programs: [] } as CoachProgramsResponse);
      })
    ).subscribe((res: CoachProgramsResponse) => {
      if (res.status === 'success') {
        if (res.programCount === 0) {
          this.message = USER_MESSAGES.noPrograms;
        }
        this.programs = res.programs;
      } else {
        this.message = USER_MESSAGES.loadProgramsError;
      }
    });
  }

  goToWorkouts(programId: number) {
    this.router.navigate([`coach/programs/${programId}/workouts`]).catch(() => {
      this.message = USER_MESSAGES.programClickError;
    });
  }

  editProgram(programId: number) {
    this.router.navigate([`coach/programs/${programId}/edit`]).catch(() => {
      this.message = USER_MESSAGES.programClickError;
    });
  }

  createNewProgram() {
    this.router.navigate(['/coach/programs/new']).catch(() => {
      this.message = USER_MESSAGES.programClickError;
    });
  }
}
