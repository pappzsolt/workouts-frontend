export interface CoachProfile {
  id?: number;
  name: string;
  email: string;
  password_hash: string;
  phone: string;
  specialization?: string;
  avatar_url?: string;
  created_at?: string;
}
