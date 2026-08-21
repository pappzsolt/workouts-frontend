import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MemberSearchService } from '../../../../services/admin/member-search.service';
import { USER_MESSAGES } from '../../../../constants/user-messages';
import { Member } from '../../../../models/member-search-model';

@Component({
  selector: 'app-member-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './member-search.component.html',
  styleUrls: ['./member-search.component.css']
})
export class MemberSearchComponent {

  keyword = '';

  members: Member[] = [];
  displayedMembers: Member[] = [];

  message = '';
  errorMessage = '';
  loading = false;

  viewMode: 'grid' | 'table' = 'grid';

  // Pagination
  currentPage = 1;
  pageSize = 6;
  totalPages = 1;

  constructor(
    private memberSearchService: MemberSearchService
  ) {}

  onSearch(): void {

    this.errorMessage = '';
    this.message = '';
    this.loading = true;

    this.memberSearchService.searchMembers(this.keyword).subscribe({

      next: (response) => {

        this.loading = false;

        if (!response.success) {
          this.members = [];
          this.displayedMembers = [];
          this.totalPages = 1;
          this.currentPage = 1;
          this.message = USER_MESSAGES.notResult;
          return;
        }

        this.members = response.data;

        this.currentPage = 1;

        this.calculateTotalPages();
        this.updateDisplayedMembers();

        if (this.members.length === 0) {
          this.message = USER_MESSAGES.notFound;
        } else {
          this.message = response.message;
        }
      },

      error: (error) => {

        this.loading = false;

        this.members = [];
        this.displayedMembers = [];
        this.totalPages = 1;
        this.currentPage = 1;

        this.errorMessage =
          typeof error === 'string'
            ? error
            : 'Hiba történt a keresés során.';
      }
    });
  }

  private calculateTotalPages(): void {

    this.totalPages = Math.max(
      1,
      Math.ceil(this.members.length / this.pageSize)
    );
  }

  updateDisplayedMembers(): void {

    const startIndex =
      (this.currentPage - 1) * this.pageSize;

    const endIndex =
      startIndex + this.pageSize;

    this.displayedMembers =
      this.members.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {

    if (
      page < 1 ||
      page > this.totalPages ||
      page === this.currentPage
    ) {
      return;
    }

    this.currentPage = page;
    this.updateDisplayedMembers();
  }

  nextPage(): void {

    if (this.currentPage >= this.totalPages) {
      return;
    }

    this.currentPage++;
    this.updateDisplayedMembers();
  }

  prevPage(): void {

    if (this.currentPage <= 1) {
      return;
    }

    this.currentPage--;
    this.updateDisplayedMembers();
  }
}
