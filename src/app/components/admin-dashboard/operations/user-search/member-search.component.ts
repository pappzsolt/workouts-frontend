import { Component } from '@angular/core';

import { MemberSearchService } from '../../../../services/admin/member-search.service';

import { USER_MESSAGES } from '../../../../constants/user-messages';
import { Member } from '../../../../models/member-search-model';

import { MessageComponent } from '../../../shared/message/message.component';
import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-member-search',
  standalone: true,
  imports: [...SHARED_IMPORTS, MessageComponent],
  templateUrl: './member-search.component.html',
  styleUrls: ['./member-search.component.css'],
})
export class MemberSearchComponent {
  // =============================
  // KERESÉS
  // =============================

  keyword = '';

  members: Member[] = [];

  displayedMembers: Member[] = [];

  // =============================
  // ÁLLAPOT
  // =============================

  loading = false;

  viewMode: 'grid' | 'table' = 'grid';

  // =============================
  // ÜZENET
  // =============================

  message = '';

  messageType: 'success' | 'error' | '' = '';

  // =============================
  // LAPOZÁS
  // =============================

  currentPage = 1;

  pageSize = 6;

  totalPages = 1;

  constructor(private readonly memberSearchService: MemberSearchService) {}

  // =============================
  // KERESÉS
  // =============================

  onSearch(): void {
    this.clearMessage();

    this.loading = true;

    this.memberSearchService.searchMembers(this.keyword).subscribe({
      next: (response) => {
        this.loading = false;

        if (!response.success) {
          this.clearMembers();

          this.showError(USER_MESSAGES.notResult);

          return;
        }

        this.members = response.data;

        this.currentPage = 1;

        this.calculateTotalPages();

        this.updateDisplayedMembers();

        if (this.members.length === 0) {
          this.showError(USER_MESSAGES.notFound);

          return;
        }

        this.showSuccess(response.message);
      },

      error: (error) => {
        this.loading = false;

        this.clearMembers();

        const errorMessage = typeof error === 'string' ? error : 'memberSearch.searchError';

        this.showError(errorMessage);
      },
    });
  }

  // =============================
  // LAPOZÁS SZÁMÍTÁSA
  // =============================

  private calculateTotalPages(): void {
    this.totalPages = Math.max(1, Math.ceil(this.members.length / this.pageSize));
  }

  // =============================
  // MEGJELENÍTETT TAGOK
  // =============================

  updateDisplayedMembers(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;

    const endIndex = startIndex + this.pageSize;

    this.displayedMembers = this.members.slice(startIndex, endIndex);
  }

  // =============================
  // OLDALRA UGRÁS
  // =============================

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;

    this.updateDisplayedMembers();
  }

  // =============================
  // KÖVETKEZŐ OLDAL
  // =============================

  nextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return;
    }

    this.currentPage++;

    this.updateDisplayedMembers();
  }

  // =============================
  // ELŐZŐ OLDAL
  // =============================

  prevPage(): void {
    if (this.currentPage <= 1) {
      return;
    }

    this.currentPage--;

    this.updateDisplayedMembers();
  }

  // =============================
  // MEMBERS TÖRLÉSE
  // =============================

  private clearMembers(): void {
    this.members = [];

    this.displayedMembers = [];

    this.currentPage = 1;

    this.totalPages = 1;
  }

  // =============================
  // MESSAGE SEGÉDMETÓDUSOK
  // =============================

  private showSuccess(message: string): void {
    this.message = message;

    this.messageType = 'success';
  }

  private showError(message: string): void {
    this.message = message;

    this.messageType = 'error';
  }

  private clearMessage(): void {
    this.message = '';

    this.messageType = '';
  }
}
