import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachProgramSelectComponent } from '../../../shared/programs/coach-program-select.component';

interface Program {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-program-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf,CoachProgramSelectComponent],
  templateUrl: './program-assignment.component.html',
  styleUrls: ['./program-assignment.component.css']
})
export class ProgramAssignmentComponent implements OnInit {
  programs: Program[] = [];
  users: User[] = [];

  selectedProgramId: number | null = null;
  selectedUserIds: number[] = [];

  assignedUsers: { programId: number; userIds: number[] }[] = [];

  ngOnInit(): void {
    // későbbi inicializálás (pl. API hívás)
  }

  toggleUserSelection(userId: number) {
    // user kiválasztás logika ide kerül
  }

  assignUsersToProgram() {
    // programhoz user-ek hozzárendelése ide kerül
  }

  getProgramName(programId: number): string {
    return '';
  }

  getUserName(userId: number): string {
    return '';
  }
}
