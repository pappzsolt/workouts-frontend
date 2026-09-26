/** UI role model. API roles are mapped from backend-dto/roles/role-dto. */
export interface Role {
  id: number;
  name: string;
  description?: string;
}
