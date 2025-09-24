import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminListUsersService, User } from '../../../../services/admin/admin-list-users.service';

@Component({
  selector: 'app-admin-list-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-list-users.component.html',
  styleUrls: ['./admin-list-users.component.css']
})
export class AdminListUsersComponent {
  users: User[] = [];
  errorMessage: string | null = null;

  // Lapozáshoz
  currentPage = 1;
  pageSize = 6;
  totalPages = 1;

  constructor(private adminListUsersService: AdminListUsersService) {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.adminListUsersService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.totalPages = Math.ceil(this.users.length / this.pageSize);
        this.errorMessage = null;
      },
      error: (err) => {
        console.error('Hiba történt a users lekérése közben:', err);
        this.errorMessage = err.message || 'Hiba történt a felhasználók betöltése közben.';
      }
    });
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.users.slice(start, start + this.pageSize);
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }
}

