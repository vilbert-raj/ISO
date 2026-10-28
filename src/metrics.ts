import { section } from './clauses';
import type { AppData, ClauseRecord, Standard } from './types';
import { activityDue, activityStatus, CLOSED_FINDING, daysUntil, isLTI, isRecordable, objectiveOnTrack, riskLevel, riskScore, today } from './util';

export function clauseCompliance(clauses: ClauseRecord[], standard: Standard) {
  const list = clauses.filter((c) => c.standard === standard && c.status !== 'Not applicable');
  const done = list.filter((c) => c.status === 'Implemented' || c.status === 'Verified').length;
  const verified = list.filter((c) => c.status === 'Verified').length;
  const inProgress = list.filter((c) => c.status === 'In progress').length;
  const notStarted = list.filter((c) => c.status === 'Not started').length;
  return { total: list.length, done, verified, inProgress, notStarted, pct: list.length ? done / list.length : 0 };
}

export function clauseBySection(clauses: ClauseRecord[], standard: Standard) {
  const out: Record<string, Record<string, number>> = {};
  for (const c of clauses.filter((x) => x.standard === standard)) {
    const s = section(c.clause);
    out[s] ??= {};
    out[s][c.status] = (out[s][c.status] ?? 0) + 1;
  }
  return out;
}

export interface ActionItem {
  kind: string;
  label: string;
  date: string;
  days: number;
  page: string;
}

export function computeMetrics(data: AppData) {
  const year = today().slice(0, 4);
  const openFindings = data.findings.filter((f) => f.status !== CLOSED_FINDING);
  const overdueFindings = openFindings.filter((f) => daysUntil(f.due) < 0);
  const majorOpen = openFindings.filter((f) => f.grade === 'Major NC');

  const upcomingAudits = data.audits
    .filter((a) => a.status === 'Planned' || a.status === 'In progress')
    .filter((a) => daysUntil(a.plannedDate) >= -1)
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));

  const ytd = data.incidents.filter((i) => i.date.startsWith(year));
  const ltis = ytd.filter((i) => isLTI(i.type));
  const recordables = ytd.filter((i) => isRecordable(i.type));
  const nearMisses = ytd.filter((i) => i.type === 'Near miss');
  const hours = Number(data.settings.hoursWorkedYTD) || 0;
  const ltifr = hours ? (ltis.length * 1_000_000) / hours : null;
  const trir = hours ? (recordables.length * 200_000) / hours : null;
  const lastLTI = data.incidents.filter((i) => isLTI(i.type)).map((i) => i.date).sort().pop();
  const daysSinceLTI = lastLTI ? -daysUntil(lastLTI) : null;
  const openIncidents = data.incidents.filter((i) => i.status !== 'Closed');

  const highRisks = data.hazards.filter((h) => riskLevel(riskScore(h.residualLikelihood, h.residualSeverity)) === 'High');
  const hazardsReviewDue = data.hazards.filter((h) => daysUntil(h.reviewDate) < 0);

  const docsOverdue = data.documents.filter((d) => d.status !== 'Obsolete' && daysUntil(d.nextReview) < 0);
  const docsSoon = data.documents.filter((d) => d.status !== 'Obsolete' && daysUntil(d.nextReview) >= 0 && daysUntil(d.nextReview) <= 30);

  const trainingExpired = data.training.filter((t) => t.status === 'Expired' || (t.expiry && daysUntil(t.expiry) < 0));
  const trainingSoon = data.training.filter((t) => t.status !== 'Expired' && t.expiry && daysUntil(t.expiry) >= 0 && daysUntil(t.expiry) <= 30);

  const objOnTrack = data.objectives.filter(objectiveOnTrack);

  const lm = new Date(); lm.setDate(1); lm.setMonth(lm.getMonth() - 1);
  const lastMonth = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}`;
  const objUnreported = data.objectives.filter((o) => o.results && !o.results[lastMonth]);
  const activitiesOverdue = data.activities.filter((a) => activityStatus(a) === 'Overdue');
  const activitiesSoon = data.activities.filter((a) => activityStatus(a) === 'Due soon');
  const activitiesNoDate = data.activities.filter((a) => activityStatus(a) === 'Date needed');
  const openActions = data.actions.filter((a) => a.status !== 'Done');
  const actionsOverdue = openActions.filter((a) => daysUntil(a.dueDate) < 0);
  const legalOpen = data.legal.filter((l) => !['Compliant', 'No case so far'].includes(l.status));
  const legalPct = data.legal.length ? (data.legal.length - legalOpen.length) / data.legal.length : null;

  // Monthly incident counts for the last 12 months
  const months: { key: string; label: string; lti: number; other: number; near: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: m.toLocaleDateString(undefined, { month: 'short' }), lti: 0, other: 0, near: 0 });
  }
  for (const inc of data.incidents) {
    const m = months.find((x) => inc.date.startsWith(x.key));
    if (!m) continue;
    if (isLTI(inc.type)) m.lti++;
    else if (inc.type === 'Near miss') m.near++;
    else m.other++;
  }

  // Unified "needs attention" list
  const actions: ActionItem[] = [];
  for (const f of overdueFindings) actions.push({ kind: f.grade || 'Finding', label: `${f.ref} – ${f.description}`, date: f.due, days: daysUntil(f.due), page: 'audits' });
  if (docsOverdue.length) {
    const oldest = [...docsOverdue].sort((a, b) => a.nextReview.localeCompare(b.nextReview))[0];
    actions.push({ kind: 'Doc review', label: docsOverdue.length === 1 ? `${oldest.code} ${oldest.title}` : `${docsOverdue.length} documents past their 2-year review`, date: oldest.nextReview, days: Math.max(daysUntil(oldest.nextReview), -1), page: 'records' });
  }
  for (const t of trainingExpired) actions.push({ kind: 'Training expired', label: `${t.employee} – ${t.course}`, date: t.expiry, days: daysUntil(t.expiry), page: 'records' });
  const hzAreas = [...new Set(hazardsReviewDue.map((h) => h.activity.split(' – ')[0]))];
  if (hazardsReviewDue.length) {
    const oldest = [...hazardsReviewDue].sort((a, b) => a.reviewDate.localeCompare(b.reviewDate))[0];
    actions.push({ kind: 'Risk review', label: hazardsReviewDue.length === 1 ? `${oldest.activity}: ${oldest.hazard}` : `HIRARC review overdue: ${hzAreas.join(', ')} (${hazardsReviewDue.length} hazards)`, date: oldest.reviewDate, days: daysUntil(oldest.reviewDate), page: 'safety' });
  }
  for (const a of data.audits.filter((a) => a.status === 'Planned' && daysUntil(a.plannedDate) < 0)) actions.push({ kind: 'Audit overdue', label: a.title, date: a.plannedDate, days: daysUntil(a.plannedDate), page: 'audits' });
  for (const [label, date] of [['ISO 9001 certificate expiry', data.settings.cert9001Expiry], ['ISO 45001 certificate expiry', data.settings.cert45001Expiry]] as const) {
    if (date && daysUntil(date) <= 90) actions.push({ kind: 'Certificate', label, date, days: daysUntil(date), page: 'settings' });
  }
  for (const a of activitiesOverdue) { const due = activityDue(a); actions.push({ kind: 'Calendar', label: a.title, date: due, days: daysUntil(due), page: 'calendar' }); }
  for (const a of actionsOverdue) actions.push({ kind: 'Action', label: a.title, date: a.dueDate, days: daysUntil(a.dueDate), page: 'actions' });
  for (const a of activitiesSoon) { const due = activityDue(a); actions.push({ kind: 'Due soon', label: a.title, date: due, days: daysUntil(due), page: 'calendar' }); }
  actions.sort((a, b) => a.days - b.days);

  return {
    q: clauseCompliance(data.clauses, 'ISO 9001'),
    s: clauseCompliance(data.clauses, 'ISO 45001'),
    openFindings, overdueFindings, majorOpen, upcomingAudits,
    ytd, ltis, recordables, nearMisses, ltifr, trir, daysSinceLTI, openIncidents, hours,
    highRisks, hazardsReviewDue, docsOverdue, docsSoon, trainingExpired, trainingSoon, objOnTrack,
    months, actions,
    lastMonth, objUnreported, activitiesOverdue, activitiesSoon, activitiesNoDate, openActions, actionsOverdue, legalOpen, legalPct,
  };
}
