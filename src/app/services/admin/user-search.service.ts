import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserSearchService {
  private apiUrl = 'http://localhost:8080/api/users'; // backend végpont

  constructor(private http: HttpClient) {}

  // keresés név alapján
  searchUsers(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?search=${query}`);
  }
}
