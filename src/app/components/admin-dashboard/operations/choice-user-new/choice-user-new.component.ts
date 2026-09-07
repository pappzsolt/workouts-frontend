import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { SHARED_IMPORTS } from '../../../shared/shared-imports';

@Component({
  selector: 'app-chioice-user-new',
  standalone: true,
  imports: [...SHARED_IMPORTS],
  templateUrl: './choice-user-new.component.html',
  styleUrls: ['./choice-user-new.component.css'],
})
export class ChoiceUserNewComponent {
  constructor(private router: Router) {}

  // A navigateTo metódus
  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}
