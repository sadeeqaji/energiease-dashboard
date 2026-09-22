import React from 'react';

interface Props {
  status: 'pending_payment' | 'processing' | 'success' | 'failed' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'sm' }) => {
  const norm = status.toLowerCase();

  let label = status;
  let bg = 'bg-zinc-800/60';
  let text = 'text-zinc-400';
  let border = 'border-zinc-700/60';
  let dot = 'bg-zinc-400';

  if (norm === 'success') {
    label = 'Success';
    bg = 'bg-emerald-500/10';
    text = 'text-emerald-400';
    border = 'border-emerald-500/20';
    dot = 'bg-emerald-400';
  } else if (norm === 'pending_payment' || norm === 'pending') {
    label = 'Pending';
    bg = 'bg-amber-500/10';
    text = 'text-amber-400';
    border = 'border-amber-500/20';
    dot = 'bg-amber-400';
  } else if (norm === 'processing') {
    label = 'Processing';
    bg = 'bg-blue-500/10';
    text = 'text-blue-400';
    border = 'border-blue-500/20';
    dot = 'bg-blue-400';
  } else if (norm === 'failed') {
    label = 'Failed';
    bg = 'bg-rose-500/10';
    text = 'text-rose-400';
    border = 'border-rose-500/20';
    dot = 'bg-rose-400';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium border rounded-md tabular-nums ${px} ${bg} ${text} ${border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
};
