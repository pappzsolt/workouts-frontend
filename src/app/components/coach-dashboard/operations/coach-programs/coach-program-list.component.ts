import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachProgramService } from '../../../../services/coach/coach-program/coach-program.service';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import { USER_MESSAGES } from '../../../../constants/user-messages';
import { Program } from '../../../../models/program.model';

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
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const coachId = +params['coachId'];
      if (coachId) {
        this.programService.getProgramsByCoach(coachId).pipe(
          catchError(() => {
            this.message = USER_MESSAGES.loadProgramsError;
            return of([]);
          })
        ).subscribe(data => {
          if (data.length === 0) {
            this.message = USER_MESSAGES.noPrograms;
          }
          this.programs = data;
        });
      } else {
        this.message = USER_MESSAGES.noUserId;
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

