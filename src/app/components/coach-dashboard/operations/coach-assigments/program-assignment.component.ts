import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, FormsModule, NgFor, NgIf],
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
    // 🔹 Például adatok — később API-ból is jöhetnek
    this.programs = [
      { id: 1, name: 'Beginner Strength' },
      { id: 2, name: 'Fat Loss Plan' },
      { id: 3, name: 'Muscle Gain Advanced' }
    ];

    this.users = [
      { id: 101, name: 'Alice' },
      { id: 102, name: 'Bob' },
      { id: 103, name: 'Charlie' },
      { id: 104, name: 'Diana' }
    ];
  }

  toggleUserSelection(userId: number) {
    if (this.selectedUserIds.includes(userId)) {
      this.selectedUserIds = this.selectedUserIds.filter(id => id !== userId);
    } else {
      this.selectedUserIds.push(userId);
    }
  }

  assignUsersToProgram() {
    if (!this.selectedProgramId || this.selectedUserIds.length === 0) return;

    this.assignedUsers.push({
      programId: this.selectedProgramId,
      userIds: [...this.selectedUserIds]
    });

    // Reset választások
    this.selectedProgramId = null;
    this.selectedUserIds = [];
  }

  getProgramName(programId: number): string {
    return this.programs.find(p => p.id === programId)?.name || '';
  }

  getUserName(userId: number): string {
    return this.users.find(u => u.id === userId)?.name || '';
  }
}
