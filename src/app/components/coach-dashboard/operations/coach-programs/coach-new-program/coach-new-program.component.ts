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
    programName: '',
    programDescription: '',
    durationDays: 0,
    difficultyLevel: '',
    coachId: 0
  };

  message: string = ''; // ide kerülnek a hibák vagy sikerüzenetek
  messageType: 'success' | 'error' = 'success'; // stílushoz

  constructor(
    private programService: CoachProgramService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  saveProgram() {
    this.message = '';

    // 🔹 Alakítsuk át a frontend Program objektumot a backend CreateProgramRequest DTO-ra
    const requestBody = {
      name: this.program.programName,
      description: this.program.programDescription,
      durationDays: this.program.durationDays,
      difficultyLevel: this.program.difficultyLevel
    };

    this.programService.createProgram(requestBody).subscribe({
      next: (response) => {
        console.log('Program created:', response);
        this.messageType = 'success';
        this.message = 'Program sikeresen létrehozva!';
        setTimeout(() => this.router.navigate(['/coach/programs']), 1500);
      },
      error: (err) => {
        console.error('Error creating program:', err);
        this.messageType = 'error';
        if (err.error?.message) {
          this.message = `Hiba: ${err.error.message}`;
        } else {
          this.message = 'Hiba történt a program létrehozása során.';
        }
      }
    });
  }

}
