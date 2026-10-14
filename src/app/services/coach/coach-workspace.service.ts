import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_ENDPOINTS } from '../../api-endpoints';
import type { ApiResponse } from '../../models/backend-dto/common/api-response';
import type {
  ClientWorkoutExerciseRow,
  ClientWorkoutSet,
  CoachClientWorkout,
  CoachExerciseSearchItem,
  CoachOverview,
  CoachProgram,
  CoachProgramDayLink,
  CoachProgramDetailsInput,
  CoachWorkoutStatus,
  CoachWorkoutSummary,
} from '../../models/coach-workspace.model';
import { LanguageService } from '../shared/language.service';

/** Egy válaszból kiveszi az adatot; sikertelen válasznál a backend üzenetével dob. */
function unwrap<T>(response: ApiResponse<T>): T {
  if (!response || !response.success) {
    throw new Error(response?.message || 'coachWorkspace.genericError');
  }
  return response.data as T;
}

/** YYYY-MM-DD helyi idő szerint. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD → helyi Date (éjfél). */
export function fromIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** A hét hétfője. */
export function startOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7;
  return addDays(date, -day);
}

/** Egy ütemezett edzés állapota a mai naphoz képest. */
export function workoutStatus(workout: CoachClientWorkout, today: string): CoachWorkoutStatus {
  if (workout.completed) return 'done';
  if (workout.startedAt) return 'inProgress';
  if (workout.scheduledAt < today) return 'missed';
  return 'planned';
}

/**
 * Az új coach felület HTTP hívásai egy helyen. Minden metódus a kicsomagolt
 * adatot adja vissza; hibánál az Observable a backend üzenetével hibázik.
 */
@Injectable({ providedIn: 'root' })
export class CoachWorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);

  private language(): string {
    return this.languageService.getCurrentLanguage();
  }

  // ----------------------------------------------------------
  // Áttekintés / ügyfelek
  // ----------------------------------------------------------

  getOverview(from: string, to: string, userId?: number): Observable<CoachOverview> {
    let params = new HttpParams().set('from', from).set('to', to).set('language', this.language());
    if (userId) params = params.set('userId', userId);
    return this.http
      .get<ApiResponse<CoachOverview>>(API_ENDPOINTS.coachOverview, { params })
      .pipe(map(unwrap));
  }

  assignProgram(userId: number, programId: number): Observable<string | null> {
    return this.http
      .post<ApiResponse<void>>(API_ENDPOINTS.assignProgram, { userId, programId })
      .pipe(map((response) => {
        unwrap(response);
        return response.message ?? null;
      }));
  }

  revokeProgram(programId: number, userId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(API_ENDPOINTS.programAssignmentRevoke(programId, userId))
      .pipe(map(unwrap));
  }

  getAssignedUserIds(programId: number): Observable<number[]> {
    return this.http
      .get<ApiResponse<number[]>>(API_ENDPOINTS.programAssignedUsers(programId))
      .pipe(map((response) => unwrap(response) ?? []));
  }

  rescheduleWorkout(userWorkoutId: number, scheduledAt: string): Observable<void> {
    return this.http
      .patch<ApiResponse<void>>(API_ENDPOINTS.rescheduleUserWorkout, { userWorkoutId, scheduledAt })
      .pipe(map(unwrap));
  }

  // ----------------------------------------------------------
  // Ügyfél edzése (személyre szabás)
  // ----------------------------------------------------------

  getClientWorkoutExercises(userWorkoutId: number): Observable<ClientWorkoutExerciseRow[]> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .get<ApiResponse<ClientWorkoutExerciseRow[]>>(
        API_ENDPOINTS.userWorkoutExerciseByWorkout(userWorkoutId),
        { params },
      )
      .pipe(map((response) => unwrap(response) ?? []));
  }

  getClientWorkoutSets(userWorkoutExerciseId: number): Observable<ClientWorkoutSet[]> {
    return this.http
      .get<ApiResponse<ClientWorkoutSet[]>>(
        API_ENDPOINTS.userWorkoutExerciseSetsByExercise(userWorkoutExerciseId),
      )
      .pipe(map((response) => unwrap(response) ?? []));
  }

  updateClientSet(
    setId: number,
    values: { targetRepetitions: number; targetWeightKg: number | null; restSeconds: number },
  ): Observable<void> {
    const body = {
      targetRepetitions: values.targetRepetitions,
      targetWeightKg: values.targetWeightKg,
      clearTargetWeightKg: values.targetWeightKg === null,
      restSeconds: values.restSeconds,
    };
    return this.http
      .put<ApiResponse<void>>(API_ENDPOINTS.userWorkoutExerciseSetById(setId), body)
      .pipe(map(unwrap));
  }

  addClientSet(userWorkoutExerciseId: number): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(API_ENDPOINTS.addUserWorkoutExerciseSet(userWorkoutExerciseId), {})
      .pipe(map(unwrap));
  }

  deleteClientSet(setId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(API_ENDPOINTS.userWorkoutExerciseSetById(setId))
      .pipe(map(unwrap));
  }

  // ----------------------------------------------------------
  // Programok
  // ----------------------------------------------------------

  getCoachPrograms(): Observable<CoachProgram[]> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .get<ApiResponse<CoachProgram[]>>(API_ENDPOINTS.coachProgramsWithWorkouts, { params })
      .pipe(map((response) => unwrap(response) ?? []));
  }

  getProgram(programId: number): Observable<CoachProgram> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .get<ApiResponse<CoachProgram>>(API_ENDPOINTS.programById(programId), { params })
      .pipe(map(unwrap));
  }

  createProgram(details: CoachProgramDetailsInput): Observable<number> {
    return this.http
      .post<ApiResponse<number>>(API_ENDPOINTS.createProgram, {
        ...details,
        languageCode: this.language(),
        workouts: [],
      })
      .pipe(map(unwrap));
  }

  updateProgram(programId: number, details: CoachProgramDetailsInput): Observable<void> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .put<ApiResponse<unknown>>(API_ENDPOINTS.programById(programId), details, { params })
      .pipe(map((response) => { unwrap(response); }));
  }

  deleteProgram(programId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(API_ENDPOINTS.coachProgramDelete(programId))
      .pipe(map(unwrap));
  }

  getProgramDays(programId: number): Observable<CoachProgramDayLink[]> {
    return this.http
      .get<ApiResponse<CoachProgramDayLink[]>>(API_ENDPOINTS.programWorkoutsByProgram(programId))
      .pipe(map((response) => unwrap(response) ?? []));
  }

  addWorkoutToDay(programId: number, workoutId: number, dayIndex: number): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(API_ENDPOINTS.programWorkoutAdd, { programId, workoutId, dayIndex })
      .pipe(map((response) => { unwrap(response); }));
  }

  moveWorkoutToDay(programWorkoutId: number, dayIndex: number): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(API_ENDPOINTS.programWorkoutUpdate(programWorkoutId), {
        id: programWorkoutId,
        dayIndex,
      })
      .pipe(map((response) => { unwrap(response); }));
  }

  removeWorkoutFromDay(programWorkoutId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(API_ENDPOINTS.programWorkoutDeleteById(programWorkoutId))
      .pipe(map(unwrap));
  }

  /** Meglévő edzés másolata a program egy napjára (a másolat a programhoz kerül). */
  copyWorkoutToDay(
    sourceWorkoutId: number,
    programId: number,
    workoutName: string,
    workoutDate: string,
    dayIndex: number,
  ): Observable<number> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .post<ApiResponse<number>>(
        API_ENDPOINTS.workoutCopy,
        { sourceWorkoutId, programId, workoutName, workoutDate, dayIndex },
        { params },
      )
      .pipe(map(unwrap));
  }

  /** Új, üres edzés (még nincs programban, így gyakorlat adható hozzá). */
  createWorkout(name: string, workoutDate: string): Observable<number> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .post<ApiResponse<{ id: number }>>(
        API_ENDPOINTS.workoutAdd,
        { name, workoutDate },
        { params },
      )
      .pipe(map((response) => unwrap(response).id));
  }

  getMyWorkouts(): Observable<CoachWorkoutSummary[]> {
    const params = new HttpParams().set('language', this.language());
    return this.http
      .get<ApiResponse<CoachWorkoutSummary[]>>(API_ENDPOINTS.myWorkouts, { params })
      .pipe(map((response) => (unwrap(response) ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description ?? null,
      }))));
  }

  addExerciseToWorkout(workoutId: number, exerciseId: number): Observable<void> {
    const params = new HttpParams().set('workoutId', workoutId).set('exerciseId', exerciseId);
    return this.http
      .post<ApiResponse<void>>(API_ENDPOINTS.workoutExerciseAssign, null, { params })
      .pipe(map(unwrap));
  }

  updatePrescription(
    workoutId: number,
    exerciseId: number,
    values: { sets: number; repetitions: number; restSeconds: number },
  ): Observable<void> {
    const params = new HttpParams().set('workoutId', workoutId).set('exerciseId', exerciseId);
    return this.http
      .put<ApiResponse<void>>(API_ENDPOINTS.workoutExercisePrescription, values, { params })
      .pipe(map(unwrap));
  }

  searchExercises(search: string, size = 8): Observable<CoachExerciseSearchItem[]> {
    const params = new HttpParams()
      .set('language', this.language())
      .set('search', search)
      .set('page', 0)
      .set('size', size);
    return this.http
      .get<ApiResponse<{ content: CoachExerciseSearchItem[] }>>(API_ENDPOINTS.exerciseSearch, { params })
      .pipe(map((response) => (unwrap(response)?.content ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        muscleGroup: e.muscleGroup || null,
        equipment: e.equipment || null,
      }))));
  }
}
