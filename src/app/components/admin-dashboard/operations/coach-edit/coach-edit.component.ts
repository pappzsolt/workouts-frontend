import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-coach-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coach-edit.component.html',
  styleUrls: ['./coach-edit.component.css']
})
export class CoachEditComponent {
  coach = { name: '', email: '', password: '' };

  constructor(private router: Router) {}

  onSubmit() {
    // itt majd jön a frissítés logika
    console.log('Coach data:', this.coach);
  }
}
