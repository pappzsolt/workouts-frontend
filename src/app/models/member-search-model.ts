import { ExtraFields } from './member.model';

export interface Coach {
  id: number;
  usernameOrName: string; // HTML-hez igazítva
  email: string;
  avatarUrl: string | null;
  roles: string[];
  extraFields: ExtraFields;
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
