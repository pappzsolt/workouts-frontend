export interface CoachResponse {
  id: number;
  usernameOrName: string;
  email: string;
  avatarUrl?: string | null;
  extraFields?: {
    phone?: string;
    specialization?: string;
  };
}

export interface CoachesResponse {
  success: boolean;
  message: string;
  data: CoachResponse[];
}
