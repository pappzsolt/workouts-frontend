import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserEditService, User } from '../../../services/admin/user-edit.service';

@Component({
  selector: 'app-user-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <label for="userSelect" class="block mb-1">Válassz felhasználót</label>
    <select id="userSelect" [(ngModel)]="selectedUserId" (ngModelChange)="onChange($event)"
            class="border rounded px-2 py-1 w-full">
      <option [ngValue]="undefined">-- Válassz felhasználót --</option>
      <option *ngFor="let u of users" [ngValue]="u.id">{{ u.username }}</option>
    </select>
  `
})
export class UserSelectComponent implements OnInit {
  users: User[] = [];

  @Input() selectedUserId?: number;
  @Output() selectedUserIdChange = new EventEmitter<number>();
  @Output() userSelected = new EventEmitter<User>();

  constructor(private userService: UserEditService) {}

  ngOnInit(): void {
    this.userService.getUsers().subscribe({
      next: users => this.users = users,
      error: err => console.error('Hiba a felhasználók lekérésekor:', err)
    });
  }

  onChange(id?: number): void {
    this.selectedUserIdChange.emit(id);
    const user = this.users.find(u => u.id === id);
    if (user) {
      this.userSelected.emit(user);
    }
  }
}
