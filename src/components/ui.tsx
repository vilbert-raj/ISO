import type { ReactNode } from 'react';

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'muted';

const TONES: Record<string, Tone> = {
  Verified: 'good', Implemented: 'good', Completed: 'good', Closed: 'good', Approved: 'good', 'On track': 'good', Low: 'good',
  'In progress': 'info', Planned: 'info', 'Under review': 'info', 'Under investigation': 'info', 'Awaiting verification': 'info', Scheduled: 'info', 'Actions assigned': 'info',
  'Not started': 'warn', Open: 'warn', 'Minor NC': 'warn', Medium: 'warn', Draft: 'warn', Observation: 'muted', OFI: 'muted',
  'Major NC': 'bad', Expired: 'bad', Overdue: 'bad', High: 'bad', 'Lost time injury': 'bad', 'Off track': 'bad', Fatality: 'bad',
  'Not applicable': 'muted', Cancelled: 'muted', Obsolete: 'muted',
};

export function Badge({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const t = tone ?? (typeof children === 'string' ? TONES[children] : undefined) ?? 'muted';
  return <span className={`badge badge-${t}`}>{children}</span>;
}

export function Card({ title, children, actions, className = '' }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className={`stat ${tone ? 'stat-' + tone : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Progress({ value, tone = 'good' }: { value: number; tone?: Tone }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill fill-${tone}`} style={{ width: pct + '%' }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
