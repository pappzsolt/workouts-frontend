import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoachProgramService } from '../../../../../services/coach/coach-program/coach-program.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Program, ProgramDto } from '../../../../../models/program.model';

@Component({
  selector: 'app-coach-program-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-program-edit.component.html',
  styleUrls: ['./coach-program-edit.component.css']
})
export class CoachProgramEditComponent implements OnInit {
  program: Program = {
    programName: '',
    programDescription: '',
    durationDays: 0,
    difficultyLevel: ''
  };

  message: string = '';

  constructor(
    private route: ActivatedRoute,
    private programService: CoachProgramService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.message = 'Program ID nem található.';
      return;
    }

    this.programService.getProgramById(id).subscribe({
      next: (data) => {
        if (data && data.program) {
          // DTO típusát ne kényszerítsük ProgramDto-ra
          const dto = data.program as any;

          // Explicit mapping: DTO -> frontend Program
          this.program = {
            id: dto.programId,                  // DTO programId -> frontend id
            programName: dto.programName,
            programDescription: dto.programDescription,
            durationDays: dto.durationDays,
            difficultyLevel: dto.difficultyLevel
          };
        } else {
          this.message = `Program with id ${id} not found.`;
        }
      },
      error: (err) => {
        console.error(err);
        this.message = 'Hiba történt a program lekérésekor.';
      }
    });
  }



  saveProgram(): void {
    if (!this.program.id) return;

    this.programService.updateProgram(this.program.id, this.program).subscribe({
      next: () => {
        // Ha a program lista a dashboard része:
        this.router.navigate(['/coach/dashboard'], { queryParams: { section: 'programs' } });
      },
      error: (err) => {
        console.error(err);
        this.message = 'Hiba történt a program mentésekor.';
      }
    });
  }

}
