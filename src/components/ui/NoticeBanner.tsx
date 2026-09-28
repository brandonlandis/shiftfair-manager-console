import React from 'react';
import { Banner } from '../../store/types';

export function NoticeBanner({ banner, onClose }: { banner: Banner; onClose: () => void }) {
  const tone = {
    success: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    error: 'border-red-300 bg-red-50 text-red-800',
    info: 'border-amber-300 bg-amber-50 text-amber-800'
  }[banner.tone];

  return (
    <div className={`mb-4 flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm ${tone}`}>
      <p>{banner.message}</p>
      <button className="text-xs font-semibold" onClick={onClose}>Dismiss</button>
    </div>
  );
}
