import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Overview' },
  { to: '/swaps', label: 'Swaps' },
  { to: '/recalls', label: 'Recalls' },
  { to: '/leave', label: 'Leave & Balances' },
  { to: '/teams', label: 'Team & Members' },
  { to: '/activity', label: 'Activity' },
  { to: '/settings', label: 'Settings' }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-r border-slate-200 bg-white px-4 py-5">
        <div className="mb-6 rounded-lg bg-navy p-4 text-white">
          <p className="text-xs uppercase tracking-wider text-slate-200">ShiftFair</p>
          <h1 className="mt-1 text-lg font-semibold">Manager Console</h1>
          <p className="mt-2 text-xs text-slate-200">Central roster for 45 fictional IDs</p>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'block rounded-md border px-3 py-2 text-sm font-medium text-navy transition',
                  isActive ? 'border-teal bg-teal/10 shadow-sm' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
