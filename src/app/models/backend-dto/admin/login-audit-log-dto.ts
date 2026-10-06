export type LoginAuditAccountType = 'USER' | 'COACH';

/** Exact contract of backend dto.admin.LoginAuditLogDto. */
export interface LoginAuditLogDto {
  id: number;
  accountType: LoginAuditAccountType;
  accountId: number;
  username: string;
  loggedInAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}
