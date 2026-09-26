/** GENERATED FROM BACKEND JAVA DTO. Do not add UI-only fields here. */
export interface MemberResponse {
  id: number | null;
  type: string | null;
  usernameOrName: string | null;
  email: string | null;
  avatarUrl: string | null;
  roles: Array<string> | null;
  extraFields: Record<string, unknown> | null;
}
