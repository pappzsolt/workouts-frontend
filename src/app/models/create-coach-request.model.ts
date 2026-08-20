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

export interface CreateCoachResponse {
  success: boolean;
  message: string;
}
