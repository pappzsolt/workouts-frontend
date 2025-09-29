import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserMyProgramsService, UserProgram } from '../../../../services/user/user-my-program/user-my-programs.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { USER_MESSAGES } from '../../../../constants/user-messages';

@Component({
  selector: 'app-user-my-programs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-my-programs.component.html',
  styleUrls: ['./user-my-programs.component.css']
})
export class UserMyProgramsComponent implements OnInit {
  programs$!: Observable<UserProgram[]>;
  message = USER_MESSAGES.loadPrograms; // alapértelmezett üzenet
  USER_MESSAGES = USER_MESSAGES;        // 🔹 elérhető lesz a template-ben is

  constructor(private programsService: UserMyProgramsService, private router: Router) {}

  ngOnInit(): void {
    // Service hívás
    this.programs$ = this.programsService.getPrograms();

    // Debug & üzenetkezelés
    this.programs$.subscribe({
      next: programs => {
        if (!programs || programs.length === 0) {
          this.message = USER_MESSAGES.noPrograms;
        } else {
          this.message = ''; // van adat → nincs üzenet
        }
      },
      error: () => {
        this.message = USER_MESSAGES.loadProgramsError;
      }
    });
  }

  /** Navigáció a workouts oldalára + program név átadása state-ben */
  /** Navigáció a programhoz tartozó workouts oldalára + programName átadás state-ben */
  goToWorkouts(programId: number, programName: string): void {
    this.router.navigate(
      ['/user/programs', programId, 'workouts'],
      {
        state: { programName }
      }
    );
  }

}
