import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserMyProgramsService ,Program} from '../../../../services/user/user-my-program/user-my-programs.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
@Component({
  selector: 'app-user-my-programs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-my-programs.component.html',
  styleUrls: ['./user-my-programs.component.css']
})
export class UserMyProgramsComponent implements OnInit {
  programs$!: Observable<Program[]>;

  constructor(private programsService: UserMyProgramsService, private router: Router) {}

  ngOnInit(): void {
    this.programs$ = this.programsService.getPrograms();
  }
  goToWorkouts(programId: number) {
    // ide navigálás
    this.router.navigate(['/user//programs', programId, 'workouts']);
  }
}
