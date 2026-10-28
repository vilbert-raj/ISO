import type { ReactNode } from 'react';
import { SECTION_NAMES, section } from '../clauses';
import { computeMetrics } from '../metrics';
import { useStore } from '../store';
import type { Standard } from '../types';
import { activityDue, daysUntil, fmtDate, monthLabel, riskScore } from '../util';
import { Empty } from '../components/ui';

type Sev = 'bad' | 'warn' | 'none';

interface Item { sev: Sev; title: string; detail: string; when: string; who: string; order: number; go: string }

function rel(date: string) {
  const d = daysUntil(date);
  if (isNaN(d)) return '';
  if (d === 0) return 'today';
  if (d < 0) return -d < 60 ? `${-d} d overdue` : `${Math.round(-d / 30.4)} mo overdue`;
  return d < 60 ? `in ${d} d` : `in ${Math.round(d / 30.4)} mo`;
}

export function Overview({ go }: { go: (page: string) => void }) {
  const { data } = useStore();
  const m = computeMetrics(data);

  const awaiting = m.openFindings.filter((f) => f.status === 'Awaiting verification');
  const highActions = m.openActions.filter((a) => a.priority === 'High');
  const controlled = data.documents.filter((d) => d.status !== 'Obsolete');

  /* ---- needs attention ---- */
  const items: Item[] = [];
  for (const a of m.activitiesOverdue) { const due = activityDue(a); items.push({ sev: 'bad', title: a.title, detail: a.reference, when: rel(due), who: a.owner, order: daysUntil(due), go: 'calendar' }); }
  for (const f of m.openFindings) {
    const over = f.due && daysUntil(f.due) < 0;
    items.push({ sev: over ? 'bad' : 'warn', title: `${f.ref} · ${f.status}`, detail: f.description, when: f.due ? rel(f.due) : '', who: f.owner, order: f.due ? daysUntil(f.due) : 0, go: 'audits' });
  }
  for (const a of highActions) { const over = a.dueDate && daysUntil(a.dueDate) < 0; items.push({ sev: over ? 'bad' : 'warn', title: a.title, detail: a.detail, when: a.dueDate ? rel(a.dueDate) : '', who: a.owner, order: a.dueDate ? daysUntil(a.dueDate) : 0, go: 'actions' }); }
  if (m.hazardsReviewDue.length) {
    const areas = [...new Set(m.hazardsReviewDue.map((h) => h.activity.split(' – ')[0]))];
    const oldest = [...m.hazardsReviewDue].sort((a, b) => a.reviewDate.localeCompare(b.reviewDate))[0];
    items.push({ sev: 'bad', title: `HIRARC review overdue: ${areas.join(', ')}`, detail: `${m.hazardsReviewDue.length} hazards past their yearly review (BGS-P13)`, when: rel(oldest.reviewDate), who: oldest.owner, order: daysUntil(oldest.reviewDate), go: 'safety' });
  }
  for (const a of m.activitiesSoon) { const due = activityDue(a); items.push({ sev: 'warn', title: a.title, detail: a.reference, when: rel(due), who: a.owner, order: 100 + daysUntil(due), go: 'calendar' }); }
  for (const a of m.activitiesNoDate) items.push({ sev: 'none', title: a.title, detail: 'No date on record. Enter when it was last done.', when: 'date needed', who: a.owner, order: 500, go: 'calendar' });
  const rank = { bad: 0, warn: 1, none: 2 };
  items.sort((a, b) => rank[a.sev] - rank[b.sev] || a.order - b.order);

  /* ---- clause readiness ---- */
  const sections = Object.keys(SECTION_NAMES);
  const SUB: Record<string, string> = {
    '4': 'Issues, interested parties, scope', '5': 'Policy, roles, consultation', '6': 'Risks, HIRARC, legal, objectives',
    '7': 'Competence, infrastructure, documents', '8': 'Suppliers, emergency, inspections', '9': 'Monitoring, audit, management review', '10': 'NCRs, incidents, corrective action',
  };
  const cell = (std: Standard, sec: string) => {
    const list = data.clauses.filter((c) => c.standard === std && section(c.clause) === sec && c.status !== 'Not applicable');
    if (!list.length) return <span className="muted">—</span>;
    const ns = list.filter((c) => c.status === 'Not started').length;
    const ip = list.filter((c) => c.status === 'In progress').length;
    if (ns) return <Pill k="bad">{ns} not started</Pill>;
    if (ip) return <Pill k="warn">{ip} in progress</Pill>;
    return <Pill k="ok">On track</Pill>;
  };

  /* ---- objectives strip ---- */
  const months: string[] = [];
  for (let i = 12; i >= 1; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  const objs = [...data.objectives].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  const docsOverdue = m.docsOverdue.length;

  return (
    <div className="ov">
      <div className="sec-head">
        <div>
          <h2>Where we stand today</h2>
          <p>Live from the shared registers. Click any figure to open its register.</p>
        </div>
      </div>

      <div className="kpis">
        <Kpi go={() => go('calendar')} lab="Overdue activities" val={m.activitiesOverdue.length} cls={m.activitiesOverdue.length ? 'bad' : 'ok'} foot={`${m.activitiesSoon.length} due in 30 days · ${m.activitiesNoDate.length} need a date`} />
        <Kpi go={() => go('audits')} lab="Open NCRs" val={m.openFindings.length} cls={m.overdueFindings.length ? 'bad' : m.openFindings.length ? 'warn' : 'ok'} foot={`${awaiting.length} awaiting verification`} />
        <Kpi go={() => go('actions')} lab="Open actions" val={m.openActions.length} cls={highActions.length ? 'bad' : m.openActions.length ? 'warn' : 'ok'} foot={`${highActions.length} high priority`} />
        <Kpi go={() => go('objectives')} lab="Objectives unreported" val={m.objUnreported.length} cls={m.objUnreported.length ? 'warn' : 'ok'} foot={`for ${monthLabel(m.lastMonth)} · ${data.objectives.length} objectives`} />
        <Kpi go={() => go('registers')} lab="Legal compliance" val={m.legalPct == null ? '—' : Math.round(m.legalPct * 100) + '%'} cls={m.legalOpen.length ? 'warn' : 'ok'} foot={`${m.legalOpen.length} of ${data.legal.length} items not closed`} />
        <Kpi go={() => go('records')} lab="Docs past 2-yr review" val={docsOverdue} cls={docsOverdue ? 'bad' : 'ok'} foot={`of ${controlled.length} controlled documents`} />
      </div>

      <div className="grid2">
        <section className="panel">
          <header><h3>Needs attention</h3><span className="hint">Overdue first</span></header>
          {items.length === 0 ? <Empty>Nothing needs attention.</Empty> : (
            <>
              <ul className="att">
                {items.slice(0, 14).map((i, n) => (
                  <li key={n} onClick={() => go(i.go)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(i.go)}>
                    <span className={`sev ${i.sev}`} />
                    <div className="att-main"><div className="t">{i.title}</div><div className="d">{i.detail}</div></div>
                    <div className="w">{i.when}<br /><span>{i.who}</span></div>
                  </li>
                ))}
              </ul>
              {items.length > 14 && <div className="panel-foot">{items.length - 14} more in Calendar, Audits &amp; CAPA and Actions.</div>}
            </>
          )}
        </section>

        <div className="col">
          <section className="panel">
            <header><h3>Clause readiness</h3><span className="hint">From the clause register</span></header>
            <div className="table-wrap flush">
              <table className="cmap">
                <thead><tr><th /><th>Clause</th><th>ISO 9001</th><th>ISO 45001</th></tr></thead>
                <tbody>
                  {sections.map((s) => (
                    <tr key={s} onClick={() => go('clauses')}>
                      <td className="cl">{s}</td>
                      <td className="nm">{SECTION_NAMES[s]}<small>{SUB[s]}</small></td>
                      <td>{cell('ISO 9001', s)}</td>
                      <td>{cell('ISO 45001', s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <header><h3>Objectives, month by month</h3><a className="hint link" href="#objectives">Update results</a></header>
            <div className="body">
              {objs.length === 0 ? <Empty>No objectives yet.</Empty> : (
                <div className="ostrip">
                  {objs.map((o) => (
                    <div className="orow" key={o.id}>
                      <div className="lbl"><b>{o.code}</b><span>{o.objective}</span></div>
                      <div className="dots">{months.map((mm) => { const r = o.results?.[mm]; return <i key={mm} className={`dot ${r ? 'oc-' + r.status : ''}`} title={`${monthLabel(mm)}: ${r ? ({ A: 'Achieved', NA: 'Not achieved', IP: 'In progress' } as Record<string, string>)[r.status] : 'not reported'}`} />; })}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="legend">
                <span><i className="dot oc-A" />Achieved</span><span><i className="dot oc-IP" />In progress</span><span><i className="dot oc-NA" />Not achieved</span><span><i className="dot" />Not reported</span>
                <span>Last 12 months, {monthLabel(months[0])} – {monthLabel(months[11])}</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <header><h3>NCRs raised per year</h3><span className="hint">By source</span></header>
            <div className="body"><NcrChart /></div>
          </section>
        </div>
      </div>

      <div className="grid3">
        <section className="panel">
          <header><h3>OH&amp;S performance</h3><a className="hint link" href="#safety">Incidents &amp; HIRARC</a></header>
          <div className="mini-stats body">
            <Mini lab="Days since last LTI" val={m.daysSinceLTI ?? '—'} sub={`${m.ltis.length} LTI · ${m.ytd.length} incidents this year`} />
            <Mini lab="LTIFR this year" val={m.ltifr == null ? '—' : m.ltifr.toFixed(2)} sub={m.hours ? `per 1M hours · TRIR ${m.trir!.toFixed(2)}` : 'Set hours worked in Settings'} />
            <Mini lab="High risks (HIRARC)" val={m.highRisks.length} sub={`${data.hazards.length} hazards on record`} />
          </div>
        </section>
        <section className="panel">
          <header><h3>Residual risk matrix</h3><span className="hint">BGS-P13 3×3</span></header>
          <div className="body"><RiskMatrix cells={data.hazards.map((h) => [Number(h.residualLikelihood), Number(h.residualSeverity)])} /></div>
        </section>
        <section className="panel">
          <header><h3>Upcoming audits &amp; reviews</h3><a className="hint link" href="#audits">View all</a></header>
          {m.upcomingAudits.length === 0 ? <div className="body"><Empty>No audits planned.</Empty></div> : (
            <ul className="list">
              {m.upcomingAudits.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <div><strong>{a.title}</strong><div className="muted small">{a.type} · {a.auditor}</div></div>
                  <div className="right nowrap"><div>{fmtDate(a.plannedDate)}</div><div className="muted small">{rel(a.plannedDate)}</div></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="src">
        Started on 28 Oct 2026 from the Quality Manual Rev 2, OSH Manual Rev 0, policies and objectives, procedures BGS-P01–P14, the NCR tracker, QO and OSH trackers, legal register, R&amp;O register, document master list, supplier records, HIRARCs, attendance lists and the 2026 customer survey. Everything since then is what the team has entered here.
      </p>
    </div>
  );
}

function Pill({ k, children }: { k: 'ok' | 'warn' | 'bad' | 'none'; children: ReactNode }) {
  return <span className={`pill ${k}`}>{children}</span>;
}

function Kpi({ lab, val, cls, foot, go }: { lab: string; val: ReactNode; cls: string; foot: string; go: () => void }) {
  return (
    <button className="kpi" onClick={go}>
      <span className="lab">{lab}</span>
      <span className={`val ${cls}`}>{val}</span>
      <span className="foot">{foot}</span>
    </button>
  );
}

function Mini({ lab, val, sub }: { lab: string; val: ReactNode; sub: string }) {
  return <div className="mini"><span className="lab">{lab}</span><span className="v">{val}</span><span className="foot">{sub}</span></div>;
}

function NcrChart() {
  const { data } = useStore();
  if (!data.findings.length) return <Empty>No NCRs yet.</Empty>;
  const src = ['Customer complaint', 'Internal audit', 'External audit', 'Other'];
  const lbl = ['Complaint', 'Internal audit', 'External audit', 'Other'];
  const col = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)'];
  const by: Record<string, number[]> = {};
  for (const f of data.findings) {
    const y = (f.raised || '').slice(0, 4);
    if (!/^\d{4}$/.test(y)) continue;
    by[y] ??= [0, 0, 0, 0];
    const i = src.indexOf(f.source);
    by[y][i < 0 ? 3 : i]++;
  }
  const ys = Object.keys(by).sort();
  const max = Math.max(1, ...ys.map((y) => by[y].reduce((a, b) => a + b, 0)));
  const top = Math.ceil(max / 10) * 10;
  const W = 520, H = 210, L = 30, B = 24, T = 12, cw = (W - L - 8) / ys.length, bw = Math.min(46, cw * 0.6);
  const yS = (v: number) => H - B - (v / top) * (H - B - T);
  const ticks = Array.from({ length: 6 }, (_, i) => (top / 5) * i);
  return (
    <div className="chart-svg">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="NCRs per year by source">
        {ticks.map((v) => <g key={v}><line className="gl" x1={L} x2={W - 4} y1={yS(v)} y2={yS(v)} /><text x={L - 6} y={yS(v) + 4} textAnchor="end">{v}</text></g>)}
        {ys.map((y, i) => {
          let acc = 0;
          const x = L + cw * i + (cw - bw) / 2;
          const segs = by[y].map((v, j) => {
            if (!v) return null;
            const r = <rect key={j} x={x} y={yS(acc + v)} width={bw} height={yS(acc) - yS(acc + v)} fill={col[j]}><title>{`${y} · ${lbl[j]}: ${v}`}</title></rect>;
            acc += v;
            return r;
          });
          return <g key={y}>{segs}<text x={x + bw / 2} y={yS(acc) - 5} textAnchor="middle" className="tot">{acc}</text><text x={x + bw / 2} y={H - 6} textAnchor="middle">{y}</text></g>;
        })}
      </svg>
      <div className="legend">{lbl.map((s, i) => <span key={s}><i style={{ background: col[i] }} />{s}</span>)}</div>
    </div>
  );
}

function RiskMatrix({ cells }: { cells: [number, number][] }) {
  const count = (l: number, s: number) => cells.filter(([a, b]) => a === l && b === s).length;
  return (
    <div className="matrix-wrap">
      <div className="matrix-y">Likelihood →</div>
      <div className="matrix">
        {[3, 2, 1].map((l) => [1, 2, 3].map((s) => {
          const score = riskScore(l, s);
          const n = count(l, s);
          return (
            <div key={`${l}-${s}`} className={`mcell ${score >= 6 ? 'm-high' : score >= 3 ? 'm-med' : 'm-low'}`} title={`L${l} × S${s} = ${score}`}>
              {n > 0 && <span className="mdot">{n}</span>}
            </div>
          );
        }))}
      </div>
      <div className="matrix-x">Severity →</div>
    </div>
  );
}
