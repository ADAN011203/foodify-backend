// RUTA: src/shared/utils/pagination.ts
export interface PaginationMeta {
  total: number; page: number; limit: number; totalPages: number;
}
export const paginate = (total: number, page: number, limit: number): PaginationMeta => ({
  total, page, limit, totalPages: Math.ceil(total / limit),
});
