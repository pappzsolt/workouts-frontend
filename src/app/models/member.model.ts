import type { ExtraFields } from './extra-fields.model';

export interface Member {
  id: number;
  type: 'user' | 'coach';
  usernameOrName: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
  extraFields: ExtraFields;
}