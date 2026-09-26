/** Exact contract of backend dto.common.PageResponse<T>. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
