import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CoachProgramService } from '../../../services/coach/coach-program/coach-program.service';
import { Program } from '../../../models/program.model';
import { CommonModule } from '@angular/common';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-coach-dashboard',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor],
  templateUrl: './coach-dashboard.component.html',
  styleUrls: ['./coach-dashboard.component.css']
})
export class CoachDashboardComponent implements OnInit {
  programs: Program[] = [];
  message: string = '';
  showProgramsList: boolean = false;

  constructor(
    private router: Router,
    private programService: CoachProgramService
  ) {}

  ngOnInit(): void {}

  navigateTo(path: string) {
    if (path === 'coach/programs') {
      this.loadCoachPrograms();
    } else {
      // Workouts és Exercises esetén még nem történik semmi
      this.message = `Navigáció a ${path} oldalra jelenleg nincs implementálva.`;
      this.showProgramsList = false;
    }
  }

  private loadCoachPrograms() {
    this.programService.getProgramsForLoggedInCoach().subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.programs = res.programs;
          this.showProgramsList = true;
          this.message = '';
        } else {
          this.message = 'Hiba történt a programok lekérésekor.';
          this.showProgramsList = false;
        }
      },
      error: (err) => {
        console.error(err);
        this.message = 'Nem sikerült lekérni a programokat.';
        this.showProgramsList = false;
      }
    });
  }

  goToProgram(programId: number) {
    this.router.navigate([`/coach/programs/${programId}/workouts`]);
  }
}

