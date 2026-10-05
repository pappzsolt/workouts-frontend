import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserNameIdService } from '../../../services/user/user-name-id.service';
import type { UserNameId } from '../../../models/common/user-name-id.model';
import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-user-multi-select',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <fieldset data-testid="program-users" [disabled]="disabled || !ready"
      class="max-h-64 overflow-y-auto rounded-lg border border-surface-300 p-3">
      <legend class="px-1 text-sm font-semibold">{{ 'userSelect.selectUser' | translate }}</legend>
      <label *ngFor="let user of users" class="flex min-h-11 items-center gap-3 break-words">
        <input type="checkbox" [attr.data-user-id]="user.id"
          [checked]="selectedUserIds.includes(user.id)"
          [disabled]="assignedUserIds.includes(user.id)"
          (change)="toggle(user.id, $event)" />
        <span>{{ user.username }}</span>
      </label>
    </fieldset>
    <app-message *ngIf="message" [message]="message" type="error"></app-message>
  `,
})
export class UserMultiSelectComponent implements OnInit, OnChanges {
  private readonly service = inject(UserNameIdService);
  private readonly destroyRef = inject(DestroyRef);
  @Input() selectedUserIds: number[] = [];
  @Input() assignedUserIds: number[] = [];
  @Input() disabled = false;
  @Output() readonly selectedUserIdsChange = new EventEmitter<number[]>();
  @Output() readonly readyChange = new EventEmitter<boolean>();
  users: UserNameId[] = [];
  ready = false;
  message = '';
  private loaded = false;

  ngOnInit(): void {
    this.service.getAllUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (!response.success || !Array.isArray(response.data)) {
          this.fail();
          return;
        }
        this.users = [...response.data];
        this.loaded = true;
        this.validateAvailableUsers();
      },
      error: () => this.fail(),
    });
  }

  ngOnChanges(): void {
    if (this.loaded) this.validateAvailableUsers();
  }

  private validateAvailableUsers(): void {
    const ids = new Set(this.users.map(user => user.id));
    if (this.assignedUserIds.some(id => !ids.has(id))) {
      this.fail();
      return;
    }
    this.message = '';
    this.ready = true;
    this.readyChange.emit(true);
  }

  private fail(): void {
    this.ready = false;
    this.message = 'coachProgramBuilder.assignError';
    this.readyChange.emit(false);
  }

  toggle(id: number, event: Event): void {
    if (!this.ready || this.disabled || this.assignedUserIds.includes(id) ||
        !(event.target instanceof HTMLInputElement)) return;
    const selected = event.target.checked
      ? [...new Set([...this.selectedUserIds, id])]
      : this.selectedUserIds.filter(value => value !== id);
    this.selectedUserIdsChange.emit(selected);
  }
}
