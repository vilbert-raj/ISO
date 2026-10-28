import { useMemo, useState } from 'react';
import { CrudTable, type Field } from '../components/CrudTable';
import { Badge, Card, Empty } from '../components/ui';
import { useStore } from '../store';
import type { ActionRec, Activity, LegalItem, MonthResult, Objective, RiskItem } from '../types';
import { activityDue, activityStatus, daysUntil, fmtDate, frequencyLabel, monthKey, monthLabel, today } from '../util';
import { objectiveFields } from './Modules';

const STD_OPTS = ['ISO 9001', 'ISO 45001', 'Integrated'];
const PEOPLE_HINT = 'e.g. Vilbert Raj, Vigny Raj, Vinod Raj, Mazidah, Aishah, James, Zulazril';

/* ---------------- Compliance calendar ---------------- */

const activityFields: Field<Activity>[] = [
  { key: 'title', label: 'Activity', required: true },
  { key: 'standard', label: 'Standard', type: 'select', options: STD_OPTS },
  { key: 'clause', label: 'Clause' },
  { key: 'reference', label: 'Procedure / requirement' },
  { key: 'frequencyMonths', label: 'Every (months)', type: 'number', hint: '1 = monthly, 3 = quarterly, 12 = yearly, 0 = one-off' },
  { key: 'owner', label: 'Owner', hint: PEOPLE_HINT },
  { key: 'lastDone', label: 'Last done', type: 'date' },
  { key: 'fixedDue', label: 'Fixed due date', type: 'date', hint: 'Optional. Overrides last done + frequency (e.g. a legal deadline).' },
  { key: 'evidence', label: 'Evidence / record', type: 'textarea' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const STATUS_RANK: Record<string, number> = { Overdue: 0, 'Due soon': 1, 'Date needed': 2, 'On track': 3 };

export function CalendarView() {
  const { upsert } = useStore();
  const columns: Field<Activity>[] = [
    { key: 'id', label: 'Status', render: (a) => <Badge>{activityStatus(a)}</Badge> },
    { key: 'title', label: 'Activity', render: (a) => <div><strong>{a.title}</strong><div className="muted small">{a.reference}</div></div> },
    { key: 'standard', label: 'Standard' },
    { key: 'frequencyMonths', label: 'Frequency', render: (a) => frequencyLabel(a.frequencyMonths) },
    { key: 'lastDone', label: 'Last done', type: 'date' },
    { key: 'fixedDue', label: 'Next due', render: (a) => { const d = activityDue(a); return d ? <span className="nowrap">{fmtDate(d)}<div className="muted small">{rel(d)}</div></span> : '—'; } },
    { key: 'owner', label: 'Owner' },
    { key: 'evidence', label: '', render: (a) => (
      <button className="btn small" onClick={(e) => { e.stopPropagation(); upsert('activities', { ...a, lastDone: today() }); }} title="Set last done to today">Done today</button>
    ) },
  ];
  return (
    <CrudTable
      title="Compliance calendar"
      collection="activities"
      fields={activityFields}
      columns={columns}
      intro="Recurring obligations from the Quality Manual, OSH Manual, procedures BGS-P01–P14 and the OSH regulations. Next due = last done + frequency. Click “Done today” when it happens, or open the row to enter another date and the record (minutes, attendance list, report)."
      newItem={() => ({ title: '', standard: 'Integrated', clause: '', reference: '', frequencyMonths: 12, owner: '', lastDone: '', fixedDue: '', evidence: '', notes: '' })}
      filterKeys={['standard', 'owner']}
      sort={(a, b) => STATUS_RANK[activityStatus(a)] - STATUS_RANK[activityStatus(b)] || (activityDue(a) || '9').localeCompare(activityDue(b) || '9')}
      rowFlag={(a) => { const s = activityStatus(a); return s === 'Overdue' ? 'overdue' : s === 'Due soon' || s === 'Date needed' ? 'soon' : undefined; }}
    />
  );
}

function rel(date: string) {
  const d = daysUntil(date);
  if (isNaN(d)) return '';
  if (d === 0) return 'today';
  if (d < 0) return -d < 60 ? `${-d} d overdue` : `${Math.round(-d / 30.4)} mo overdue`;
  return d < 60 ? `in ${d} d` : `in ${Math.round(d / 30.4)} mo`;
}

/* ---------------- Objectives (monthly) ---------------- */

const RES_LABEL: Record<string, string> = { A: 'Achieved', NA: 'Not achieved', IP: 'In progress' };

export function ObjectivesView() {
  const { data, upsert } = useStore();
  const thisYear = Number(today().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [cell, setCell] = useState<{ o: Objective; m: string } | null>(null);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`), [year]);
  const objs = [...data.objectives].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.standard.localeCompare(b.standard));
  const now = monthKey();
  const lastMonth = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const missing = objs.filter((o) => !o.results?.[lastMonth]).length;

  const columns: Field<Objective>[] = [
    { key: 'code', label: 'Code' },
    { key: 'objective', label: 'Objective' },
    { key: 'standard', label: 'Standard' },
    { key: 'target', label: 'Target', render: (o) => `${o.direction === 'Lower is better' ? '≤ ' : '≥ '}${o.target}${o.unit === '%' ? '%' : ' ' + (o.unit || '')}` },
    { key: 'owner', label: 'PIC' },
    { key: 'frequency', label: 'Frequency' },
  ];

  return (
    <div className="stack">
      <Card
        title={<>Monthly results <span className="count">{missing ? `${missing} not reported for ${monthLabel(lastMonth)}` : 'all reported'}</span></>}
        actions={<select value={year} onChange={(e) => setYear(Number(e.target.value))}>{[thisYear - 1, thisYear, thisYear + 1].map((y) => <option key={y}>{y}</option>)}</select>}
      >
        <p className="intro">One cell per objective per month. Click a cell to record whether it was achieved, the figure and a note. Report every month, including months where nothing happened (Quality Manual 9.2, OSH Objective Program).</p>
        {objs.length === 0 ? <Empty>No objectives yet. Add them in the table below.</Empty> : (
          <div className="table-wrap">
            <table className="ogrid">
              <thead><tr><th>Objective</th>{months.map((m) => <th key={m}>{new Date(m + '-01T00:00:00').toLocaleDateString(undefined, { month: 'short' })}</th>)}</tr></thead>
              <tbody>
                {objs.map((o) => (
                  <tr key={o.id}>
                    <td className="o-name"><span className="muted small">{o.code} · {o.standard}</span><div>{o.objective}</div></td>
                    {months.map((m) => {
                      const r = o.results?.[m];
                      const future = m > now;
                      return (
                        <td key={m}>
                          <button className={`ocell ${r ? 'oc-' + r.status : ''} ${r?.note ? 'oc-note' : ''}`} disabled={future && !r} onClick={() => setCell({ o, m })} title={r ? `${RES_LABEL[r.status]}${r.value != null ? ' · ' + r.value : ''}${r.note ? ' · ' + r.note : ''}` : 'Not reported'}>
                            {r?.value != null && <b>{r.value}{o.unit === '%' ? '%' : ''}</b>}
                            <span>{r ? (r.status === 'A' ? 'Ach.' : r.status === 'NA' ? 'Not' : 'Prog.') : future ? '' : '+'}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="legend">
          <span><i className="oc-A" />Achieved</span><span><i className="oc-IP" />In progress</span><span><i className="oc-NA" />Not achieved</span><span>Underlined = has a note</span>
        </div>
        {objs.some((o) => o.note) && (
          <ul className="notes">{objs.filter((o) => o.note).map((o) => <li key={o.id}><Badge tone="muted">{o.code || o.objective}</Badge> {o.note}</li>)}</ul>
        )}
      </Card>

      <CrudTable
        title="Objective definitions"
        collection="objectives"
        fields={objectiveFields}
        columns={columns}
        intro="Quality Objectives (Rev 4) and OSH Objectives (Rev 1). Edit a row to change the target, PIC or wording."
        newItem={() => ({ code: '', standard: 'ISO 9001', objective: '', kpi: '', target: 0, actual: 0, direction: 'Lower is better', unit: '', owner: '', due: '', frequency: 'Monthly', results: {}, note: '' })}
        filterKeys={['standard']}
        sort={(a, b) => (a.order ?? 99) - (b.order ?? 99)}
      />

      {cell && <CellEditor o={cell.o} m={cell.m} onClose={() => setCell(null)} onSave={(res) => {
        const results = { ...(cell.o.results || {}) };
        if (res) results[cell.m] = res; else delete results[cell.m];
        const latest = Object.keys(results).sort().pop();
        const actual = latest && results[latest].value != null ? Number(results[latest].value) : cell.o.actual;
        upsert('objectives', { ...cell.o, results, actual });
        setCell(null);
      }} />}
    </div>
  );
}

function CellEditor({ o, m, onClose, onSave }: { o: Objective; m: string; onClose: () => void; onSave: (r: MonthResult | null) => void }) {
  const cur = o.results?.[m];
  const [status, setStatus] = useState<MonthResult['status']>(cur?.status ?? 'A');
  const [value, setValue] = useState(cur?.value != null ? String(cur.value) : '');
  const [note, setNote] = useState(cur?.note ?? '');
  const label = new Date(m + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`${o.code} ${label}`}>
        <header className="modal-head"><h3>{o.code || 'Objective'} · {label}</h3><button className="btn ghost icon" onClick={onClose} aria-label="Close">✕</button></header>
        <form className="form" onSubmit={(e) => { e.preventDefault(); const r: MonthResult = { status }; if (value !== '') r.value = Number(value); if (note.trim()) r.note = note.trim(); onSave(r); }}>
          <p className="span2 muted">{o.objective}<br />Target: {o.target}{o.unit === '%' ? '%' : ' ' + (o.unit || '')} · {o.kpi}</p>
          <label htmlFor="oc-status"><span>Result</span>
            <select id="oc-status" value={status} onChange={(e) => setStatus(e.target.value as MonthResult['status'])}>
              <option value="A">Achieved</option><option value="NA">Not achieved</option><option value="IP">In progress</option>
            </select>
          </label>
          <label htmlFor="oc-value"><span>Figure ({o.unit || 'number'})</span><input id="oc-value" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} /></label>
          <label htmlFor="oc-note" className="span2"><span>Note</span><textarea id="oc-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <footer className="modal-foot span2">
            {cur && <button type="button" className="btn ghost danger-text" onClick={() => onSave(null)}>Clear month</button>}
            <span className="spacer" />
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">Save</button>
          </footer>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Registers: legal + risks & opportunities ---------------- */

const LEGAL_STATUS = ['Compliant', 'In progress', 'Not compliant', 'No case so far', 'Not assessed'];
const legalFields: Field<LegalItem>[] = [
  { key: 'no', label: 'No.', type: 'number' },
  { key: 'law', label: 'Act / regulation / guideline', required: true },
  { key: 'ref', label: 'Section' },
  { key: 'title', label: 'Requirement', required: true },
  { key: 'requirement', label: 'Requirement in brief', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: LEGAL_STATUS, badge: true },
  { key: 'evaluatedOn', label: 'Evaluated', type: 'date' },
  { key: 'remarks', label: 'Remarks / evidence', type: 'textarea' },
];

const riskFields: Field<RiskItem>[] = [
  { key: 'no', label: 'No.', type: 'number' },
  { key: 'issue', label: 'Issue / interested party', required: true },
  { key: 'riskOpportunity', label: 'Risk (R) / opportunity (O)', type: 'textarea', inTable: true },
  { key: 'type', label: 'Type', type: 'select', options: ['Risk', 'Opportunity', 'Risk & opportunity'], inTable: false },
  { key: 'rootCause', label: 'Potential root cause', type: 'textarea' },
  { key: 'currentAction', label: 'Current action', type: 'textarea' },
  { key: 'requiredAction', label: 'Further action required', type: 'textarea' },
  { key: 'level', label: 'Level', type: 'select', options: ['High', 'Medium', 'Low'], badge: true },
  { key: 'owner', label: 'Risk owner' },
  { key: 'status', label: 'Status', type: 'select', options: ['Action planned', 'Controls in place', 'Closed'], badge: true },
  { key: 'reviewDate', label: 'Reviewed', type: 'date' },
];

export function RegistersView() {
  const { data } = useStore();
  const ok = data.legal.filter((l) => l.status === 'Compliant' || l.status === 'No case so far').length;
  const lvl = (l: string) => data.risks.filter((r) => r.level === l).length;
  return (
    <div className="stack">
      <CrudTable
        title="Legal register & evaluation of compliance"
        collection="legal"
        fields={legalFields}
        intro={<>BGS-F28. {ok} of {data.legal.length} requirements compliant. Review yearly, or when requirements or activities change (BGS-P12); the current register says next review by 31 Dec 2026.</>}
        newItem={() => ({ no: Math.max(0, ...data.legal.map((l) => l.no || 0)) + 1, law: '', ref: '', title: '', requirement: '', status: 'Not assessed', evaluatedOn: today(), remarks: '' })}
        filterKeys={['law', 'status']}
        sort={(a, b) => a.no - b.no}
        rowFlag={(l) => (l.status === 'Not compliant' ? 'overdue' : l.status === 'In progress' || l.status === 'Not assessed' ? 'soon' : undefined)}
      />
      <CrudTable
        title="Risk & opportunity register"
        collection="risks"
        fields={riskFields}
        intro={<>BGS-F11 (ISO 9001 6.1, ISO 45001 6.1.1): {lvl('High')} high, {lvl('Medium')} medium, {lvl('Low')} low. Re-assess yearly or when the context changes (BGS-P05 4.1.6).</>}
        newItem={() => ({ no: Math.max(0, ...data.risks.map((r) => r.no || 0)) + 1, issue: '', riskOpportunity: '', type: 'Risk', rootCause: '', currentAction: '', requiredAction: '', level: 'Medium', owner: '', status: 'Action planned', reviewDate: today() })}
        filterKeys={['level', 'status', 'owner']}
        sort={(a, b) => a.no - b.no}
        rowFlag={(r) => (r.level === 'High' && r.status === 'Action planned' ? 'soon' : undefined)}
      />
    </div>
  );
}

/* ---------------- Actions ---------------- */

const actionFields: Field<ActionRec>[] = [
  { key: 'title', label: 'Action', required: true },
  { key: 'detail', label: 'Detail', type: 'textarea' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'], badge: true },
  { key: 'owner', label: 'Owner', hint: PEOPLE_HINT },
  { key: 'dueDate', label: 'Due', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Open', 'In progress', 'Done'], badge: true },
  { key: 'standard', label: 'Standard', type: 'select', options: STD_OPTS, inTable: false },
  { key: 'link', label: 'Linked record', hint: 'e.g. NCR-2026-05' },
  { key: 'source', label: 'Raised from', inTable: false },
];

const PRIO: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export function ActionsView() {
  return (
    <CrudTable
      title="Action items"
      collection="actions"
      fields={actionFields}
      intro="Follow-ups that are not formal NCRs: gaps from audits and document reviews, management review outputs, meeting decisions."
      newItem={() => ({ title: '', detail: '', owner: '', dueDate: '', priority: 'Medium', status: 'Open', standard: 'Integrated', link: '', source: 'Entered on the dashboard' })}
      filterKeys={['status', 'priority', 'owner']}
      sort={(a, b) => Number(a.status === 'Done') - Number(b.status === 'Done') || PRIO[a.priority] - PRIO[b.priority] || (a.dueDate || '9').localeCompare(b.dueDate || '9')}
      rowFlag={(a) => (a.status !== 'Done' && daysUntil(a.dueDate) < 0 ? 'overdue' : a.status !== 'Done' && daysUntil(a.dueDate) <= 7 ? 'soon' : undefined)}
    />
  );
}
