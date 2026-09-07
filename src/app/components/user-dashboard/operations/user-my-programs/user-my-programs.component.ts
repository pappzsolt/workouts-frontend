import { Component, OnInit } from '@angular/core';
import {
  UserMyProgramsService,
  UserProgram,
} from '../../../../services/user/user-my-program/user-my-programs.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-user-my-programs',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './user-my-programs.component.html',
  styleUrls: ['./user-my-programs.component.css'],
})
export class UserMyProgramsComponent implements OnInit {
  programs$!: Observable<UserProgram[]>;

  message = 'userMyPrograms.loading';

  ngOnInit(): void {
    this.programs$ = this.programsService.getPrograms();

    this.programs$.subscribe({
      next: (programs) => {
        if (!programs || programs.length === 0) {
          this.message = 'userMyPrograms.noPrograms';
        } else {
          this.message = '';
        }
      },

      error: () => {
        this.message = 'userMyPrograms.loadError';
      },
    });
  }

  constructor(
    private programsService: UserMyProgramsService,
    private router: Router,
  ) {}

  /** Navigáció a programhoz tartozó workouts oldalára + programName átadás state-ben */
  goToWorkouts(programId: number, programName: string): void {
    this.router.navigate(['/user/programs', programId, 'workouts'], {
      state: { programName },
    });
  }
}
