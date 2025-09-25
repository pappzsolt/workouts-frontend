import {Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpParams} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';

export interface Member {
  id: number;
  type: string;
  usernameOrName: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
  extraFields: any;
}

export interface SearchResponse {
  success: boolean;
  message: string;
  data: Member[];
}

@Injectable({
  providedIn: 'root'
})
export class MemberSearchService {
  private apiUrl = 'http://localhost:8080/api/members/search';

  constructor(private http: HttpClient) {}

  searchMembers(keyword: string): Observable<SearchResponse> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<SearchResponse>(this.apiUrl, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMsg = 'Ismeretlen hiba történt.';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Hálózati hiba: ${error.error.message}`;
    } else {
      errorMsg = `Szerver hiba: ${error.status}, üzenet: ${error.message}`;
    }
    return throwError(() => errorMsg);
  }
}

