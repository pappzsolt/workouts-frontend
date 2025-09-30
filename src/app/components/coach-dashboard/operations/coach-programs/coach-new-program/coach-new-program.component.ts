import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';
import { HttpClientModule } from '@angular/common/http';
import { Program } from '../../../../../models/program.model';
@Component({
  selector: 'app-coach-new-program',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './coach-new-program.component.html',
  styleUrls: ['./coach-new-program.component.css']
})
export class CoachNewProgramComponent implements OnInit {
  program: Program = {
    name: '',
    description: '',
    duration_days: 0,
    difficulty_level: '',
    coach_id: 0
  };

  constructor(
    private programService: CoachProgramService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  saveProgram() {
    this.programService.createProgram(this.program).subscribe({
      next: (response) => {
        console.log('Program created:', response);
        this.router.navigate(['/coach/programs']);
      },
      error: (err) => {
        console.error('Error creating program:', err);
      }
    });
  }
}
