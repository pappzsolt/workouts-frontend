import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
    private route: ActivatedRoute
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
}
