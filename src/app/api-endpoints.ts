import { environment } from '../environments/environment';

/**
 * Canonical REST API endpoints.
 *
 * Naming convention:
 * - /api is the single REST API prefix
 * - resource names are plural and kebab-case
 * - CRUD uses HTTP methods instead of /add, /update, /delete, /all
 * - custom operations are expressed as resource sub-paths
 *
 * The backend keeps compatibility aliases for the previous URLs, so this
 * frontend can migrate without a breaking API deployment.
 */
export const API_ENDPOINTS = {
  // ============================================================
  // AUTHENTICATION
  // ============================================================

  auth: `${environment.apiUrl}/auth`,
  authLogin: `${environment.apiUrl}/auth/login`,
  authRefresh: `${environment.apiUrl}/auth/refresh`,

  // ============================================================
  // MEMBERS / USERS / COACHES
  // ============================================================

  members: `${environment.apiUrl}/members`,
  allCoaches: `${environment.apiUrl}/members/coaches`,
  memberSearch: `${environment.apiUrl}/members/search`,
  usersWithRoles: `${environment.apiUrl}/members/users-with-roles`,
  coach: `${environment.apiUrl}/coaches`,
  usersNameId: `${environment.apiUrl}/users/name-id`,
  coachesNameId: `${environment.apiUrl}/coaches/name-id`,
  roles: `${environment.apiUrl}/roles`,

  // ============================================================
  // PROGRAMS
  // ============================================================

  allPrograms: `${environment.apiUrl}/programs`,
  assignedPrograms: `${environment.apiUrl}/programs/my/assigned`,
  coachPrograms: `${environment.apiUrl}/programs/coach`,
  createProgram: `${environment.apiUrl}/user-programs`,
  assignProgram: `${environment.apiUrl}/programs/assign`,

  // ============================================================
  // EXERCISES
  // ============================================================

  exercises: `${environment.apiUrl}/exercises`,

  // ============================================================
  // WORKOUTS
  // ============================================================

  workouts: `${environment.apiUrl}/workouts`,
  workoutCopy: `${environment.apiUrl}/workout-copy`,

  // ============================================================
  // PROGRAM WORKOUTS
  // ============================================================

  programWorkouts: `${environment.apiUrl}/program-workouts`,

  // ============================================================
  // WORKOUT EXERCISES
  // ============================================================

  workoutExercises: `${environment.apiUrl}/workout-exercises`,

  // ============================================================
  // USER WORKOUT EXERCISES
  // ============================================================

  userWorkoutExercises: `${environment.apiUrl}/user-workout-exercises`,
  createUserWorkoutWithExercises: `${environment.apiUrl}/user-workout-exercises`,

  // ============================================================
  // USER WORKOUT EXERCISE SETS
  // ============================================================

  userWorkoutExerciseSets: `${environment.apiUrl}/user-workout-exercise-sets`,

  // ============================================================
  // MEMBER ENDPOINTS
  // ============================================================

  memberById: (id: number) => `${environment.apiUrl}/members/${id}`,
  coachById: (id: number) => `${environment.apiUrl}/coaches/${id}`,
  allUsers: `${environment.apiUrl}/members/users`,
  myProfile: `${environment.apiUrl}/members/me`,
  myCoachProfile: `${environment.apiUrl}/members/me/coach`,

  // ============================================================
  // PROGRAM ENDPOINTS
  // ============================================================

  programById: (id: number) => `${environment.apiUrl}/programs/${id}`,
  coachProgramDelete: (id: number) => `${environment.apiUrl}/programs/coach/${id}`,
  coachProgramSearch: `${environment.apiUrl}/programs/coach/search`,
  updateUserProgram: (id: number) => `${environment.apiUrl}/user-programs/${id}`,
  programAssignedUsers: (programId: number) =>
    `${environment.apiUrl}/programs/${programId}/assigned-users`,

  // ============================================================
  // EXERCISE ENDPOINTS
  // ============================================================

  exercisesForWorkouts: `${environment.apiUrl}/exercises/workouts`,
  exerciseForWorkout: (workoutId: number) =>
    `${environment.apiUrl}/exercises/workouts/${workoutId}`,
  exerciseAdd: `${environment.apiUrl}/exercises`,
  exerciseUpdate: (id: number) => `${environment.apiUrl}/exercises/${id}`,
  exerciseDelete: (exerciseId: number) => `${environment.apiUrl}/exercises/${exerciseId}`,
  allExercises: `${environment.apiUrl}/exercises`,
  exerciseSearch: `${environment.apiUrl}/exercises/search`,
  uniqueWorkoutsWithExercises: `${environment.apiUrl}/exercises/workouts/unique`,
  userWorkoutExercisesByWorkout: (userWorkoutId: number) =>
    `${environment.apiUrl}/exercises/user-workouts/${userWorkoutId}`,
  exerciseSetCompleted: `${environment.apiUrl}/exercises/user-workouts/sets/completed`,

  // ============================================================
  // WORKOUT ENDPOINTS
  // ============================================================

  myWorkouts: `${environment.apiUrl}/workouts/my`,
  uniqueMyWorkouts: `${environment.apiUrl}/workouts/my/unique`,
  workoutAdd: `${environment.apiUrl}/workouts`,
  workoutById: (id: number) => `${environment.apiUrl}/workouts/${id}`,
  workoutUpdate: (id: number) => `${environment.apiUrl}/workouts/${id}`,
  workoutDelete: (id: number) => `${environment.apiUrl}/workouts/${id}`,
  myWorkoutsSearch: `${environment.apiUrl}/workouts/my/search`,

  // ============================================================
  // PROGRAM-WORKOUT ENDPOINTS
  // ============================================================

  programWorkoutAdd: `${environment.apiUrl}/program-workouts`,
  programWorkoutAssigned: (workoutId: number) =>
    `${environment.apiUrl}/program-workouts/workouts/${workoutId}/assigned`,
  programWorkoutsByProgram: (programId: number) =>
    `${environment.apiUrl}/program-workouts?programId=${programId}`,
  programWorkoutDelete: (programId: number, workoutId: number) =>
    `${environment.apiUrl}/program-workouts/${programId}/${workoutId}`,
  programWorkoutsDelete: (programId: number) =>
    `${environment.apiUrl}/program-workouts/${programId}`,
  programWorkoutUpdate: (id: number) => `${environment.apiUrl}/program-workouts/${id}`,

  // ============================================================
  // WORKOUT-EXERCISE ENDPOINTS
  // ============================================================

  workoutExerciseAssign: `${environment.apiUrl}/workout-exercises`,
  workoutExerciseDelete: `${environment.apiUrl}/workout-exercises`,
  workoutExerciseOrderIndex: `${environment.apiUrl}/workout-exercises/order`,

  // ============================================================
  // USER WORKOUT EXERCISE ENDPOINTS
  // ============================================================

  userWorkoutExerciseByWorkout: (userWorkoutId: number) =>
    `${environment.apiUrl}/user-workout-exercises/workouts/${userWorkoutId}`,
  userWorkoutExercisesByUserProgram: (userId: number, programId: number) =>
    `${environment.apiUrl}/user-workout-exercises/user-programs/${userId}/${programId}`,
  rescheduleUserWorkout: `${environment.apiUrl}/user-workout-exercises/schedule`,
  scheduledUserWorkouts: `${environment.apiUrl}/user-workout-exercises/scheduled`,
  scheduledUserWorkoutsSearch: `${environment.apiUrl}/user-workout-exercises/scheduled/search`,

  // ============================================================
  // USER WORKOUT EXERCISE SET ENDPOINTS
  // ============================================================

  userWorkoutExerciseSetsByExercise: (userWorkoutExerciseId: number) =>
    `${environment.apiUrl}/user-workout-exercise-sets/${userWorkoutExerciseId}`,
  addUserWorkoutExerciseSet: (userWorkoutExerciseId: number) =>
    `${environment.apiUrl}/user-workout-exercise-sets/${userWorkoutExerciseId}/sets`,
  userWorkoutExerciseSetById: (id: number) =>
    `${environment.apiUrl}/user-workout-exercise-sets/${id}`,

  // ============================================================
  // STATISTICS
  // ============================================================

  assignedProgramsProgress: `${environment.apiUrl}/programs/my/assigned/progress`,
  workoutsByProgram: (programId: number) => `${environment.apiUrl}/workouts/program/${programId}`,
  userProgramStatistics: `${environment.apiUrl}/user/program-statistics`,
  userProgramStatisticsWorkouts: `${environment.apiUrl}/user/program-statistics/workouts`,
  userExerciseStrengthProgress: (exerciseId: number) =>
    `${environment.apiUrl}/user/program-statistics/exercises/${exerciseId}/strength-progress`,
} as const;
