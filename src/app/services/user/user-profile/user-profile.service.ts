import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { RawUser, Coach,Role } from '../../../models/user-profil.model';


@Injectable({
  providedIn: 'root'
})
export class UserProfilService {
  private apiUrl = 'http://localhost:8080/api/members';
  private coachesUrl = `${this.apiUrl}/all-coaches`;
  private usersUrl = `${this.apiUrl}/all-users`;
  private rolesUrl = 'http://localhost:8080/api/roles';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<RawUser[]> {
    return this.http.get<any>(this.usersUrl).pipe(
      map(res => res.data)
    );
  }

  getCoaches(): Observable<Coach[]> {
    return this.http.get<any>(this.coachesUrl).pipe(
      map(res => res.data.map((c: any) => ({ id: c.id, name: c.usernameOrName || c.name })))
    );
  }


  getRoles(): Observable<Role[]> {
    return this.http.get<any>(this.rolesUrl).pipe(
      map(res => res.data)
    );
  }

  getMemberById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  updateUser(user: RawUser, roleIds: number[]): Observable<any> {
    const payload: any = {
      type: 'user',
      username: user.usernameOrName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      age: user.extraFields?.age,
      weight: user.extraFields?.weight,
      height: user.extraFields?.height,
      gender: user.extraFields?.gender,
      goals: user.extraFields?.goals,
      coachId: user.extraFields?.coach_id,
      roleIds: roleIds || []
    };

    if (user.password && user.password.trim() !== '') {
      payload.passwordHash = user.password;
    }

    if (user.id) {
      payload.id = user.id;
    }

    return this.http.post(this.apiUrl, payload);
  }
}
