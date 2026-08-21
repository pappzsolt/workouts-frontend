export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface UserWithRolesDto {
  id: number;
  username: string;
  roles: Role[];
}

export interface RoleApiResponse {
  success: boolean;
  message: string;
  data: UserWithRolesDto[];
}
