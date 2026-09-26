import { environment } from '../environments/environment';

export const API_ENDPOINTS = {
  // ============================================================
  // AUTHENTICATION
  // ============================================================

  auth: `${environment.apiUrl.replace('/api', '')}/auth`,

  // ============================================================
  // MEMBERS
  // ============================================================

  members: `${environment.apiUrl}/members`,

  allCoaches: `${environment.apiUrl}/members/all-coaches`,

  memberSearch: `${environment.apiUrl}/members/search`,

  usersWithRoles: `${environment.apiUrl}/members/users-with-roles`,

  coach: `${environment.apiUrl}/coach`,

  usersNameId: `${environment.apiUrl}/users-name-id`,

  coachesNameId: `${environment.apiUrl}/coaches-name-id`,

  roles: `${environment.apiUrl}/roles`,

  // ============================================================
  // PROGRAMS
  // ============================================================

  programs: `${environment.apiUrl}/programs`,

  updateProgram: `${environment.apiUrl}/user-programs/update`,

  allPrograms: `${environment.apiUrl}/programs/all`,

  assignedPrograms: `${environment.apiUrl}/programs/my/assigned-programs`,

  coachPrograms: `${environment.apiUrl}/programs/my/coach-programs`,

  createProgram: `${environment.apiUrl}/user-programs/create`,

  assignProgram: `${environment.apiUrl}/programs/assign`,
  assignedProgramUsers: `${environment.apiUrl}/programs`,

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

  createUserWorkoutWithExercises: `${environment.apiUrl}/user-workout-exercises/create-with-exercises`,

  // ============================================================
  // USER WORKOUT EXERCISE SETS
  // ============================================================

  userWorkoutExerciseSets: `${environment.apiUrl}/user-workout-exercise-sets`,

  // ============================================================
  // AUTH ENDPOINTS
  // ============================================================

  authLogin: `${environment.apiUrl.replace('/api', '')}/auth/login`,
  authRefresh: `${environment.apiUrl.replace('/api', '')}/auth/refresh`,

  // ============================================================
  // MEMBER ENDPOINTS
  // ============================================================

  memberById: (id: number) => `${environment.apiUrl}/members/${id}`,
  coachById: (id: number) => `${environment.apiUrl}/coach/${id}`,
  allUsers: `${environment.apiUrl}/members/all-users`,
  myProfile: `${environment.apiUrl}/members/my-profile`,
  myCoachProfile: `${environment.apiUrl}/members/my-coach-profile`,

  // ============================================================
  // PROGRAM ENDPOINTS
  // ============================================================

  coachProgramsList: `${environment.apiUrl}/programs/coach/programs`,
  allProgramsList: `${environment.apiUrl}/programs/all`,
  programById: (id: number) => `${environment.apiUrl}/programs/${id}`,
  coachProgramSearch: `${environment.apiUrl}/programs/coach/search`,
  updateUserProgram: (id: number) => `${environment.apiUrl}/user-programs/update?programId=${id}`,
  programAssignedUsers: (programId: number) =>
    `${environment.apiUrl}/programs/${programId}/assigned-users`,

  // ============================================================
  // EXERCISE ENDPOINTS
  // ============================================================

  exercisesForWorkouts: `${environment.apiUrl}/exercises/workouts`,
  exerciseForWorkout: (workoutId: number) => `${environment.apiUrl}/exercises/workout/${workoutId}`,
  exerciseDone: `${environment.apiUrl}/exercises/done`,
  exerciseAdd: `${environment.apiUrl}/exercises/add`,
  exerciseUpdate: `${environment.apiUrl}/exercises/update`,
  exerciseDelete: (exerciseId: number) => `${environment.apiUrl}/exercises/delete/${exerciseId}`,
  allExercises: `${environment.apiUrl}/exercises/all`,
  exerciseSearch: `${environment.apiUrl}/exercises/exercise-search`,
  uniqueWorkoutsWithExercises: `${environment.apiUrl}/exercises/workouts/unique`,
  userWorkoutExercisesByWorkout: (userWorkoutId: number) =>
    `${environment.apiUrl}/exercises/my-workout/user-workout/${userWorkoutId}`,
  exerciseSetCompleted: `${environment.apiUrl}/exercises/set-completed`,

  // ============================================================
  // WORKOUT ENDPOINTS
  // ============================================================

  myWorkouts: `${environment.apiUrl}/workouts/my-workouts`,
  uniqueMyWorkouts: `${environment.apiUrl}/workouts/my-workouts/unique`,
  workoutAdd: `${environment.apiUrl}/workouts/add`,
  workoutById: (id: number) => `${environment.apiUrl}/workouts/${id}`,
  workoutUpdate: `${environment.apiUrl}/workouts/update`,
  workoutDelete: (id: number) => `${environment.apiUrl}/workouts/delete/${id}`,
  myWorkoutsSearch: `${environment.apiUrl}/workouts/my-workouts/search`,

  // ============================================================
  // PROGRAM-WORKOUT ENDPOINTS
  // ============================================================

  programWorkoutAdd: `${environment.apiUrl}/program-workouts/add`,
  programWorkoutAssigned: (workoutId: number) =>
    `${environment.apiUrl}/program-workouts/workout/${workoutId}/assigned`,
  programWorkoutsByProgram: (programId: number) =>
    `${environment.apiUrl}/program-workouts?programId=${programId}`,
  programWorkoutDelete: (programId: number, workoutId: number) =>
    `${environment.apiUrl}/program-workouts/${programId}/${workoutId}`,
  programWorkoutsDelete: (programId: number) =>
    `${environment.apiUrl}/program-workouts/${programId}`,
  programWorkoutUpdate: `${environment.apiUrl}/program-workouts/update`,

  // ============================================================
  // WORKOUT-EXERCISE ENDPOINTS
  // ============================================================

  workoutExerciseAssign: `${environment.apiUrl}/workout-exercises/assign`,
  workoutExerciseDelete: `${environment.apiUrl}/workout-exercises/delete`,
  workoutExerciseOrderIndex: `${environment.apiUrl}/workout-exercises/order-index`,

  // ============================================================
  // USER WORKOUT EXERCISE ENDPOINTS
  // ============================================================

  userWorkoutExerciseByWorkout: (userWorkoutId: number) =>
    `${environment.apiUrl}/user-workout-exercises/workout/${userWorkoutId}`,
  userWorkoutExerciseCompleted: (id: number) =>
    `${environment.apiUrl}/user-workout-exercises/${id}/completed`,
  userWorkoutExerciseDetails: (id: number) =>
    `${environment.apiUrl}/user-workout-exercises/${id}/details`,
  userWorkoutExercisesByUserProgram: (userId: number, programId: number) =>
    `${environment.apiUrl}/user-workout-exercises/user-program/${userId}/${programId}`,
  rescheduleUserWorkout: `${environment.apiUrl}/user-workout-exercises/reschedule-user-workout`,
  scheduledUserWorkouts: `${environment.apiUrl}/user-workout-exercises/scheduled-workouts`,
  scheduledUserWorkoutsSearch: `${environment.apiUrl}/user-workout-exercises/scheduled-workouts/search`,
  createUserWorkoutWithExercisesEndpoint:
    `${environment.apiUrl}/user-workout-exercises/create-with-exercises`,

  // ============================================================
  // USER WORKOUT EXERCISE SET ENDPOINTS
  // ============================================================

  userWorkoutExerciseSetsByExercise: (userWorkoutExerciseId: number) =>
    `${environment.apiUrl}/user-workout-exercise-sets/${userWorkoutExerciseId}`,
  addUserWorkoutExerciseSet: (userWorkoutExerciseId: number) =>
    `${environment.apiUrl}/user-workout-exercise-sets/${userWorkoutExerciseId}/add`,
  userWorkoutExerciseSetById: (id: number) =>
    `${environment.apiUrl}/user-workout-exercise-sets/${id}`,

  assignedProgramsProgress: `${environment.apiUrl}/programs/my/assigned-programs/progress`,
  workoutsByProgram: (programId: number) => `${environment.apiUrl}/workouts/program/${programId}`,

  // ============================================================
  // GENERAL API
  // ============================================================
  userProgramStatistics: `${environment.apiUrl}/user/program-statistics`,
  api: environment.apiUrl,
};
