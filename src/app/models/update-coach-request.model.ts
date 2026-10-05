export interface UpdateCoachRequest {
  id: number;
  type: 'coach';
  name: string;
  email: string;
  avatarUrl?: string;
  phone: string;
  specialization?: string;
  roleIds: number[];
  passwordHash?: string;
}
