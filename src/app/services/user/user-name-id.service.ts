import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserNameId {
  id: number;
  username: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserNameIdService {
  private apiUrl = 'http://localhost:8080/api/users-name-id';

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UserNameId[]> {
    return this.http.get<UserNameId[]>(this.apiUrl);
  }
}
