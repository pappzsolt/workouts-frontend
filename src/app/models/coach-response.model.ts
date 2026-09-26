import { ApiResponse } from './backend-dto/common/api-response';

export interface CoachResponse {
  id: number;
  usernameOrName: string;
  email: string;
  avatarUrl?: string | null;

  extraFields?: {
    phone?: string;
    specialization?: string;
  };
}

export type CoachesResponse = ApiResponse<CoachResponse[]>;

export type SingleCoachResponse = ApiResponse<CoachResponse>;
