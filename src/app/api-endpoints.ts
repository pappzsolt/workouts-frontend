import { environment } from '../environments/environment';

export const API_ENDPOINTS = {
  members: `${environment.apiUrl}/members`,
  allCoaches: `${environment.apiUrl}/members/all-coaches`,
  memberSearch: `${environment.apiUrl}/members/search`,
  coach: `${environment.apiUrl}/coach`,

  programs: `${environment.apiUrl}/programs`,
  createProgram: `${environment.apiUrl}/user-programs/create`,

  exercises: `${environment.apiUrl}/exercises`,

  workoutExercises: `${environment.apiUrl}/workout-exercises`,

  userWorkoutExerciseSets:
    `${environment.apiUrl}/user-workout-exercise-sets`,
};
