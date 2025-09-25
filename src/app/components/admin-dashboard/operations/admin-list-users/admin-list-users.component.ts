import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminListUsersService } from '../../../../services/admin/admin-list-users.service';
import { User } from '../../../../models/user.model';
import { USER_MESSAGES } from '../../../../constants/user-messages';

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
        this.errorMessage = err.message || USER_MESSAGES.loadError, err;
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

