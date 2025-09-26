import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserEditService, User, Coach, Role } from '../../../../services/admin/user-edit.service';
import { UserSelectComponent } from '../../../../components/shared/user/user-select.component';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';
import { RoleSelectComponent } from '../../../shared/roles/role-select.component';
import { UserNameId } from '../../../../services/user/user-name-id.service';
import { Role as RoleModel } from '../../../../services/roles/role.service';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, UserSelectComponent, CoachSelectComponent, RoleSelectComponent],
  templateUrl: './user-edit.component.html',
})
export class UserEditComponent implements OnInit {
  users: User[] = [];
  selectedUserId?: number;
  selectedUser: User | null = null;

  coaches: Coach[] = [];
  roles: Role[] = [];

  selectedCoach?: Coach;
  selectedRole?: Role;

  constructor(private userService: UserEditService) {}

  ngOnInit(): void {
    // Teljes user lista
    this.userService.getUsers().subscribe({
      next: (users) => this.users = users,
      error: (err) => console.error(err)
    });

    // Coach lista
    this.userService.getCoaches().subscribe({
      next: (coaches) => this.coaches = coaches,
      error: (err) => console.error(err)
    });

    // Role lista
    this.userService.getRoles().subscribe({
      next: (roles) => this.roles = roles,
      error: (err) => console.error(err)
    });
  }

  onUserSelected(user: UserNameId): void {
    this.selectedUserId = user.id;

    const foundUser = this.users.find(u => u.id === user.id);
    if (foundUser) {
      this.selectedUser = { ...foundUser, password: '' };

      // 🔹 Itt állítjuk be a combobox Role-ját a RoleService Role típusára
      if (foundUser.roleId) {
        this.selectedRole = { id: foundUser.roleId, name: '' } as RoleModel;
      } else {
        this.selectedRole = undefined;
      }

      this.selectedCoach = foundUser.coachId ? { id: foundUser.coachId, name: '' } : undefined;
    } else {
      this.selectedUser = null;
      this.selectedCoach = undefined;
      this.selectedRole = undefined;
    }
  }


  onCoachSelected(coach: Coach): void {
    this.selectedCoach = coach;
    if (this.selectedUser) this.selectedUser.coachId = coach.id;
  }

  onRoleSelected(role: Role): void {
    this.selectedRole = role;
    if (this.selectedUser) this.selectedUser.roleId = role.id;
  }

  onSave(): void {
    if (this.selectedUser) {
      this.userService.updateUser(this.selectedUser).subscribe({
        next: () => alert('Felhasználó sikeresen frissítve!'),
        error: (err) => alert('Hiba a frissítés során: ' + err.message)
      });
    }
  }
}
