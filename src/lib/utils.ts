import type { FStatus, Feedback, Priority, Role, Stage, Vote } from './types';

export const STATUS: Record<FStatus, string> = { open: 'Open', under_review: 'Under Review', planned: 'Planned', in_progress: 'In Progress', completed: 'Completed', declined: 'Declined' };
export const STATUS_COLOR: Record<FStatus, string> = { open: 'bg-slate-100 text-slate-700', under_review: 'bg-amber-100 text-amber-800', planned: 'bg-blue-100 text-blue-800', in_progress: 'bg-violet-100 text-violet-800', completed: 'bg-green-100 text-green-800', declined: 'bg-red-100 text-red-700' };
export const PRIORITY: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
export const PRIORITY_COLOR: Record<Priority, string> = { low: 'bg-slate-100 text-slate-600', medium: 'bg-sky-100 text-sky-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' };
export const STAGES: { key: Stage; label: string }[] = [
  { key: 'under_review', label: 'Under Review' }, { key: 'planned', label: 'Planned' },
  { key: 'in_progress', label: 'In Progress' }, { key: 'completed', label: 'Completed' },
];
export const ROLE_LABEL: Record<Role, string> = { owner: 'Workspace Owner', admin: 'Admin', pm: 'Product Manager', customer: 'Customer' };

export const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
export const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Unique voters on a primary request plus voters on requests linked to it as duplicates. */
export function voteTotal(f: Feedback, all: Feedback[], votes: Vote[]): number {
  const ids = new Set([f.id, ...all.filter((x) => x.duplicateOf === f.id).map((x) => x.id)]);
  return new Set(votes.filter((v) => ids.has(v.feedbackId)).map((v) => v.userId)).size;
}
export const duplicateCount = (id: number, all: Feedback[]) => all.filter((x) => x.duplicateOf === id).length;
