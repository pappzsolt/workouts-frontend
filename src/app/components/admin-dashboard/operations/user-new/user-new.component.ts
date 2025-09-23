import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  constructor( private router: Router) {}

  onSubmit() {

  }
}
