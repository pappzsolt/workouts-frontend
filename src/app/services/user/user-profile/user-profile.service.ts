import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface RawUser {
  id: number;
  usernameOrName: string;
  email: string;
  password?: string; // opcionális a frissítéshez
  avatarUrl?: string;
  roles: string[];
  extraFields?: {
    coach_id?: number;
    age?: number;
    weight?: number;
    height?: number;
    gender?: string;
    goals?: string;
  };
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
      map(res => res.data.map((c: any) => ({ id: c.id, name: c.usernameOrName })))
    );
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<any>(this.rolesUrl).pipe(
      map(res => res.data)
    );
  }
  getMemberById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data) // csak a data rész kell
    );
  }
  updateUser(user: RawUser, roleIds: number[]): Observable<any> {
    // roleIds-t a komponens adja át
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
