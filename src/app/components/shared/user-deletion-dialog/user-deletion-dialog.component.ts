import { AppButtonComponent } from '../components/app-button/app-button.component';
import { AppInputDirective } from '../components/form-controls/app-input.directive';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { AppDialogComponent } from '../components/app-dialog/app-dialog.component';
import { AdminUserDeletionService, UserDeletionPreview } from '../../../services/account-deletion/admin-user-deletion.service';

@Component({
  selector: 'app-user-deletion-dialog', standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, AppDialogComponent, AppButtonComponent, AppInputDirective],
  templateUrl: './user-deletion-dialog.component.html',
})
export class UserDeletionDialogComponent implements OnInit {
  @Input({ required: true }) lookup!: { userId?: number; email?: string };
  @Input() deletionRequestId?: number;
  @Output() deleted = new EventEmitter<number>();
  @Output() closed = new EventEmitter<void>();
  private readonly service = inject(AdminUserDeletionService);
  private readonly destroyRef = inject(DestroyRef);
  preview?: UserDeletionPreview;
  loading = true;
  saving = false;
  email = '';
  verified = false;
  error = '';
  readonly countKeys = ['workouts', 'programAssignments', 'personalPrograms', 'templates', 'reports'] as const;
  get canDelete(): boolean {
    return !!this.preview?.deletable && !!this.preview.accountUuid && this.verified &&
      this.email.trim().toLowerCase() === this.preview.email.trim().toLowerCase() && !this.saving;
  }
  ngOnInit(): void {
    this.service.preview(this.lookup).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: preview => { this.preview = preview; this.loading = false; },
      error: () => { this.error = 'userDeletion.loadError'; this.loading = false; },
    });
  }
  submit(): void {
    if (!this.canDelete || !this.preview) return;
    this.saving = true; this.error = '';
    this.service.delete(this.preview, this.email.trim(), this.deletionRequestId)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: id => { this.saving = false; this.deleted.emit(id); },
        error: () => { this.saving = false; this.error = 'userDeletion.deleteError'; this.verified = false; },
      });
  }
}
