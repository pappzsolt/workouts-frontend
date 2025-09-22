import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-new',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-new.component.html',
  styleUrls: ['./user-new.component.css']
})
export class UserNewComponent {
  user = { name: '', email: '', password: '' };

  constructor(private userService: UserService, private router: Router) {}

  onSubmit() {
    this.userService.createUser(this.user).subscribe({
      next: () => this.router.navigate(['/admin/users']),
      error: (err) => console.error(err)
    });
  }
}
