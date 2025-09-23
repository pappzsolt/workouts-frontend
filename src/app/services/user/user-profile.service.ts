import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  joinDate: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {
  constructor() {}

  getProfile(): Observable<UserProfile> {
    // Tesztadat
    return of({
      id: 1,
      username: 'user1',
      email: 'user1@example.com',
      joinDate: '2023-01-01'
    });
  }
}
