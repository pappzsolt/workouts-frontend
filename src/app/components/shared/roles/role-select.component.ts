import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role, RoleService } from '../../../services/roles/role.service';

@Component({
  selector: 'app-role-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <label for="roleSelect" class="block text-gray-700 mb-1">Role</label>
      <select id="roleSelect"
              [(ngModel)]="selectedRole"
              (change)="onRoleChange()"
              class="border rounded px-2 py-1 w-full">
        <option [ngValue]="undefined">-- Válassz --</option>
        <option *ngFor="let role of roles" [ngValue]="role">{{ role.name }}</option>
      </select>
      <div *ngIf="errorMessage" class="text-red-600 text-sm mt-1">{{ errorMessage }}</div>
    </div>
  `
})
export class RoleSelectComponent implements OnInit {
  @Input() roles: Role[] = []; // 🔹 Binding a parentből
  @Input() selectedRole?: Role;
  @Output() roleSelected = new EventEmitter<Role>();

  errorMessage = '';

  constructor(private roleService: RoleService) {}

  ngOnInit(): void {
    if (!this.roles.length) {
      this.roleService.getRoles().subscribe({
        next: (roles) => {
          this.roles = roles;
          // 🔹 Ha van kiválasztott role, illeszd az új listához
          if (this.selectedRole) {
            const match = this.roles.find(r => r.id === this.selectedRole?.id);
            if (match) {
              this.selectedRole = match;
            }
          }
        },
        error: (err) => {
          this.errorMessage = err.message || 'Hiba történt a role-ok lekérésekor';
        }
      });
    }
  }

  onRoleChange(): void {
    if (this.selectedRole) {
      this.roleSelected.emit(this.selectedRole);
      this.selectedRole = undefined; // 🔹 reset a select mező
    }
  }
}
