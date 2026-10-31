import { matchesSearch } from '../../../shared/components/app-search/search-match';
import { AppSearchComponent } from '../../../shared/components/app-search/app-search.component';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdminListUsersService } from '../../../../services/admin/admin-list-users.service';
import { User } from '../../../../models/user.model';
import { USER_MESSAGES } from '../../../../constants/user-messages';

import { AppHeadingDirective } from '../../../shared/components/app-page-header/app-page-header.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AppCardComponent } from '../../../shared/components/app-card/app-card.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-admin-list-users',
  standalone: true,
  imports: [
    AppSearchComponent,
    AppHeadingDirective,
    CommonModule,
    TranslatePipe,
    MessageComponent,
    PaginationComponent,
    AppCardComponent,
    AppIconComponent,
  ],
  templateUrl: './admin-list-users.component.html',
  styleUrls: ['./admin-list-users.component.css'],
})
export class AdminListUsersComponent {
  private readonly destroyRef = inject(DestroyRef);

  users: User[] = [];
  searchTerm = "";

  message = '';
  messageType: 'success' | 'error' | '' = '';

  // Lapozás
  currentPage = 1;
  pageSize = 6;
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get filteredUsers(): User[] {
    return this.users.filter(user => matchesSearch(this.searchTerm, user.username, user.email, user.roles.join(' ')));
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
  }

  constructor(private readonly adminListUsersService: AdminListUsersService) {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.message = '';
    this.messageType = '';

    this.adminListUsersService.getUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (users) => {
        this.users = users;

        this.currentPage = 1;
      },

      error: (err) => {
        this.message = err?.error?.message || err?.message || USER_MESSAGES.loadError;

        this.messageType = 'error';
      },
    });
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;

    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  onPageChange(page: number): void {
    if (Number.isInteger(page) && page >= 1 && page <= this.totalPages) this.currentPage = page;
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
  trackByUser(index: number, user: { id?: number }): number {
    return user.id ?? index;
  }

}
