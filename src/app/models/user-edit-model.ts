import type { RawUser, Coach } from './user-profil.model';

export type { RawUser, Coach } from './user-profil.model';

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
