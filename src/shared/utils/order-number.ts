// RUTA: src/shared/utils/order-number.ts
export const generateOrderNumber = (count: number): string =>
  String((count % 9999) + 1).padStart(4, '0');
