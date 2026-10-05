/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
import type { RoleDto } from '../roles/role-dto';
import type { UserDto } from './user-dto';

export interface UserWithRolesDto extends UserDto {
  roles: Array<RoleDto> | null;
  id: number | null;
  name: string | null;
}
