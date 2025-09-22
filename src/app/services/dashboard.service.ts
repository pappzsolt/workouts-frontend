import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface DashboardData {
  welcomeMessage: string;
  stats: { label: string; value: number }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  getDashboardData(): Observable<DashboardData> {
    return of({
      welcomeMessage: 'Üdvözöllek a Dashboardon!',
      stats: [
        { label: 'Felhasználók száma', value: 42 },
        { label: 'Aktív projektek', value: 7 },
        { label: 'Összes költség', value: 12345 }
      ]
    });
  }
}
