import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';

export interface CoachNameId {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CoachNameIdService {

  private apiUrl = API_ENDPOINTS.coachesNameId;

  constructor(private http: HttpClient) {}

  /**
   * Lekéri az összes coach-t az API-ból.
   * @returns Observable<CoachNameId[]>
   */
  getAllCoaches(): Observable<CoachNameId[]> {
    return this.http.get<CoachNameId[]>(this.apiUrl);
  }
}
