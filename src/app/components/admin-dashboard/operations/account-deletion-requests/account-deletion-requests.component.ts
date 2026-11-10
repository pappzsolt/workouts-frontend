import { UserDeletionDialogComponent } from '../../../shared/user-deletion-dialog/user-deletion-dialog.component';
import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { AccountDeletionService, DeletionRequest } from '../../../../services/account-deletion/account-deletion.service';

@Component({
  selector: 'app-account-deletion-requests', standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, UserDeletionDialogComponent],
  templateUrl: './account-deletion-requests.component.html',
})
export class AccountDeletionRequestsComponent {
  private readonly service = inject(AccountDeletionService);
  private readonly destroyRef = inject(DestroyRef);
  rows: DeletionRequest[] = [];
  deleting: DeletionRequest | null = null;
  deletionSuccess = false;
  onUserDeleted(): void {
    this.deleting = null; this.selected = null; this.deletionSuccess = true; this.load(this.page);
  }
  page = 0;
  totalPages = 0;
  loading = false;
  saving = false;
  error = '';
  selected: DeletionRequest | null = null;
  decision: 'COMPLETED' | 'REJECTED' = 'COMPLETED';
  note = '';
  confirmed = false;
  constructor() { this.load(0); }
  load(page: number): void {
    if (this.loading || this.saving) return;
    this.loading = true;
    this.error = '';
    this.service.list(page).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => { this.rows = data.content; this.page = data.page; this.totalPages = data.totalPages; this.loading = false; },
      error: () => { this.error = 'deleteAccount.admin.loadError'; this.loading = false; },
    });
  }
  select(row: DeletionRequest): void {
    this.selected = row;
    this.decision = 'COMPLETED';
    this.note = '';
    this.confirmed = false;
    this.error = '';
  }
  save(): void {
    if (!this.selected || this.saving || !this.confirmed || !this.note.trim() || this.note.length > 2000) return;
    this.saving = true;
    this.error = '';
    this.service.resolve(this.selected.id, this.decision, this.note.trim())
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.saving = false; this.selected = null; this.load(this.page); },
        error: () => { this.saving = false; this.error = 'deleteAccount.admin.saveError'; },
      });
  }
}
