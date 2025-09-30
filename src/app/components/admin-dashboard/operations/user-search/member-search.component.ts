import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemberSearchService } from '../../../../services/admin/member-search.service';
import { USER_MESSAGES } from '../../../../constants/user-messages';
import { Member } from '../../../../models/member-search-model';

@Component({
  selector: 'app-member-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './member-search.component.html',
  styleUrls: ['./member-search.component.css']
})
export class MemberSearchComponent {
  keyword = '';
  members: (Member & { coach?: any })[] = [];
  displayedMembers: (Member & { coach?: any })[] = []; // csak a jelenlegi oldal
  message = '';
  errorMessage = '';
  loading = false;
  viewMode: 'grid' | 'table' = 'grid';

  // Pagination
  currentPage = 1;
  pageSize = 6; // lap mérete
  totalPages = 1;

  constructor(private memberSearchService: MemberSearchService) {}

  onSearch() {
    this.errorMessage = '';
    this.message = '';
    this.loading = true;

    this.memberSearchService.searchMembers(this.keyword).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.members = res.data;
          this.totalPages = Math.ceil(this.members.length / this.pageSize);
          this.currentPage = 1;
          this.updateDisplayedMembers();

          if (this.members.length === 0) {
            this.message = USER_MESSAGES.notFound;
          } else {
            this.message = res.message;
          }
        } else {
          this.message = USER_MESSAGES.notResult;
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err;
      }
    });
  }

  // Frissíti a jelenlegi oldalon látható tagokat
  updateDisplayedMembers() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedMembers = this.members.slice(startIndex, endIndex);
  }

  // Lapozás
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayedMembers();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateDisplayedMembers();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateDisplayedMembers();
    }
  }
}
