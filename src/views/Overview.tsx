import { clauseBySection, computeMetrics } from '../metrics';
import { SECTION_NAMES } from '../clauses';
import { useStore } from '../store';
import type { Standard } from '../types';
import { daysUntil, fmtDate, objectiveOnTrack, objectiveProgress, riskScore } from '../util';
import { Badge, Card, Empty, Progress, Stat } from '../components/ui';

const STATUS_ORDER = ['Verified', 'Implemented', 'In progress', 'Not started', 'Not applicable'];
const STATUS_CLASS: Record<string, string> = {
  Verified: 'seg-verified', Implemented: 'seg-impl', 'In progress': 'seg-prog', 'Not started': 'seg-none', 'Not applicable': 'seg-na',
};

export function Overview({ go }: { go: (page: string) => void }) {
  const { data } = useStore();
  const m = computeMetrics(data);

  return (
    <div className="grid">
      <div className="stats span-all">
        <Stat label="ISO 9001 readiness" value={pct(m.q.pct)} sub={`${m.q.done}/${m.q.total} clauses implemented`} tone={m.q.pct >= 0.9 ? 'good' : m.q.pct >= 0.7 ? 'warn' : 'bad'} />
        <Stat label="ISO 45001 readiness" value={pct(m.s.pct)} sub={`${m.s.done}/${m.s.total} clauses implemented`} tone={m.s.pct >= 0.9 ? 'good' : m.s.pct >= 0.7 ? 'warn' : 'bad'} />
        <Stat label="Open findings / CAPA" value={m.openFindings.length} sub={<>{m.overdueFindings.length} overdue · {m.majorOpen.length} major</>} tone={m.overdueFindings.length || m.majorOpen.length ? 'bad' : 'good'} />
        <Stat label="Days since last LTI" value={m.daysSinceLTI ?? '—'} sub={`${m.ltis.length} LTI · ${m.ytd.length} incidents YTD`} tone={m.ltis.length ? 'warn' : 'good'} />
        <Stat label="LTIFR (YTD)" value={m.ltifr == null ? '—' : m.ltifr.toFixed(2)} sub={m.hours ? `per 1M hrs · TRIR ${m.trir!.toFixed(2)}` : 'Set hours worked in Settings'} />
        <Stat label="High residual risks" value={m.highRisks.length} sub={`${m.hazardsReviewDue.length} risk reviews overdue`} tone={m.highRisks.length ? 'bad' : 'good'} />
      </div>

      <Card title="Clause readiness by section" className="span-2">
        <ClauseBars standard="ISO 9001" />
        <ClauseBars standard="ISO 45001" />
        <div className="legend">
          {STATUS_ORDER.map((s) => <span key={s}><i className={STATUS_CLASS[s]} />{s}</span>)}
        </div>
      </Card>

      <Card title={<>Needs attention <span className="count">{m.actions.length}</span></>}>
        {m.actions.length === 0 ? <Empty>Nothing overdue. 🎉</Empty> : (
          <ul className="actions">
            {m.actions.slice(0, 9).map((a, i) => (
              <li key={i} onClick={() => go(a.page)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(a.page)}>
                <div className="a-main">
                  <Badge tone={a.days < 0 ? 'bad' : 'warn'}>{a.kind}</Badge>
                  <span className="a-label">{a.label}</span>
                </div>
                <span className={`a-when ${a.days < 0 ? 'bad-text' : ''}`}>{a.days < 0 ? `${-a.days}d overdue` : a.days === 0 ? 'today' : `in ${a.days}d`}</span>
              </li>
            ))}
            {m.actions.length > 9 && <li className="more">+{m.actions.length - 9} more</li>}
          </ul>
        )}
      </Card>

      <Card title="Incidents – last 12 months" className="span-2">
        <IncidentChart months={m.months} />
      </Card>

      <Card title="Residual risk matrix">
        <RiskMatrix cells={data.hazards.map((h) => [Number(h.residualLikelihood), Number(h.residualSeverity)])} />
      </Card>

      <Card title="Upcoming audits & reviews" className="span-2" actions={<button className="btn ghost" onClick={() => go('audits')}>View all</button>}>
        {m.upcomingAudits.length === 0 ? <Empty>No audits planned.</Empty> : (
          <ul className="list">
            {m.upcomingAudits.slice(0, 5).map((a) => (
              <li key={a.id}>
                <div><strong>{a.title}</strong><div className="muted small">{a.type} · {a.standard} · {a.auditor}</div></div>
                <div className="right"><div>{fmtDate(a.plannedDate)}</div><div className="muted small">{relDays(a.plannedDate)}</div></div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={<>Objectives <span className="count">{m.objOnTrack.length}/{data.objectives.length} on track</span></>} actions={<button className="btn ghost" onClick={() => go('records')}>Edit</button>}>
        {data.objectives.length === 0 ? <Empty>No objectives yet.</Empty> : (
          <ul className="objectives">
            {data.objectives.map((o) => {
              const ok = objectiveOnTrack(o);
              return (
                <li key={o.id}>
                  <div className="o-head"><span>{o.objective}</span><span className={ok ? 'good-text' : 'bad-text'}>{o.actual}{o.unit} / {o.target}{o.unit}</span></div>
                  <Progress value={objectiveProgress(o)} tone={ok ? 'good' : 'warn'} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Records health" className="span-all">
        <div className="stats inner">
          <Stat label="Documents overdue review" value={m.docsOverdue.length} sub={`${m.docsSoon.length} due in 30 days`} tone={m.docsOverdue.length ? 'bad' : 'good'} />
          <Stat label="Training expired" value={m.trainingExpired.length} sub={`${m.trainingSoon.length} expiring in 30 days`} tone={m.trainingExpired.length ? 'bad' : 'good'} />
          <Stat label="Open incidents" value={m.openIncidents.length} sub="not yet closed" tone={m.openIncidents.length ? 'warn' : 'good'} />
          <Stat label="ISO 9001 cert expiry" value={data.settings.cert9001Expiry ? relDays(data.settings.cert9001Expiry) : '—'} sub={fmtDate(data.settings.cert9001Expiry)} tone={certTone(data.settings.cert9001Expiry)} />
          <Stat label="ISO 45001 cert expiry" value={data.settings.cert45001Expiry ? relDays(data.settings.cert45001Expiry) : '—'} sub={fmtDate(data.settings.cert45001Expiry)} tone={certTone(data.settings.cert45001Expiry)} />
        </div>
      </Card>
    </div>
  );
}

function pct(v: number) {
  return Math.round(v * 100) + '%';
}

function relDays(date: string) {
  const d = daysUntil(date);
  if (isNaN(d)) return '—';
  if (d === 0) return 'today';
  return d < 0 ? `${-d}d ago` : `in ${d}d`;
}

function certTone(date: string) {
  if (!date) return undefined;
  const d = daysUntil(date);
  return d < 0 ? 'bad' : d <= 90 ? 'warn' : 'good';
}

function ClauseBars({ standard }: { standard: Standard }) {
  const { data } = useStore();
  const by = clauseBySection(data.clauses, standard);
  return (
    <div className="clause-bars">
      <h4>{standard}</h4>
      {Object.keys(SECTION_NAMES).map((s) => {
        const counts = by[s] ?? {};
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (!total) return null;
        return (
          <div className="cb-row" key={s}>
            <span className="cb-label">{s}. {SECTION_NAMES[s]}</span>
            <div className="cb-bar" title={STATUS_ORDER.filter((x) => counts[x]).map((x) => `${x}: ${counts[x]}`).join(' · ')}>
              {STATUS_ORDER.map((st) => counts[st] ? <div key={st} className={STATUS_CLASS[st]} style={{ flex: counts[st] }} /> : null)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IncidentChart({ months }: { months: { label: string; lti: number; other: number; near: number }[] }) {
  const max = Math.max(1, ...months.map((m) => m.lti + m.other + m.near));
  return (
    <>
      <div className="chart">
        {months.map((m, i) => {
          const t = m.lti + m.other + m.near;
          return (
            <div className="col" key={i} title={`${m.label}: ${m.near} near miss, ${m.other} other, ${m.lti} LTI`}>
              <div className="col-val">{t || ''}</div>
              <div className="col-stack" style={{ height: (t / max) * 100 + '%' }}>
                {m.lti > 0 && <div className="seg-lti" style={{ flex: m.lti }} />}
                {m.other > 0 && <div className="seg-other" style={{ flex: m.other }} />}
                {m.near > 0 && <div className="seg-near" style={{ flex: m.near }} />}
              </div>
              <div className="col-label">{m.label}</div>
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span><i className="seg-lti" />Lost time injury</span>
        <span><i className="seg-other" />Other injury / event</span>
        <span><i className="seg-near" />Near miss</span>
      </div>
    </>
  );
}

function RiskMatrix({ cells }: { cells: [number, number][] }) {
  const count = (l: number, s: number) => cells.filter(([a, b]) => a === l && b === s).length;
  return (
    <div className="matrix-wrap">
      <div className="matrix-y">Likelihood →</div>
      <div className="matrix">
        {[5, 4, 3, 2, 1].map((l) => [1, 2, 3, 4, 5].map((s) => {
          const score = riskScore(l, s);
          const n = count(l, s);
          return (
            <div key={`${l}-${s}`} className={`mcell ${score >= 15 ? 'm-high' : score >= 8 ? 'm-med' : 'm-low'}`} title={`L${l} × S${s} = ${score}`}>
              {n > 0 && <span className="mdot">{n}</span>}
            </div>
          );
        }))}
      </div>
      <div className="matrix-x">Severity →</div>
    </div>
  );
}
