import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';

export interface UserNameId {
  id: number;
  username: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserNameIdService {

  private apiUrl = API_ENDPOINTS.usersNameId;

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<UserNameId[]> {
    return this.http.get<UserNameId[]>(this.apiUrl);
  }
}
