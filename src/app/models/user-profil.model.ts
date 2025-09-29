export interface RawUser {
  id: number;
  usernameOrName: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  roles: string[];
  extraFields?: {
    coach_id?: number;
    age?: number;
    weight?: number;
    height?: number;
    gender?: string;
    goals?: string;
  };
}

export interface Coach {
  id: number;
  name: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goals?: string;
  coachId?: number;
  roleName?: string;
}
