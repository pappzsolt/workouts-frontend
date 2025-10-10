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
  messageType: 'success' | 'error' | '' = ''; // <<< hozzáadva

  constructor(
    private route: ActivatedRoute,
    private programService: CoachProgramService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.setMessage('Program ID nem található.', 'error');
      return;
    }

    this.programService.getProgramById(id).subscribe({
      next: (res) => {
        if (res && res.status === 'success' && res.data) {
          const dto = res.data; // backendből jön a ProgramDto

          // Explicit mapping: DTO -> frontend Program
          this.program = {
            id: dto.programId,                  // DTO programId -> frontend id
            programName: dto.programName,
            programDescription: dto.programDescription,
            durationDays: dto.durationDays,
            difficultyLevel: dto.difficultyLevel
          };
        } else {
          this.setMessage(`Program with id ${id} not found.`, 'error');
        }
      },
      error: (err) => {
        console.error(err);
        this.setMessage('Hiba történt a program lekérésekor.', 'error');
      }
    });

  }

  saveProgram(): void {
    if (!this.program.id) return;

    this.programService.updateProgram(this.program.id, this.program).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.setMessage('Program sikeresen mentve!', 'success');
          setTimeout(() => {
            this.router.navigate(['/coach/dashboard'], { queryParams: { section: 'programs' } });
          }, 1500);
        } else {
          this.setMessage('Hiba történt a mentés közben.', 'error');
        }
      },
      error: (err) => {
        console.error(err);
        this.setMessage('Hiba történt a program mentésekor.', 'error');
      }
    });
  }

  // Üzenet beállító metódus
  private setMessage(msg: string, type: 'success' | 'error') {
    this.message = msg;
    this.messageType = type;

    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 4000);
  }
}
