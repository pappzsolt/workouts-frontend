import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CoachMenuComponent } from '../../components/dynamic-menu/coach-menu/coach-menu.component';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-coach-layout',
  standalone: true,
  imports: [RouterModule, CoachMenuComponent],
  templateUrl: './coach-layout.component.html',
  styleUrls: ['./coach-layout.component.css']
})
export class CoachLayoutComponent implements OnInit {
  username: string | null = null;
  role: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.username = this.authService.getUserName(); // sub-ból jön
    this.role = this.authService.getUserRole();     // roles-ból jön
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
