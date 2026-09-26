/** Exact contract of backend dto.common.ApiResponse<T>. */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
}
