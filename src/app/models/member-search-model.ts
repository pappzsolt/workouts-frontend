import type { ExtraFields } from './extra-fields.model';

export interface Coach {
  id: number;
  usernameOrName: string;
  email: string;
  avatarUrl: string | null;
}

export interface Member {
  id: number;
  type: string;
  usernameOrName: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
  extraFields: ExtraFields;
  coach?: Coach; // ide kerül a coach adata, ha van
}

export interface SearchResponse {
  success: boolean;
  message: string;
  data: Member[];
}
