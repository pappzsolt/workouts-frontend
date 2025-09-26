import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface Role {
  id: number;
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = 'http://localhost:8080/api/roles';

  constructor(private http: HttpClient) {}

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.apiUrl).pipe(
      catchError((err) => {
        console.error('Hiba a role-ok lekérésekor', err);
        return throwError(() => new Error(err.message || 'Hiba a role-ok lekérésekor'));
      })
    );
  }
}
