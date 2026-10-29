import { useParams } from 'react-router-dom';
import { Badge, Empty, ErrorBox, Spinner } from '../components/ui';
import { api } from '../lib/api';
import type { ReleaseNote, RoadmapItem, Workspace } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { fmtDate, STAGES } from '../lib/utils';

export default function PublicRoadmap() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useAsync(async () => {
    const [ws] = await api.list<Workspace>('workspaces', { slug });
    if (!ws || !ws.publicRoadmap) return { ws: ws || null, items: [] as RoadmapItem[], notes: [] as ReleaseNote[] };
    const [items, notes] = await Promise.all([
      api.list<RoadmapItem>('roadmapItems', { workspaceId: ws.id, published: true }),
      api.list<ReleaseNote>('releaseNotes', { workspaceId: ws.id, status: 'published', _sort: 'releaseDate', _order: 'desc' }),
    ]);
    return { ws, items, notes };
  }, [slug]);
  if (loading) return <Spinner />;
  if (error) return <div className="p-6"><ErrorBox message={error} onRetry={reload} /></div>;
  if (!data?.ws || !data.ws.publicRoadmap) return <div className="p-10"><Empty title="Roadmap not available" hint="This roadmap does not exist or is not public." /></div>;
  const { ws, items, notes } = data;
  return (
    <div className="min-h-screen" style={{ ['--brand' as string]: ws.brandColor }}>
      <header className="py-8 text-center text-white" style={{ background: ws.brandColor }}>
        {ws.logoUrl && <img src={ws.logoUrl} alt="" className="mx-auto mb-2 h-12 w-12 rounded object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />}
        <h1 className="text-3xl font-extrabold">{ws.name} Roadmap</h1><p className="mt-1 opacity-90">{ws.description}</p>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-8">
        {items.length === 0 ? <Empty title="Nothing published yet" /> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STAGES.map((s) => (
              <section key={s.key} className="rounded-xl bg-slate-100 p-3">
                <h2 className="mb-3 text-sm font-semibold uppercase text-slate-600">{s.label}</h2>
                <div className="space-y-3">
                  {items.filter((i) => i.stage === s.key).map((i) => (
                    <article key={i.id} className="card !p-3"><h3 className="font-medium">{i.title}</h3><p className="mt-1 text-sm text-slate-600">{i.description}</p><Badge className="mt-2 bg-slate-100 text-slate-600">{s.label}</Badge></article>
                  ))}
                  {!items.some((i) => i.stage === s.key) && <p className="text-xs text-slate-400">Nothing here yet</p>}
                </div>
              </section>
            ))}
          </div>
        )}
        {notes.length > 0 && (
          <section className="mt-10"><h2 className="mb-3 text-xl font-bold">Latest releases</h2>
            <div className="space-y-3">{notes.map((n) => <article key={n.id} className="card"><div className="flex justify-between"><h3 className="font-semibold">v{n.version} — {n.title}</h3><span className="text-sm text-slate-500">{fmtDate(n.releaseDate)}</span></div><p className="mt-1 text-sm text-slate-600">{n.summary}</p></article>)}</div>
          </section>
        )}
      </main>
    </div>
  );
}
