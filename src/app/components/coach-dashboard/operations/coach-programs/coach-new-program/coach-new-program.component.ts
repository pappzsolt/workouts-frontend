import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';

// Helyes interface definíció
export interface Program {
  id?: number;  // opcionális
  name: string;
  description?: string;
  duration_days?: number;
  difficulty_level?: string;
  coach_id?: number;
}

@Component({
  selector: 'app-coach-new-program',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    this.programService.create(this.program).subscribe(() => {
      this.router.navigate(['/coach/programs']);
    });
  }
}

