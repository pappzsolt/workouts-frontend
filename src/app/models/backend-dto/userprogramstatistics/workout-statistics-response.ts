/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { WeeklyWorkoutVolumeDto } from './weekly-workout-volume-dto';
import type { WorkoutActivityDto } from './workout-activity-dto';

export interface WorkoutStatisticsResponse {
  weeklyActivity: Array<WorkoutActivityDto> | null;
  monthlyActivity: Array<WorkoutActivityDto> | null;
  weeklyVolume: WeeklyWorkoutVolumeDto | null;
}
