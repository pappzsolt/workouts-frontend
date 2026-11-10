export interface User {
  accountType?: 'user' | 'coach';
  id: number;
  username: string;
  email: string;
  roles: string[]; // több role támogatása
}
