/**
 * A web kliens auth válasza.
 *
 * A refresh token szándékosan nincs JavaScriptben: a backend HttpOnly cookie-ban
 * kezeli, ezért a frontend csak az access tokent ismeri.
 */
export interface LoginResponse {
  accessToken: string;
}

export interface TokenPayload {
  sub: string;
  id: number;
  roles: string;
  iat: number;
  exp: number;
}
