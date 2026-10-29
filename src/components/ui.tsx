import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

type ToastItem = { id: number; msg: string; type: 'success' | 'error' };
interface UICtx { toast: (msg: string, type?: 'success' | 'error') => void; confirm: (msg: string) => Promise<boolean> }
const Ctx = createContext<UICtx>(null as unknown as UICtx);
export const useUI = () => useContext(Ctx);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [cf, setCf] = useState<{ msg: string; res: (v: boolean) => void } | null>(null);
  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  const confirm = useCallback((msg: string) => new Promise<boolean>((res) => setCf({ msg, res })), []);
  const close = (v: boolean) => { cf?.res(v); setCf(null); };
  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="fixed right-4 top-4 z-[60] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${t.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{t.msg}</div>
        ))}
      </div>
      {cf && (
        <Modal title="Please confirm" onClose={() => close(false)}>
          <p className="mb-4 text-sm text-slate-600">{cf.msg}</p>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => close(false)}>Cancel</button>
            <button className="btn-danger" onClick={() => close(true)}>Confirm</button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-5 shadow-xl ${wide ? 'max-w-2xl' : 'max-w-md'}`} role="dialog" aria-modal="true">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2 py-12 text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />{label}</div>
);
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    {message} {onRetry && <button className="ml-2 font-medium underline" onClick={onRetry}>Retry</button>}
  </div>
);
export const Empty = ({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
    <p className="font-medium text-slate-700">{title}</p>
    {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    <div className="mt-3">{children}</div>
  </div>
);
export const Badge = ({ className = '', children }: { className?: string; children: ReactNode }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>
);
export const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <div className="mb-3"><label className="label">{label}</label>{children}{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>
);
export const PageHeader = ({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div><h1 className="text-2xl font-bold">{title}</h1>{sub && <p className="text-sm text-slate-500">{sub}</p>}</div>
    <div className="flex gap-2">{children}</div>
  </div>
);
export const UsageBar = ({ label, used, max }: { label: string; used: number; max: number }) => {
  const pct = Math.min(100, Math.round((used / max) * 100));
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand';
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span>{used} / {max}</span></div>
      <div className="h-2 rounded-full bg-slate-200"><div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
      {pct >= 100 ? <p className="mt-1 text-xs text-red-600">Limit reached. Upgrade to add more.</p> : pct >= 80 ? <p className="mt-1 text-xs text-amber-600">Approaching limit ({pct}% used).</p> : null}
    </div>
  );
};
