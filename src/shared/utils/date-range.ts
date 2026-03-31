// RUTA: src/shared/utils/date-range.ts
export const getDateRange = (period: string, start?: string, end?: string) => {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (period) {
    case 'today':   return { from: today, to: new Date(today.getTime() + 86400000 - 1) };
    case 'week':    return { from: new Date(today.getTime() - 6*86400000), to: new Date(today.getTime() + 86400000 - 1) };
    case 'month':   return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59) };
    case 'quarter': return { from: new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1), to: now };
    case 'year':    return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case 'custom':  return { from: start ? new Date(start) : today, to: end ? new Date(end) : now };
    default:        return { from: today, to: new Date(today.getTime() + 86400000 - 1) };
  }
};
