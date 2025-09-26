import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Coach {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialization?: string;
  avatarUrl?: string;
  password?: string; // jelszó mező hozzáadva
}

interface BackendCoach {
  id: number;
  type: string;
  usernameOrName: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
  extraFields: {
    phone?: string;
    specialization?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CoachEditService {
  private apiUrl = 'http://localhost:8080/api/members/all-coaches'; // Backend végpont

  constructor(private http: HttpClient) {}

  // Összes edző lekérése
  getCoaches(): Observable<Coach[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(res => res.data.map((c: BackendCoach) => ({
        id: c.id,
        name: c.usernameOrName,
        email: c.email,
        phone: c.extraFields.phone || '',
        specialization: c.extraFields.specialization || '',
        avatarUrl: c.avatarUrl || '',
        password: '' // alapértelmezett üres
      })))
    );
  }

  // Egy edző lekérése id alapján
  getCoach(id: number): Observable<Coach> {
    return this.getCoaches().pipe(
      map(coaches => coaches.find(c => c.id === id) || {
        id: 0,
        name: '',
        email: '',
        phone: '',
        specialization: '',
        avatarUrl: '',
        password: ''
      })
    );
  }

  // Edző módosítása
  updateCoach(id: number, coach: Coach): Observable<Coach> {
    return this.http.put<Coach>(`${this.apiUrl}/${id}`, coach);
  }
}
