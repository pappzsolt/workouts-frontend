import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { CoachNewService } from '../../../../services/admin/coach-new.service';

@Component({
  selector: 'app-user-new',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-new.component.html'
})
export class UserNewComponent {
  user: any = {
    username: '',
    email: '',
    password: '',
    age: null,
    weight: null,
    height: null,
    gender: '',
    goals: '',
    avatar_url: '',
    coach_id: null
  };

  message = '';
  isError = false;

  constructor(private coachNewService: CoachNewService) {}

  onSubmit(form: NgForm) {
    console.log('Form submit triggered', this.user);

    if (!form.valid) {
      this.message = 'Kérlek töltsd ki az összes kötelező mezőt!';
      this.isError = true;
      return;
    }

    this.coachNewService.createCoach(this.user).subscribe({
      next: (res) => {
        this.message = res.message || 'Sikeres létrehozás';
        this.isError = !res.success;
        if (res.success) {
          console.log('User created successfully');
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
