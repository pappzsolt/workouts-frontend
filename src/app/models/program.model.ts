export interface Program {
  id?: number;
  name: string;
  description?: string;
  coachId?: number;
  startDate?: string; // vagy Date
  endDate?: string;   // vagy Date
  duration_days: number;
  difficulty_level: string;
  coach_id:number;
}
