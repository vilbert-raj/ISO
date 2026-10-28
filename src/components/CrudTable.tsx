import { useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../store';
import type { AppData, CollectionKey } from '../types';
import { downloadFile, fmtDate, toCSV, uid } from '../util';
import { Badge, Card, Empty } from './ui';

export interface Field<T> {
  key: keyof T & string;
  label: string;
  type?: 'text' | 'textarea' | 'date' | 'select' | 'number';
  options?: string[];
  required?: boolean;
  /** show in table (default true for non-textarea) */
  inTable?: boolean;
  badge?: boolean;
  render?: (row: T) => ReactNode;
  hint?: string;
}

export type RowFlag = 'overdue' | 'soon' | undefined;

interface Props<K extends CollectionKey> {
  title: string;
  collection: K;
  fields: Field<AppData[K][number]>[];
  newItem: () => Omit<AppData[K][number], 'id'>;
  filterKeys?: (keyof AppData[K][number] & string)[];
  rowFlag?: (row: AppData[K][number]) => RowFlag;
  sort?: (a: AppData[K][number], b: AppData[K][number]) => number;
  canAdd?: boolean;
  canDelete?: boolean;
  intro?: ReactNode;
  /** custom table columns (defaults to fields shown in table) */
  columns?: Field<AppData[K][number]>[];
}

export function CrudTable<K extends CollectionKey>({ title, collection, fields, newItem, filterKeys = [], rowFlag, sort, canAdd = true, canDelete = true, intro, columns }: Props<K>) {
  type T = AppData[K][number];
  const { data, upsert, remove } = useStore();
  const rows = data[collection] as T[];
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const tableFields = columns ?? fields.filter((f) => f.inTable ?? f.type !== 'textarea');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      const rec = r as unknown as Record<string, unknown>;
      for (const [k, v] of Object.entries(filters)) if (v && String(rec[k]) !== v) return false;
      if (onlyFlagged && !rowFlag?.(r)) return false;
      if (!needle) return true;
      return fields.some((f) => String(rec[f.key] ?? '').toLowerCase().includes(needle));
    });
    if (sort) out = [...out].sort(sort);
    return out;
  }, [rows, q, filters, onlyFlagged, rowFlag, sort, fields]);

  const flaggedCount = rowFlag ? rows.filter((r) => rowFlag(r)).length : 0;

  const optionValues = (key: string) => {
    const f = fields.find((x) => x.key === key);
    if (f?.options) return f.options;
    return [...new Set(rows.map((r) => String((r as unknown as Record<string, unknown>)[key] ?? '')).filter(Boolean))].sort();
  };

  return (
    <Card
      title={<>{title} <span className="count">{rows.length}</span></>}
      actions={
        <>
          <button className="btn ghost" onClick={() => downloadFile(`${collection}.csv`, toCSV(visible as unknown as Record<string, unknown>[]), 'text/csv')}>Export CSV</button>
          {canAdd && <button className="btn primary" onClick={() => setEditing({ ...(newItem() as object), id: '' } as T)}>+ Add</button>}
        </>
      }
    >
      {intro && <p className="intro">{intro}</p>}
      <div className="toolbar">
        <input className="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        {filterKeys.map((k) => (
          <select key={k} value={filters[k] ?? ''} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })}>
            <option value="">All {fields.find((f) => f.key === k)?.label.toLowerCase()}</option>
            {optionValues(k).map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
        {rowFlag && flaggedCount > 0 && (
          <label className="check">
            <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} /> Needs attention ({flaggedCount})
          </label>
        )}
      </div>

      {visible.length === 0 ? (
        <Empty>{rows.length ? 'Nothing matches these filters.' : 'No records yet. Use “+ Add” to create the first one.'}</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{tableFields.map((f) => <th key={f.key}>{f.label}</th>)}</tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const rec = r as unknown as Record<string, unknown>;
                const flag = rowFlag?.(r);
                return (
                  <tr key={rec.id as string} className={flag ? 'row-' + flag : ''} onClick={() => setEditing(r)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEditing(r)}>
                    {tableFields.map((f) => (
                      <td key={f.key} className={f.type === 'number' ? 'num' : f.type === 'date' || f.key === 'ref' || f.key === 'code' || f.key === 'clause' || f.key === 'standard' ? 'nowrap' : ''}>
                        {f.render ? f.render(r) : f.badge ? (rec[f.key] ? <Badge>{String(rec[f.key])}</Badge> : '—') : f.type === 'date' ? fmtDate(String(rec[f.key] ?? '')) : String(rec[f.key] ?? '') || '—'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditModal
          title={(editing as { id: string }).id ? `Edit – ${title}` : `New – ${title}`}
          fields={fields}
          value={editing}
          canDelete={canDelete && !!(editing as { id: string }).id}
          onClose={() => setEditing(null)}
          onSave={(v) => {
            const item = { ...v, id: (v as { id: string }).id || uid() } as T;
            upsert(collection, item);
            setEditing(null);
          }}
          onDelete={() => {
            remove(collection, (editing as { id: string }).id);
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

function EditModal<T>({ title, fields, value, onClose, onSave, onDelete, canDelete }: {
  title: string; fields: Field<T>[]; value: T; onClose: () => void; onSave: (v: T) => void; onDelete: () => void; canDelete: boolean;
}) {
  const [draft, setDraft] = useState<T>(value);
  const [confirmDel, setConfirmDel] = useState(false);
  const rec = draft as unknown as Record<string, unknown>;
  const set = (k: string, v: unknown) => setDraft({ ...(draft as object), [k]: v } as T);
  const missing = fields.filter((f) => f.required && !String(rec[f.key] ?? '').trim());

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost icon" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!missing.length) onSave(draft);
          }}
        >
          {fields.map((f) => {
            const v = rec[f.key];
            const id = 'f-' + f.key;
            return (
              <label key={f.key} htmlFor={id} className={f.type === 'textarea' ? 'span2' : ''}>
                <span>{f.label}{f.required && ' *'}</span>
                {f.type === 'textarea' ? (
                  <textarea id={id} rows={3} value={String(v ?? '')} onChange={(e) => set(f.key, e.target.value)} />
                ) : f.type === 'select' ? (
                  <select id={id} value={String(v ?? '')} onChange={(e) => set(f.key, f.options?.every((o) => !isNaN(Number(o))) && typeof v === 'number' ? Number(e.target.value) : e.target.value)}>
                    <option value="">—</option>
                    {f.options?.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    id={id}
                    type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                    step="any"
                    value={String(v ?? '')}
                    onChange={(e) => set(f.key, f.type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)}
                  />
                )}
                {f.hint && <small>{f.hint}</small>}
              </label>
            );
          })}
          <footer className="modal-foot span2">
            {canDelete && (confirmDel ? (
              <span className="confirm">Delete this record? <button type="button" className="btn danger" onClick={onDelete}>Yes, delete</button> <button type="button" className="btn ghost" onClick={() => setConfirmDel(false)}>No</button></span>
            ) : (
              <button type="button" className="btn ghost danger-text" onClick={() => setConfirmDel(true)}>Delete</button>
            ))}
            <span className="spacer" />
            {missing.length > 0 && <small className="muted">Required: {missing.map((m) => m.label).join(', ')}</small>}
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={missing.length > 0}>Save</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
