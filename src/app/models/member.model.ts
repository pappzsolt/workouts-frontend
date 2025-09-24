export interface ExtraFields {
  coach_id?: number;
  gender?: string;
  weight?: number;
  age?: number;
  height?: number;
  goals?: string;
  phone?: string;
  specialization?: string;
}

export interface Member {
  id: number;
  type: 'user' | 'coach';
  usernameOrName: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
  extraFields: ExtraFields;
}

export interface MembersResponse {
  success: boolean;
  message: string;
  data: Member[];
}
//adnin-list-users service
