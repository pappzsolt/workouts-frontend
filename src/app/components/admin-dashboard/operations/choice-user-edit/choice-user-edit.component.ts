import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-choice-edit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './choice-user-edit.component.html',
  styleUrls: ['./choice-user-edit.component.css']
})
export class ChoiceUserEditComponent {
  constructor(private router: Router) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
