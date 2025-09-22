import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminListUsersService {
  constructor() {}

  getUsers(): Observable<User[]> {
    // Demo adatok, ide jön a valós API hívás
    return of([
      { id: 1, username: 'admin1', email: 'admin1@example.com', role: 'ROLE_ADMIN' },
      { id: 2, username: 'coach1', email: 'coach1@example.com', role: 'ROLE_COACH' },
      { id: 3, username: 'user1', email: 'user1@example.com', role: 'ROLE_USER' }
    ]);
  }
}
