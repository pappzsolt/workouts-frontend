import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chioice-user-new',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './choice-user-new.component.html',
  styleUrls: ['./choice-user-new.component.css']
})
export class ChoiceUserNewComponent {

  constructor(private router: Router) {}

  // A navigateTo metódus
  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
