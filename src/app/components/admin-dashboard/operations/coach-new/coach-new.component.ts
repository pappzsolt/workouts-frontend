import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { CoachNewService } from '../../../../services/admin/coach-new.service';

@Component({
  selector: 'app-coach-new',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-new.component.html',
  styleUrls: ['./coach-new.component.css']
})
export class CoachNewComponent {
  user: any = {
    name: '',
    email: '',
    passwordHash: '',
    phone: '',
    specialization: '',
    avatarUrl: ''
  };

  message = '';
  isError = false;

  constructor(private coachNewService: CoachNewService) {}

  onSubmit(form: NgForm) {
    if (!form.valid) {
      this.message = 'Kérlek töltsd ki az összes kötelező mezőt és adj meg érvényes adatokat!';
      this.isError = true;
      return;
    }

    const payload = {
      type: 'coach',
      name: this.user.name,
      email: this.user.email,
      passwordHash: this.user.passwordHash,
      avatarUrl: this.user.avatarUrl,
      phone: this.user.phone,
      specialization: this.user.specialization,
      roleIds: [3] // fix roleId a coach
    };
    this.coachNewService.createCoach(payload).subscribe({
      next: (res) => {
        this.message = res.message || 'Sikeres létrehozás';
        this.isError = !res.success;
        if (res.success) {

          form.resetForm();
        }
      },
      error: (err) => {
        this.message = err.error?.message || 'Hiba a mentésnél';
        this.isError = true;
      }
    });
  }
}
