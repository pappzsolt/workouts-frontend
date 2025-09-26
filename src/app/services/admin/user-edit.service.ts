import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goals?: string;
  coachId?: number;
  roleId?: number;
}

export interface Coach {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserEditService {
  private apiUrl = 'http://localhost:8080/api/members';
  private coachesUrl = `${this.apiUrl}/all-coaches`;
  private usersUrl = `${this.apiUrl}/all-users`;
  private rolesUrl = 'http://localhost:8080/api/roles';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<any>(this.usersUrl).pipe(
      map(res => res.data)
    );
  }

  getCoaches(): Observable<Coach[]> {
    return this.http.get<any>(this.coachesUrl).pipe(
      map(res => res.data.map((c: any) => ({ id: c.id, name: c.usernameOrName })))
    );
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<any>(this.rolesUrl).pipe(
      map(res => res.data)
    );
  }

  updateUser(user: User): Observable<any> {
    const payload: any = {
      type: 'user',
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      age: user.age,
      weight: user.weight,
      height: user.height,
      gender: user.gender,
      goals: user.goals,
      coachId: user.coachId,
      roleIds: user.roleId ? [user.roleId] : []
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
