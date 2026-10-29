import type { ApiResponse } from '../../models/backend-dto/common/api-response';

export function unwrap<T>(response: ApiResponse<T>): T {
  if (!response || !response.success) {
    throw new Error(response?.message || 'coachWorkspace.genericError');
  }
  return response.data as T;
}

