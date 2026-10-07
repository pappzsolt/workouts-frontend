import { matchesSearch } from '../components/app-search/search-match';
import { AppSearchComponent } from '../components/app-search/app-search.component';
import {
  errorMessage,
  responseMessage,
} from '../../../models/backend-dto/common/api-response-message';
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
  imports: [AppSearchComponent, ...SHARED_IMPORTS, AppSelectComponent],
  template: `
    @if (!searchable) {
      <app-search
        inputId="userSelectSearch"
        [searchTerm]="searchTerm"
        label="appSearch.usersLabel"
        placeholder="appSearch.usersPlaceholder"
        [showClearButton]="true"
        (searchTermChange)="onSearchChange($event)"
        class="mb-3 block"
        [disabled]="disabled"
      ></app-search>
      <app-message
        *ngIf="searchTerm.trim() && !matchingOptions.length"
        message="appSearch.noResults"
        type="info"
        class="mb-3 block"
      ></app-message>
    }
    <label for="userSelect" class="user-select-label">
      {{ 'userSelect.selectUser' | translate }}
    </label>
    <app-select
      id="userSelect"
      [value]="selectedUserId"
      [options]="searchable ? allUserOptions : userOptions"
      [searchable]="searchable"
      searchPlaceholder="appSearch.usersPlaceholder"
      [disabled]="disabled"
      placeholder="userSelect.selectUserOption"
      [placeholderValue]="undefined"
      (valueChange)="selectedUserId = $event; onChange($event)"
    ></app-select>
    <app-message [message]="message" [type]="messageType" class="block mt-3"></app-message>
  `,
  styleUrls: ['./user-select.component.css'],
})
export class UserSelectComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  private readonly logger = inject(LoggerService);

  users: UserNameId[] = [];
  message = '';
  messageType: 'info' | 'error' = 'info';

  @Input()
  selectedUserId?: number;

  @Input()
  disabled = false;

  @Input() searchable = false;

  @Output()
  selectedUserIdChange = new EventEmitter<number>();

  @Output()
  userSelected = new EventEmitter<UserNameId>();

  constructor(private userService: UserNameIdService) {}

  searchTerm = '';

  get matchingOptions(): UserNameId[] {
    return this.users.filter((user) => matchesSearch(this.searchTerm, user.username));
  }

  get allUserOptions(): SelectOption<number>[] {
    return this.users.map((user) => ({ value: user.id, label: user.username }));
  }

  get userOptions(): SelectOption<number>[] {
    return this.users
      .filter(
        (user) => user.id === this.selectedUserId || matchesSearch(this.searchTerm, user.username),
      )
      .map((user) => ({ value: user.id, label: user.username }));
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    if (!term.trim()) return;
    const first = this.matchingOptions[0];
    if (!first || first.id === this.selectedUserId) return;
    this.selectedUserId = first.id;
    this.onChange(first.id);
  }

  ngOnInit(): void {
    this.userService
      .getAllUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.users = response.success ? (response.data ?? []) : [];
          this.message = responseMessage(
            [response],
            response.success ? '' : 'userSelect.loadError',
          );
          this.messageType = response.success ? 'info' : 'error';
        },

        error: (err) => {
          this.message = errorMessage(err, 'userSelect.loadError');
          this.messageType = 'error';
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
