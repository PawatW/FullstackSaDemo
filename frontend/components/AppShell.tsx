'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { ROLE_COLORS, ROLE_LABELS } from '../lib/config';
import { useAuth } from './AuthContext';

interface NavItem {
  href: string;
  label: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/inventory', label: 'Inventory', roles: ['WAREHOUSE', 'ADMIN'] },
  { href: '/orders', label: 'Orders', roles: ['SALES', 'TECHNICIAN', 'ADMIN'] },
  { href: '/requests', label: 'Requests', roles: ['TECHNICIAN', 'FOREMAN', 'WAREHOUSE', 'ADMIN'] },
  { href: '/stock', label: 'Stock Ops', roles: ['WAREHOUSE', 'ADMIN'] },
  { href: '/customers', label: 'Customers', roles: ['SALES', 'TECHNICIAN', 'ADMIN'] },
  { href: '/suppliers', label: 'Suppliers', roles: ['WAREHOUSE', 'ADMIN'] },
  { href: '/admin/staff', label: 'Staff', roles: ['ADMIN'] }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, staffId, logout } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.roles || (role ? item.roles.includes(role) || role === 'ADMIN' : false));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 flex-col bg-slate-900 text-slate-100 lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 font-semibold text-white">SA</div>
          <div>
            <p className="text-lg font-semibold">Smart Inventory</p>
            <p className="text-sm text-slate-400">Service Accelerator</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center justify-between rounded-xl px-4 py-3 text-sm transition',
                  active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <span>{item.label}</span>
                {active && <span className="h-2 w-2 rounded-full bg-primary-400" />}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div>
            <p className="text-base font-semibold text-slate-900">{role ? `สวัสดี ${ROLE_LABELS[role] || role}` : 'Smart Inventory'}</p>
            <p className="text-sm text-slate-500">Staff ID: {staffId ?? '-'}</p>
          </div>
          <div className="flex items-center gap-3">
            {role && (
              <span className={clsx('badge', ROLE_COLORS[role] ?? 'bg-slate-100 text-slate-700')}>{ROLE_LABELS[role] || role}</span>
            )}
            <button onClick={logout} className="bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-300">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 space-y-6 bg-slate-100 p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
