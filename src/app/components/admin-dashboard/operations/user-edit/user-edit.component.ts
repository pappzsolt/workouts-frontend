import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserEditService, User } from '../../../../services/admin/user-edit.service';
import { RoleSelectComponent } from '../../../shared/roles/role-select.component';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';
import { UserSelectComponent } from '../../../../components/shared/user/user-select.component'; // 🔹 módosítva

@Component({
  selector: 'app-user-edit',
  standalone: true,
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.css'],
  imports: [CommonModule, FormsModule, RoleSelectComponent, CoachSelectComponent, UserSelectComponent], // 🔹 módosítva
  providers: [UserEditService]
})
export class UserEditComponent implements OnInit {
  users: User[] = [];
  selectedUserId?: number;
  selectedUser: User = {
    id: 0,
    username: '',
    email: '',
    password: '',
    avatarUrl: '',
    age: undefined,
    weight: undefined,
    height: undefined,
    gender: '',
    goals: '',
    coachId: undefined,
    roleId: undefined
  };

  selectedRole?: any;   // a RoleSelectComponent kezeli
  selectedCoach?: any;  // a CoachSelectComponent kezeli

  constructor(private userService: UserEditService) {}

  ngOnInit(): void {
    this.userService.getUsers().subscribe({
      next: users => this.users = users,
      error: err => console.error('Hiba a felhasználók lekérésekor:', err)
    });
  }

  onUserSelected(user: User): void {
    this.selectedUserId = user.id;
    this.selectedUser = { ...user, password: '' };
    if (user.roleId) this.selectedRole = { id: user.roleId, name: '' };
    if (user.coachId) this.selectedCoach = { id: user.coachId, name: '' };
  }

  onRoleSelected(role: any): void {
    this.selectedRole = role;
    this.selectedUser.roleId = role.id;
  }

  onCoachSelected(coach: any): void {
    this.selectedCoach = coach;
    this.selectedUser.coachId = coach.id;
  }

  onSave(): void {
    this.userService.updateUser(this.selectedUser).subscribe({
      next: () => alert('Felhasználó sikeresen frissítve!'),
      error: err => alert('Hiba a frissítés során: ' + err.message)
    });
  }
}
