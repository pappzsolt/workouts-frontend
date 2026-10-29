import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../api-endpoints';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import { LanguageService } from '../shared/language.service';
import { unwrap } from './coach-api-response';
import type { CoachExerciseFilterOptions, CoachExercisePage, CoachExerciseQuery, CoachExerciseSearchItem } from '../../models/coach-workspace.model';

/** HTTP operations for coach catalogue. */
@Injectable({ providedIn: 'root' })
export class CoachExerciseCatalogueApiService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);

  private language(): string {
    return this.languageService.getCurrentLanguage();
  }

  browseExercises(query: CoachExerciseQuery): Observable<CoachExercisePage> {
    let params = new HttpParams()
      .set('language', this.language())
      .set('search', query.search.trim())
      .set('page', query.page)
      .set('size', query.size)
      .set('sortDirection', 'asc');
    if (query.bodyPart) params = params.set('bodyPart', query.bodyPart);
    if (query.equipment) params = params.set('equipment', query.equipment);
    return this.http
      .get<ApiResponse<{ content: RawExercise[]; totalElements: number; totalPages: number }>>(
        API_ENDPOINTS.exerciseSearch,
        { params },
      )
      .pipe(
        map((response) => {
          const data = unwrap(response);
          return {
            items: (data?.content ?? []).map(toSearchItem),
            totalElements: data?.totalElements ?? 0,
            totalPages: Math.max(1, data?.totalPages ?? 1),
          };
        }),
      );
  }

  getExerciseFilterOptions(): Observable<CoachExerciseFilterOptions> {
    return this.http
      .get<ApiResponse<CoachExerciseFilterOptions>>(API_ENDPOINTS.exerciseFilterOptions)
      .pipe(map((response) => unwrap(response) ?? { bodyParts: [], equipment: [] }));
  }
}

interface RawExercise {
  id: number;
  name: string;
  description?: string | null;
  bodyPart?: string | null;
  primaryMuscles?: string | null;
  equipment?: string | null;
  muscleGroup?: string | null;
  imageUrl?: string | null;
}

function toSearchItem(e: RawExercise): CoachExerciseSearchItem {
  return {
    id: e.id,
    name: e.name,
    muscleGroup: e.muscleGroup || null,
    equipment: e.equipment || null,
    bodyPart: e.bodyPart || null,
    primaryMuscles: e.primaryMuscles || null,
    description: e.description || null,
    imageUrl: e.imageUrl || null,
  };
}
