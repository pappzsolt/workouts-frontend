import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-coach-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './coach-dashboard.component.html',
  styleUrls: ['./coach-dashboard.component.css']
})
export class CoachDashboardComponent {
  constructor(private router: Router) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
