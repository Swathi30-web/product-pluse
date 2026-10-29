import { useState } from 'react';
import { toggleVote, errMsg } from '../lib/api';
import { useUI } from './ui';

export default function VoteButton({ workspaceId, feedbackId, userId, voted, total, onDone }: { workspaceId: number; feedbackId: number; userId: number; voted: boolean; total: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useUI();
  const click = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try { const now = await toggleVote(workspaceId, feedbackId, userId); toast(now ? 'Vote added' : 'Vote removed'); onDone(); }
    catch (x) { toast(errMsg(x), 'error'); } finally { setBusy(false); }
  };
  return (
    <button onClick={click} disabled={busy} aria-pressed={voted} title={voted ? 'Remove your vote' : 'Vote'}
      className={`flex w-14 shrink-0 flex-col items-center rounded-lg border px-2 py-2 text-sm font-semibold transition ${voted ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-brand'}`}>
      <span>▲</span><span>{total}</span>
    </button>
  );
}
