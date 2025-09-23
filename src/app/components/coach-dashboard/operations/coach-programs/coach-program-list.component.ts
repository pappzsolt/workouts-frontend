import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachProgramService, Program } from '../../../../services/coach/coach-program/coach-program.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-coach-program-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coach-program-list.component.html',
})
export class CoachProgramListComponent implements OnInit {
  programs: Program[] = [];

  constructor(
    private programService: CoachProgramService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const coachId = +params['coachId'];
      if (coachId) {
        this.programService.getProgramsByCoach(coachId).subscribe(data => {
          this.programs = data;
        });
      }
    });
  }

  goToWorkouts(programId: number) {
    this.router.navigate([`coach/programs/${programId}/workouts`]);
  }

  editProgram(programId: number) {
    this.router.navigate([`coach/programs/${programId}/edit`]);
  }
  createNewProgram() {
    this.router.navigate(['/coach/programs/new']); // az út legyen a routodnak megfelelő
  }
}
