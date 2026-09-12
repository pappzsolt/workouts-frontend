import { Component } from '@angular/core';

import { AdminListUsersService } from '../../../../services/admin/admin-list-users.service';
import { User } from '../../../../models/user.model';
import { USER_MESSAGES } from '../../../../constants/user-messages';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-admin-list-users',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './admin-list-users.component.html',
  styleUrls: ['./admin-list-users.component.css'],
})
export class AdminListUsersComponent {
  users: User[] = [];

  message = '';
  messageType: 'success' | 'error' | '' = '';

  // Lapozás
  currentPage = 1;
  pageSize = 6;
  totalPages = 1;

  constructor(private readonly adminListUsersService: AdminListUsersService) {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.message = '';
    this.messageType = '';

    this.adminListUsersService.getUsers().subscribe({
      next: (users) => {
        this.users = users;

        this.totalPages = Math.ceil(this.users.length / this.pageSize);
      },

      error: (err) => {
        this.message = err?.error?.message || err?.message || USER_MESSAGES.loadError;

        this.messageType = 'error';
      },
    });
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;

    return this.users.slice(start, start + this.pageSize);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}
