import type { UserNameId } from '../../../models/common/user-name-id.model';
import { Component, OnInit, Input, Output, EventEmitter, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '../../../services/logger.service';

import { UserNameIdService } from '../../../services/user/user-name-id.service';

import { AppSelectComponent } from '../components/app-select/app-select.component';
import type { SelectOption } from '../../../models/common/select-option.model';

import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-user-select',
  standalone: true,
  imports: [...SHARED_IMPORTS, AppSelectComponent],
  template: `
    <label for="userSelect" class="user-select-label">
      {{ 'userSelect.selectUser' | translate }}
    </label>

    <app-select
      id="userSelect"
      [value]="selectedUserId"
      [options]="userOptions"
      [disabled]="disabled"
      placeholder="userSelect.selectUserOption"
      [placeholderValue]="undefined"
      (valueChange)="selectedUserId = $event; onChange($event)"
    ></app-select>
  `,
  styleUrls: ['./user-select.component.css'],
})
export class UserSelectComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  private readonly logger = inject(LoggerService);

  users: UserNameId[] = [];

  @Input()
  selectedUserId?: number;

  @Input()
  disabled = false;

  @Output()
  selectedUserIdChange = new EventEmitter<number>();

  @Output()
  userSelected = new EventEmitter<UserNameId>();

  constructor(private userService: UserNameIdService) {}

  get userOptions(): SelectOption<number>[] {
    return this.users.map((user) => ({ value: user.id, label: user.username }));
  }

  ngOnInit(): void {
    this.userService.getAllUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.users = response.data ?? [];
      },

      error: (err) => {
        this.logger.error('Hiba a felhasználók lekérésekor:', err);
        this.users = [];
      },
    });
  }

  onChange(id?: number): void {
    this.selectedUserIdChange.emit(id);

    const user = this.users.find((u) => u.id === id);

    if (user) {
      this.userSelected.emit(user);
    }
  }


}
