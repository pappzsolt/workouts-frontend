export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  sub: string;
  id: number;
  roles: string;
  iat: number;
  exp: number;
}
