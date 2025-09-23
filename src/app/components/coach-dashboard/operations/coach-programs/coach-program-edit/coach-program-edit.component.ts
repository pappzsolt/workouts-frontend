import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachProgramService, Program } from '../../../../../services/coach/coach-program/coach-program.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-coach-program-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-program-edit.component.html',
  styleUrls: ['./coach-program-edit.component.css']
})
export class CoachProgramEditComponent implements OnInit {
  program: Program = {
    id: 0,
    name: '',
    description: '',
    duration_days: 0,
    difficulty_level: '',
    coach_id: 0   // ← kötelező mező
  };

  constructor(
    private route: ActivatedRoute,
    private programService: CoachProgramService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.programService.getProgramById(id).subscribe(data => {
        if (data) {           // ← ellenőrzés hozzáadva
          this.program = data;
        } else {
          console.warn(`Program with id ${id} not found`);
          // opcionálisan navigálhatsz vissza a listára:
          // this.router.navigate(['/coach/programs']);
        }
      });
    }
  }


  saveProgram() {
    this.programService.updateProgram(this.program.id!, this.program).subscribe(() => {
      this.router.navigate(['/coach/programs']);
    });
  }

}
