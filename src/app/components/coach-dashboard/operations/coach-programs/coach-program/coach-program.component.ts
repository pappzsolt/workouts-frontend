import { Component, OnInit } from '@angular/core';
import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';
import { Program } from '../../../../../models/program.model';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { Router } from '@angular/router';
import { USER_MESSAGES } from '../../../../../constants/user-messages';

@Component({
  selector: 'app-coach-program',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor],
  templateUrl: './coach-program.component.html',
  styleUrls: ['./coach-program.component.css'] // ⚡ ha nincs fájl, létre kell hozni vagy törölni
})
export class CoachProgramComponent implements OnInit {
  programs: Program[] = [];
  message: string = '';
  showProgramsList: boolean = false;

  constructor(
    private router: Router,
    private programService: CoachProgramService,
  ) {}

  ngOnInit(): void {
    this.loadCoachPrograms();
  }

  private loadCoachPrograms() {
    this.programService.getProgramsForLoggedInCoach().subscribe({
      next: (res) => {
        if (res.status === 'success' && res.data?.length) {
          this.programs = res.data.map(p => ({
            id: (p as any).programId ?? p.id,
            programName: p.programName || 'Név hiányzik',
            programDescription: p.programDescription || '',
            durationDays: p.durationDays || 0,
            difficultyLevel: p.difficultyLevel || '',
            coachId: p.coachId,
            startDate: p.startDate,
            endDate: p.endDate,
            workouts: p.workouts
          }));
          this.showProgramsList = true;
          this.message = '';
        } else {
          this.message = 'Nincsenek programok a coachhoz.';
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

  createNewProgram() {
    this.router.navigate(['/coach/programs/new']).catch(() => {
      this.message = USER_MESSAGES.programClickError;
    });
  }

  editProgram(programId: number | undefined, event: MouseEvent) {
    event.stopPropagation();
    if (!programId) {
      this.message = USER_MESSAGES.programClickError;
      return;
    }
    this.router.navigate([`/coach/programs/${programId}/edit`])
      .catch(err => {
        console.error('router.navigate hiba:', err);
        this.message = USER_MESSAGES.programClickError;
      });
  }

  goToWorkouts(programId: number | undefined) {
    if (!programId) return;
    this.router.navigate([`/coach/programs/${programId}/workouts`]);
  }
}
