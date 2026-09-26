import { ApiResponse } from './backend-dto/common/api-response';

export interface CreateCoachRequest {
  type: 'coach';
  name: string;
  email: string;
  phone: string;
  specialization?: string;
  avatarUrl?: string;
  passwordHash: string;
  roleIds: number[];
}

export type CreateCoachResponse = ApiResponse<void>;
