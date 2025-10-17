export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SALES: 'Sales',
  TECHNICIAN: 'Technician',
  FOREMAN: 'Foreman',
  WAREHOUSE: 'Warehouse'
};

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  SALES: 'bg-amber-100 text-amber-700',
  TECHNICIAN: 'bg-emerald-100 text-emerald-700',
  FOREMAN: 'bg-sky-100 text-sky-700',
  WAREHOUSE: 'bg-rose-100 text-rose-700'
};
