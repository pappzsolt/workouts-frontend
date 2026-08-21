import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ENDPOINTS } from '../../../api-endpoints';
import { CoachProgram } from '../../../models/coach-program-select-model';

@Injectable({
  providedIn: 'root'
})
export class CoachProgramSelectService {

  private http = inject(HttpClient);

  getMyPrograms(): Observable<CoachProgram[]> {
    return this.http.get<CoachProgram[]>(
      API_ENDPOINTS.coachPrograms
    );
  }
}
