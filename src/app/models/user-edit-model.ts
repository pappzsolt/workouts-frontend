export interface RawUser {
  id: number;
  usernameOrName: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  roles: string[];
  extraFields?: UserExtraFields;
}

export interface UserExtraFields {
  coach_id?: number;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goals?: string;
}

export interface CoachResponse {
  id: number;
  type: string;
  usernameOrName: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
  extraFields: Record<string, unknown>;
}

export interface Coach {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface UserListResponse {
  success: boolean;
  message: string;
  data: RawUser[];
}

export interface CoachListResponse {
  success: boolean;
  message: string;
  data: CoachResponse[];
}

export interface RoleListResponse {
  success: boolean;
  message: string;
  data: Role[];
}
export interface UpdateUserRequest {
  id?: number;
  type: 'user';
  username: string;
  email: string;
  avatarUrl?: string;
  passwordHash?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goals?: string;
  coachId?: number;
  roleIds: number[];
}
