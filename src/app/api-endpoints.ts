import { environment } from '../environments/environment';

export const API_ENDPOINTS = {
  members: `${environment.apiUrl}/members`,
  memberSearch: `${environment.apiUrl}/members/search`,
  coach: `${environment.apiUrl}/coach`,
  programs: `${environment.apiUrl}/programs`,
  createProgram: `${environment.apiUrl}/user-programs/create`,
};

