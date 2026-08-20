import { environment } from '../environments/environment';

export const API_ENDPOINTS = {

  // ============================================================
  // MEMBERS
  // ============================================================

  members:
    `${environment.apiUrl}/members`,

  allCoaches:
    `${environment.apiUrl}/members/all-coaches`,

  memberSearch:
    `${environment.apiUrl}/members/search`,

  coach:
    `${environment.apiUrl}/coach`,

  // ============================================================
  // PROGRAMS
  // ============================================================

  programs:
    `${environment.apiUrl}/programs`,

  createProgram:
    `${environment.apiUrl}/user-programs/create`,

  // ============================================================
  // EXERCISES
  // ============================================================

  exercises:
    `${environment.apiUrl}/exercises`,

  // ============================================================
  // WORKOUT EXERCISES
  // ============================================================

  workoutExercises:
    `${environment.apiUrl}/workout-exercises`,

  // ============================================================
  // USER WORKOUT EXERCISES
  // ============================================================

  userWorkoutExercises:
    `${environment.apiUrl}/user-workout-exercises`,

  createUserWorkoutWithExercises:
    `${environment.apiUrl}/user-workout-exercises/create-with-exercises`,

  // ============================================================
  // USER WORKOUT EXERCISE SETS
  // ============================================================

  userWorkoutExerciseSets:
    `${environment.apiUrl}/user-workout-exercise-sets`,
};
