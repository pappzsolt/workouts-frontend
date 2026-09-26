import type { ExtraFields } from './extra-fields.model';

export interface MemberSearchCoach {
  id: number;
  usernameOrName: string;
  email: string;
  avatarUrl: string | null;
}

export interface MemberSearchResult {
  id: number;
  type: string;
  usernameOrName: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
  extraFields: ExtraFields;
  coach?: MemberSearchCoach; // ide kerül a coach adata, ha van
}

export interface SearchResponse {
  success: boolean;
  message: string;
  data: MemberSearchResult[];
}
