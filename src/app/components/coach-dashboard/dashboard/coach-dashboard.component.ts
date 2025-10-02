import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CoachProgramService } from '../../../services/coach/coach-program/coach-program.service';
import { Program } from '../../../models/program.model';
import { CommonModule } from '@angular/common';
import { NgIf, NgFor } from '@angular/common';
import {USER_MESSAGES} from '../../../constants/user-messages';
import { ProgramStateService } from '../../../services/coach/coach-program/ProgramStateService';

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
    private programService: CoachProgramService,
    private programState: ProgramStateService
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
        if (res.status === 'success' && res.programs?.length) {
          this.programs = res.programs.map(p => ({
            id: (p as any).programId ?? p.id, // backend programId -> frontend id
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



  goToProgram(programId?: number) {
    if (!programId) return; // opcionális id ellenőrzés
    this.router.navigate([`/coach/programs/${programId}/workouts`]);
  }
  createNewProgram() {
    this.router.navigate(['/coach/programs/new']).catch(() => {
      this.message = USER_MESSAGES.programClickError;
    });
  }
  editProgram(programId: number, event: MouseEvent) {
    event.stopPropagation();

    console.log('DEBUG: editProgram hívás indult');
    console.log('DEBUG: kapott programId =', programId);

    if (!programId) {
      console.warn('DEBUG: programId nem érkezett, megszakítom.');
      this.message = USER_MESSAGES.programClickError;
      return;
    }

    this.router.navigate([`/coach/programs/${programId}/edit`])
      .then(success => {
        console.log('DEBUG: router.navigate success?', success);
      })
      .catch(err => {
        console.error('DEBUG: router.navigate hiba:', err);
        this.message = USER_MESSAGES.programClickError;
      });
  }


}
