import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.css']
})
export class UserEditComponent {
  user = { name: '', email: '', password: '' };

  constructor(private router: Router) {}

  onSubmit() {
    // itt majd jön a frissítés logika
    console.log('User data:', this.user);
  }
}
