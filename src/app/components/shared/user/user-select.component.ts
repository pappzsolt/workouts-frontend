import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { UserNameIdService, UserNameId } from '../../../services/user/user-name-id.service';

import { SHARED_IMPORTS } from '../shared-imports';

@Component({
  selector: 'app-user-select',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  template: `
    <label for="userSelect" class="user-select-label">
      {{ 'userSelect.selectUser' | translate }}
    </label>

    <select
      id="userSelect"
      [(ngModel)]="selectedUserId"
      (ngModelChange)="onChange($event)"
      [disabled]="disabled"
      class="user-select-control"
    >
      <option [ngValue]="undefined">
        {{ 'userSelect.selectUserOption' | translate }}
      </option>

      <option *ngFor="let u of users" [ngValue]="u.id">
        {{ u.username }}
      </option>
    </select>
  `,
  styleUrls: ['./user-select.component.css'],
})
export class UserSelectComponent implements OnInit {
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

  ngOnInit(): void {
    this.userService.getAllUsers().subscribe({
      next: (response) => {
        this.users = response.data ?? [];
      },

      error: (err) => {
        console.error('Hiba a felhasználók lekérésekor:', err);
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
