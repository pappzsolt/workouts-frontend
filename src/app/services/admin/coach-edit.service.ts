import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

export interface Coach {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialization?: string;
  avatarUrl?: string;
  password?: string; // opcionális, csak update-hez
}

@Injectable({
  providedIn: 'root'
})
export class CoachEditService {
  private apiUrl = 'http://localhost:8080/api/members/all-coaches';

  constructor(private http: HttpClient) {}

  getCoaches(): Observable<Coach[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(res =>
        res.data.map((item: any) => ({
          id: item.id,
          name: item.usernameOrName,
          email: item.email,
          phone: item.extraFields?.phone || '',
          specialization: item.extraFields?.specialization || '',
          avatarUrl: item.avatarUrl || '',
          password: ''
        }))
      ),
      catchError(err => {
        console.error('Hiba az edzők lekérésekor:', err);
        return throwError(() => err);
      })
    );
  }

  getCoach(id: number): Observable<Coach> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => ({
        id: item.id,
        name: item.usernameOrName,
        email: item.email,
        phone: item.extraFields?.phone || '',
        specialization: item.extraFields?.specialization || '',
        avatarUrl: item.avatarUrl || '',
        password: ''
      })),
      catchError(err => {
        console.error(`Hiba az edző lekérésekor (id=${id}):`, err);
        return throwError(() => err);
      })
    );
  }

  updateCoach(id: number, coach: Coach): Observable<Coach> {
    const payload: any = {
      id: id,
      type: 'coach',
      name: coach.name,
      email: coach.email,
      avatarUrl: coach.avatarUrl,
      phone: coach.phone,
      specialization: coach.specialization,
      roleIds: [3]
    };

    if (coach.password && coach.password.trim() !== '') {
      payload.passwordHash = coach.password;
    }

    return this.http.post<Coach>('http://localhost:8080/api/members', payload).pipe(
      catchError(err => {
        console.error(`Hiba az edző frissítésekor (id=${id}):`, err);
        return throwError(() => err);
      })
    );
  }
}
