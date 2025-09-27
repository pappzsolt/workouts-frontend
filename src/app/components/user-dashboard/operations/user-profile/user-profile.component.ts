import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserProfilService, RawUser, Coach } from '../../../../services/user/user-profile/user-profile.service';
import { CoachSelectComponent } from '../../../shared/coach/coach-select.component';
import { Role, RoleService } from '../../../../services/roles/role.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import {USER_MESSAGES} from '../../../../constants/user-messages';

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
  roleName?: string;
}

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, CoachSelectComponent,MatFormFieldModule,MatSelectModule,MatInputModule],
  templateUrl: './user-profile.component.html',
})
export class UserProfileComponent implements OnInit {
  users: RawUser[] = [];


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
    roleName: undefined
  };

  coaches: Coach[] = [];
  roles: Role[] = [];
  selectedCoach?: Coach;
  selectedRoles: Role[] = []; // 🔹 Több role kezelése
  message: string = '';
  constructor(
    private userService: UserProfilService,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // Coachok
    this.userService.getCoaches().subscribe(coaches => {
      this.coaches = coaches;
      this.cdr.detectChanges();
    });

    // Role-ok
    this.roleService.getRoles().subscribe(roles => {
      this.roles = roles;
      this.cdr.detectChanges();
    });

    // Felhasználók
    const userId = this.authService.getUserId();
    if (userId) {
      this.userService.getMemberById(userId).subscribe({
        next: (profile: any) => {
          this.selectedUser = {
            id: profile.id,
            username: profile.usernameOrName || '',
            email: profile.email || '',
            password: '',
            avatarUrl: profile.avatarUrl || '',
            age: profile.extraFields?.age,
            weight: profile.extraFields?.weight,
            height: profile.extraFields?.height,
            gender: profile.extraFields?.gender,
            goals: profile.extraFields?.goals,
            coachId: profile.extraFields?.coach_id,
            roleName: undefined
          };
          console.log('Profile loaded:', this.selectedUser);
        },
        error: (err: any) => {
          console.error('Profil betöltési hiba', err);
          this.message = USER_MESSAGES.loadProfileError;
        }
      });
    } else {
      console.warn('Nincs bejelentkezett user ID');
      this.message = USER_MESSAGES.noUserId;
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
      coachId: raw.extraFields?.coach_id,
      roleName: undefined
    };

    this.selectedCoach = this.coaches.find(c => c.id === this.selectedUser.coachId);

    // 🔹 Több role beállítása a felhasználóhoz
    this.selectedRoles = this.roles.filter(r => raw.roles?.includes(r.name));

    this.cdr.detectChanges();
  }

  onCoachSelected(coach: Coach) {
    this.selectedCoach = coach;
    this.selectedUser.coachId = coach.id;
  }

  onRoleSelected(roles: Role[]) {
    this.selectedRoles = roles;
  }

  onSave() {
    if (this.selectedUser) {
      const rawUser: RawUser = {
        id: this.selectedUser.id,
        usernameOrName: this.selectedUser.username,
        email: this.selectedUser.email,
        avatarUrl: this.selectedUser.avatarUrl,
        roles: this.selectedRoles.map(r => r.name), // 🔹 Több role mentése
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
