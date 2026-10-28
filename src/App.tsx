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

const BAD_TABS: string[] = ['calendar', 'records', 'audits'];

const SYNC_LABEL = { local: 'Browser only', loading: 'Loading…', live: 'Live', saving: 'Saving…', error: 'Not saved' } as const;

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
      <header className="band">
        <div className="wrap">
          <div className="brand-row">
            <img className="brand-logo" src="/logo-on-dark.png" alt="Black Gold Security" />
            <div className="brand-text">
              <div className="brand-title">ISO Compliance Board</div>
              <div className="brand-sub">{data.settings.company} · security guarding, mobile patrol &amp; security solutions</div>
            </div>
            <div className="brand-right">
              <span className="std">ISO 9001:2015</span>
              <span className="std">ISO 45001:2018</span>
              <span className="band-date">{fmtDate(today())}</span>
              <span className={`sync sync-${sync}`}>{SYNC_LABEL[sync]}</span>
              {teamMode && email && (
                <span className="user-box">
                  <span className="user-email">{email}</span>
                  <button className="btn band-btn small" onClick={signOut}>Sign out</button>
                </span>
              )}
            </div>
          </div>
          <nav className="tabs" aria-label="Sections">
            {PAGES.map((p) => (
              <a key={p.id} href={'#' + p.id} aria-current={page === p.id ? 'page' : undefined} onClick={() => window.scrollTo(0, 0)}>
                {p.label}
                {!!badges[p.id] && <span className={`cnt ${BAD_TABS.includes(p.id) ? 'bad' : ''}`}>{badges[p.id]}</span>}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <div className="wrap">
          {page !== 'overview' && (
            <header className="topbar">
              <h1>{current.label}</h1>
            </header>
          )}
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
        </div>
      </main>
    </div>
  );
}
