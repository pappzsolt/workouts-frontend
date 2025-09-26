import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CoachNameId {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CoachNameIdService {
  // Javítva: teljes backend URL
  private apiUrl = 'http://localhost:8080/api/coaches-name-id';

  constructor(private http: HttpClient) {}

  /**
   * Lekéri az összes coach-t az API-ból.
   * @returns Observable<CoachNameId[]>
   */
  getAllCoaches(): Observable<CoachNameId[]> {
    return this.http.get<CoachNameId[]>(this.apiUrl);
  }
}
