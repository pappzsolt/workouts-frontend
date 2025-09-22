import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminListUsersService, User } from '../../../../services/admin/admin-list-users.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-list-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-list-users.component.html',
  styleUrls: ['./admin-list-users.component.css']
})
export class AdminListUsersComponent {
  users$: Observable<User[]>;

  constructor(private adminListUsersService: AdminListUsersService) {
    this.users$ = this.adminListUsersService.getUsers();

    // Logoljuk a lekért felhasználókat
    this.users$.subscribe(users => {
      console.log('Fetched users:', users);
    });
  }
}
