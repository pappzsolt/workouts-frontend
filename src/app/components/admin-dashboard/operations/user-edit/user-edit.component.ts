import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserEditService, RawUser, Coach } from '../../../../services/admin/user-edit.service';
import { UserSelectComponent } from '../../../../components/shared/user/user-select.component';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';
import { UserNameId } from '../../../../services/user/user-name-id.service';

interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goals?: string;
  coachId?: number;
}

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, UserSelectComponent, CoachSelectComponent],
  templateUrl: './user-edit.component.html',
})
export class UserEditComponent implements OnInit {
  users: RawUser[] = [];
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
    coachId: undefined
  };

  coaches: Coach[] = [];
  selectedCoach?: Coach;

  constructor(private userService: UserEditService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Betöltjük a coach-okat
    this.userService.getCoaches().subscribe({
      next: (coaches) => {
        this.coaches = coaches;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });

    // Betöltjük a felhasználókat
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        if (this.users.length > 0) {
          this.selectedUserId = this.users[0].id;
          this.patchUserFromRaw(this.users[0]);
        }
      },
      error: (err) => console.error(err)
    });
  }

  onUserSelected(user: UserNameId): void {
    this.selectedUserId = user.id;
    const foundRaw = this.users.find(u => u.id === user.id);
    if (foundRaw) {
      this.patchUserFromRaw(foundRaw);
    } else {
      this.selectedUser = {
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
        coachId: undefined
      };
      this.selectedCoach = undefined;
    }
  }

  private patchUserFromRaw(raw: RawUser) {
    this.selectedUser = {
      id: raw.id,
      username: raw.usernameOrName || '',
      email: raw.email || '',
      password: '',
      avatarUrl: raw.avatarUrl || '',
      age: raw.extraFields?.age,
      weight: raw.extraFields?.weight,
      height: raw.extraFields?.height,
      gender: raw.extraFields?.gender,
      goals: raw.extraFields?.goals,
      coachId: raw.extraFields?.coach_id
    };

    // Coach kiválasztása a listából
    this.selectedCoach = this.coaches.find(c => c.id === this.selectedUser.coachId);

    this.cdr.detectChanges();
  }

  onCoachSelected(coach: Coach): void {
    this.selectedCoach = coach;
    this.selectedUser.coachId = coach.id;
  }

  onSave(): void {
    if (this.selectedUser) {
      const rawUser: RawUser = {
        id: this.selectedUser.id,
        usernameOrName: this.selectedUser.username,
        email: this.selectedUser.email,
        avatarUrl: this.selectedUser.avatarUrl,
        roles: [], // Role eltávolítva
        extraFields: {
          coach_id: this.selectedUser.coachId,
          age: this.selectedUser.age,
          weight: this.selectedUser.weight,
          height: this.selectedUser.height,
          gender: this.selectedUser.gender,
          goals: this.selectedUser.goals
        }
      };

      this.userService.updateUser(rawUser, []).subscribe({
        next: () => alert('Felhasználó sikeresen frissítve!'),
        error: (err) => alert('Hiba a frissítés során: ' + err.message)
      });
    }
  }
}
