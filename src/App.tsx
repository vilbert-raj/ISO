import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { computeMetrics } from './metrics';
import { useStore } from './store';
import { fmtDate, today } from './util';
import { ActionsView, CalendarView, ObjectivesView, RegistersView } from './views/Compliance';
import { Overview } from './views/Overview';
import { AuditsView, ClausesView, RecordsView, SafetyView } from './views/Modules';
import { SettingsView } from './views/Settings';

const PAGES = [
  { id: 'overview', label: 'Overview', icon: '◧' },
  { id: 'calendar', label: 'Calendar', icon: '◷' },
  { id: 'clauses', label: 'Clauses', icon: '☰' },
  { id: 'audits', label: 'Audits & CAPA', icon: '✓' },
  { id: 'safety', label: 'OH&S', icon: '⛑' },
  { id: 'objectives', label: 'Objectives', icon: '◎' },
  { id: 'registers', label: 'Legal & risks', icon: '§' },
  { id: 'records', label: 'Records', icon: '▤' },
  { id: 'actions', label: 'Actions', icon: '→' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
] as const;

type PageId = (typeof PAGES)[number]['id'];

function readHash(): PageId {
  const h = window.location.hash.replace('#', '');
  return (PAGES.find((p) => p.id === h)?.id ?? 'overview') as PageId;
}

const SYNC_LABEL = { local: 'Saved in this browser only', loading: 'Loading…', live: 'Live · shared with team', saving: 'Saving…', error: 'Not saved' } as const;

export default function App() {
  const { data, sync, error, teamMode, reload } = useStore();
  const { email, signOut } = useAuth();
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
    calendar: m.activitiesOverdue.length,
    audits: m.overdueFindings.length,
    safety: m.openIncidents.length,
    objectives: m.objUnreported.length,
    registers: m.legalOpen.length,
    records: m.docsOverdue.length + m.trainingExpired.length,
    actions: m.actionsOverdue.length,
  };

  const current = PAGES.find((p) => p.id === page)!;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <picture>
            <source srcSet="/logo-on-dark.png" media="(prefers-color-scheme: dark)" />
            <img className="brand-logo" src="/logo-on-light.png" alt="Black Gold Security" />
          </picture>
          <div className="brand-sub">ISO 9001 · ISO 45001 compliance</div>
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
        {teamMode && email && (
          <div className="user-box">
            <span>{email}</span>
            <button className="btn ghost small" onClick={signOut}>Sign out</button>
          </div>
        )}
      </aside>
      <main>
        <header className="topbar">
          <div>
            <h1>{current.label}</h1>
            <div className="muted small">{data.settings.company} · {fmtDate(today())}</div>
          </div>
          <span className={`sync sync-${sync}`}>{SYNC_LABEL[sync]}</span>
        </header>
        {sync === 'error' && (
          <div className="banner-error" role="alert">
            <span>{error || 'Your last change was not saved.'}</span>
            <button className="btn small" onClick={reload}>Reload data</button>
          </div>
        )}
        {page === 'overview' && <Overview go={go} />}
        {page === 'calendar' && <CalendarView />}
        {page === 'clauses' && <ClausesView />}
        {page === 'audits' && <AuditsView />}
        {page === 'safety' && <SafetyView />}
        {page === 'objectives' && <ObjectivesView />}
        {page === 'registers' && <RegistersView />}
        {page === 'records' && <RecordsView />}
        {page === 'actions' && <ActionsView />}
        {page === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
