import { environment } from '../environments/environment';

export const API_ENDPOINTS = {

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  auth:
    `${environment.apiUrl.replace('/api', '')}/auth`,

  // ============================================================
  // MEMBERS
  // ============================================================

  members:
    `${environment.apiUrl}/members`,

  allCoaches:
    `${environment.apiUrl}/members/all-coaches`,

  memberSearch:
    `${environment.apiUrl}/members/search`,

  usersWithRoles:
    `${environment.apiUrl}/members/users-with-roles`,

  coach:
    `${environment.apiUrl}/coach`,

  usersNameId:
    `${environment.apiUrl}/users-name-id`,

  coachesNameId:
    `${environment.apiUrl}/coaches-name-id`,

  roles:
    `${environment.apiUrl}/roles`,

  // ============================================================
  // PROGRAMS
  // ============================================================

  programs:
    `${environment.apiUrl}/programs`,

  allPrograms:
    `${environment.apiUrl}/programs/all`,

  assignedPrograms:
    `${environment.apiUrl}/programs/my/assigned-programs`,

  coachPrograms:
    `${environment.apiUrl}/programs/my/coach-programs`,

  createProgram:
    `${environment.apiUrl}/user-programs/create`,

  assignProgram:
    `${environment.apiUrl}/programs/assign`,

  // ============================================================
  // EXERCISES
  // ============================================================

  exercises:
    `${environment.apiUrl}/exercises`,

  // ============================================================
  // WORKOUTS
  // ============================================================

  workouts:
    `${environment.apiUrl}/workouts`,

  // ============================================================
  // PROGRAM WORKOUTS
  // ============================================================

  programWorkouts:
    `${environment.apiUrl}/program-workouts`,

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

  // ============================================================
  // GENERAL API
  // ============================================================

  api:
  environment.apiUrl
};
