export interface CreateUserRequest {
  type: 'user';
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goals?: string;
  coachId?: number;
  roleIds: number[];
}

export interface CreateUserResponse {
  success: boolean;
  message: string;
}
