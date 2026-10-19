import { useEffect, useState } from 'react';
import { computeMetrics } from './metrics';
import { useStore } from './store';
import { fmtDate, today } from './util';
import { Overview } from './views/Overview';
import { AuditsView, ClausesView, RecordsView, SafetyView } from './views/Modules';
import { SettingsView } from './views/Settings';

const PAGES = [
  { id: 'overview', label: 'Overview', icon: '◧' },
  { id: 'clauses', label: 'Clauses', icon: '☰' },
  { id: 'audits', label: 'Audits & CAPA', icon: '✓' },
  { id: 'safety', label: 'OH&S', icon: '⛑' },
  { id: 'records', label: 'Records', icon: '▤' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
] as const;

type PageId = (typeof PAGES)[number]['id'];

function readHash(): PageId {
  const h = window.location.hash.replace('#', '');
  return (PAGES.find((p) => p.id === h)?.id ?? 'overview') as PageId;
}

export default function App() {
  const { data } = useStore();
  const [page, setPage] = useState<PageId>(readHash);
  const m = computeMetrics(data);

  useEffect(() => {
    const on = () => setPage(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = (p: string) => {
    window.location.hash = p;
    window.scrollTo(0, 0);
  };

  const badges: Partial<Record<PageId, number>> = {
    audits: m.overdueFindings.length,
    safety: m.openIncidents.length,
    records: m.docsOverdue.length + m.trainingExpired.length,
  };

  const current = PAGES.find((p) => p.id === page)!;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">✓</div>
          <div>
            <div className="brand-name">ISO Compliance</div>
            <div className="brand-sub">9001 · 45001</div>
          </div>
        </div>
        <nav>
          {PAGES.map((p) => (
            <a key={p.id} href={'#' + p.id} className={page === p.id ? 'active' : ''} onClick={() => window.scrollTo(0, 0)}>
              <span className="nav-icon" aria-hidden>{p.icon}</span>
              <span>{p.label}</span>
              {!!badges[p.id] && <span className="nav-badge">{badges[p.id]}</span>}
            </a>
          ))}
        </nav>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <h1>{current.label}</h1>
            <div className="muted small">{data.settings.company} · {fmtDate(today())}</div>
          </div>
        </header>
        {page === 'overview' && <Overview go={go} />}
        {page === 'clauses' && <ClausesView />}
        {page === 'audits' && <AuditsView />}
        {page === 'safety' && <SafetyView />}
        {page === 'records' && <RecordsView />}
        {page === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
