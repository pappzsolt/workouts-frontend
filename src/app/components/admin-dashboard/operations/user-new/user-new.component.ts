// Eltávolítjuk a helyi interface Role-t
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { UserNewService } from '../../../../services/admin/user-new.service';
import { RoleSelectComponent } from '../../../shared/roles/role-select.component';
import { Role } from '../../../../services/roles/role.service'; // 🔹 ide importáljuk a service-ből

@Component({
  selector: 'app-user-new',
  standalone: true,
  imports: [CommonModule, FormsModule, RoleSelectComponent],
  templateUrl: './user-new.component.html',
  styleUrls: ['./user-new.component.css']
})
export class UserNewComponent {
  user: any = {
    username: '',
    email: '',
    passwordHash: '',
    avatarUrl: '',
    age: null,
    weight: null,
    height: null,
    gender: '',
    goals: '',
    coachId: null,
    roleIds: [] as Role[] // Role objektumokat tartalmaz
  };

  roles: Role[] = []; // ide tölthető a RoleSelectComponent által használt role lista

  message = '';
  isError = false;

  constructor(private userNewService: UserNewService) {}

  // 🔹 explicit Role típus használata
  onRoleSelected(role: Role) {
    if (!this.user.roleIds.some((r: Role) => r.id === role.id)) {
      this.user.roleIds.push(role);
    }
  }

  onRemoveRole(role: Role) {
    this.user.roleIds = this.user.roleIds.filter((r: Role) => r.id !== role.id);
  }

  onSubmit(form: NgForm) {
    if (!form.valid || this.user.roleIds.length === 0) {
      this.message = 'Kérlek töltsd ki az összes kötelező mezőt és válassz legalább egy szerepkört!';
      this.isError = true;
      return;
    }

    const payload = {
      type: 'user',
      username: this.user.username,
      email: this.user.email,
      passwordHash: this.user.passwordHash,
      avatarUrl: this.user.avatarUrl,
      age: this.user.age,
      weight: this.user.weight,
      height: this.user.height,
      gender: this.user.gender,
      goals: this.user.goals,
      coachId: this.user.coachId,
      roleIds: this.user.roleIds.map((r: Role) => r.id) // 🔹 explicit típus
    };

    this.userNewService.createUser(payload).subscribe({
      next: (res) => {
        this.message = res.message || 'Sikeres létrehozás';
        this.isError = !res.success;
        if (res.success) form.resetForm();
      },
      error: (err) => {
        this.message = err.error?.message || 'Hiba a mentésnél';
        this.isError = true;
      }
    });
  }
}
