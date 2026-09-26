export interface RawUser {
  id: number;
  usernameOrName: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  roles: string[];
  //roleIds?: number[];  // 🔹 nem szükséges, mert a User interface-ben van
  extraFields?: {
    coach_id?: number;
    age?: number;
    weight?: number;
    height?: number;
    gender?: string;
    goals?: string;
  };
}

export interface UserProfileCoach {
  id: number;
  name: string;
}

export interface UserProfile {
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
  roleIds: number[]; // ✅ mindig legyen tömb
}
