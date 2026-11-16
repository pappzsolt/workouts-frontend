import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';
import type { Exercise } from '../../models/exercise.model';
import type { ExerciseDto } from '../../models/backend-dto/exercise/exercise-dto';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type { PageResponse } from '../../models/backend-dto/common/page-response';
import { LanguageService } from '../shared/language.service';
import { toExercise } from '../shared/exercise-mapping';

export interface UserExerciseFilters {
  bodyParts: string[];
  equipment: string[];
}

/** USER catalogue API: GET-only access to the same exercise definitions as the personal-program picker. */
@Injectable({ providedIn: 'root' })
export class UserExerciseCatalogueService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);

  search(
    term: string,
    field: string,
    page: number,
    size: number,
    sort: 'asc' | 'desc',
    bodyPart: string,
    equipment: string,
  ): Observable<ApiResponse<PageResponse<Exercise>>> {
    let params = new HttpParams()
      .set('language', this.language.getCurrentLanguage())
      .set('search', term)
      .set('searchField', field)
      .set('page', page)
      .set('size', size)
      .set('sortDirection', sort);
    if (bodyPart) params = params.set('bodyPart', bodyPart);
    if (equipment) params = params.set('equipment', equipment);

    return this.http.get<ApiResponse<PageResponse<ExerciseDto>>>(API_ENDPOINTS.exerciseSearch, { params })
      .pipe(map((response) => ({
        ...response,
        data: response.data == null ? null : {
          ...response.data,
          content: (response.data.content ?? []).map((exercise) => toExercise(exercise)),
        },
      })));
  }

  filters(): Observable<ApiResponse<UserExerciseFilters>> {
    return this.http.get<ApiResponse<UserExerciseFilters>>(API_ENDPOINTS.exerciseFilterOptions);
  }
}
