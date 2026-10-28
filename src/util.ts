export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function today(): string {
  const t = new Date();
  const off = t.getTimezoneOffset();
  return new Date(t.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Days from today to date (negative = past). NaN for empty. */
export function daysUntil(date: string): number {
  if (!date) return NaN;
  const a = new Date(today() + 'T00:00:00');
  const b = new Date(date + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function fmtDate(date: string): string {
  if (!date) return '—';
  const dt = new Date(date + 'T00:00:00');
  if (isNaN(dt.getTime())) return date;
  return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function riskScore(l: number, s: number): number {
  return (Number(l) || 0) * (Number(s) || 0);
}

/** BGS-P13 HIRARC: 3×3 matrix – Low 1–2, Medium 3–4, High 6–9. */
export const RISK_SCALE = 3;
export function riskLevel(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 6) return 'High';
  if (score >= 3) return 'Medium';
  return 'Low';
}

export function addMonths(date: string, months: number): string {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(y, m - 1 + months, d);
  if (t.getDate() !== d) t.setDate(0);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** "YYYY-MM" for a date string, or the current month. */
export function monthKey(date = today()): string {
  return date.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function activityDue(a: { fixedDue: string; lastDone: string; frequencyMonths: number }): string {
  if (a.fixedDue) return a.fixedDue;
  if (!a.lastDone || !Number(a.frequencyMonths)) return '';
  return addMonths(a.lastDone, Number(a.frequencyMonths));
}

export type DueStatus = 'Overdue' | 'Due soon' | 'On track' | 'Date needed';
export function activityStatus(a: { fixedDue: string; lastDone: string; frequencyMonths: number }): DueStatus {
  const due = activityDue(a);
  if (!due) return 'Date needed';
  const n = daysUntil(due);
  if (n < 0) return 'Overdue';
  if (n <= 30) return 'Due soon';
  return 'On track';
}

export function frequencyLabel(n: number): string {
  n = Number(n) || 0;
  if (!n) return 'One-off';
  if (n === 1) return 'Monthly';
  if (n === 3) return 'Quarterly';
  if (n === 6) return 'Every 6 months';
  if (n === 12) return 'Yearly';
  if (n % 12 === 0) return `Every ${n / 12} years`;
  return `Every ${n} months`;
}

export const CLOSED_FINDING = 'Closed';
export const CLOSED_INCIDENT = 'Closed';

export function isLTI(type: string): boolean {
  return type === 'Lost time injury';
}

export function isRecordable(type: string): boolean {
  return ['Lost time injury', 'Medical treatment', 'Occupational disease', 'Fatality'].includes(type);
}

export function objectiveOnTrack(o: { target: number; actual: number; direction: string }): boolean {
  return o.direction === 'Lower is better' ? Number(o.actual) <= Number(o.target) : Number(o.actual) >= Number(o.target);
}

export function objectiveProgress(o: { target: number; actual: number; direction: string }): number {
  const t = Number(o.target), a = Number(o.actual);
  if (!t) return 0;
  const p = o.direction === 'Lower is better' ? (a <= t ? 1 : t / a) : a / t;
  return Math.max(0, Math.min(1, p));
}

export function downloadFile(name: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]).filter((k) => k !== 'id');
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}
