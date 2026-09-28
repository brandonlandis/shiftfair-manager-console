import React from 'react';

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="card p-6 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}
