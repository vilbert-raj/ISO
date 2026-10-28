import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { blankClauses } from './clauses';
import { emptyData, sampleData } from './seed';
import { supabase, TEAM_MODE } from './supabase';
import type { AppData, CollectionKey, Settings } from './types';

const KEY = 'iso-dashboard-data-v1';
const TABLE = 'records';

export const COLLECTIONS: CollectionKey[] = [
  'clauses', 'audits', 'findings', 'incidents', 'hazards', 'documents', 'training', 'objectives',
  'activities', 'legal', 'risks', 'actions',
];

/* ------------------------------------------------------------------ */
/* Browser-only mode (no Supabase env vars): localStorage + demo data  */
/* ------------------------------------------------------------------ */

function loadLocal(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalise(JSON.parse(raw));
  } catch {
    /* storage unavailable or corrupt – fall through */
  }
  return sampleData();
}

function saveLocal(data: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Fill in anything missing from an imported/older file. */
export function normalise(input: Partial<AppData>): AppData {
  const base = emptyData();
  const out: AppData = {
    ...base,
    settings: { ...base.settings, ...(input.settings || {}) },
    clauses: Array.isArray(input.clauses) && input.clauses.length ? input.clauses : blankClauses(),
  };
  for (const k of COLLECTIONS) {
    if (k === 'clauses') continue;
    const v = input[k];
    (out as unknown as Record<string, unknown>)[k] = Array.isArray(v) ? v : [];
  }
  const have = new Set(out.clauses.map((c) => c.id));
  for (const c of blankClauses()) if (!have.has(c.id)) out.clauses.push(c);
  return out;
}

/* ------------------------------------------------------------------ */
/* Team mode: one Supabase table `records(collection, id, data jsonb)` */
/* ------------------------------------------------------------------ */

interface Row {
  collection: string;
  id: string;
  data: Record<string, unknown>;
}

async function fetchAll(): Promise<AppData> {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase!.from(TABLE).select('collection,id,data').range(from, from + 999);
    if (error) throw error;
    rows.push(...(data as Row[]));
    if (!data || data.length < 1000) break;
  }
  const out = emptyData();
  out.clauses = [];
  for (const r of rows) applyRow(out, r);
  return normalise(out);
}

function applyRow(d: AppData, r: Row) {
  if (r.collection === 'settings') {
    d.settings = { ...d.settings, ...(r.data as Partial<Settings>) };
    return;
  }
  const list = (d as unknown as Record<string, { id: string }[]>)[r.collection];
  if (!Array.isArray(list)) return;
  const item = { ...r.data, id: r.id };
  const i = list.findIndex((x) => x.id === r.id);
  if (i >= 0) list[i] = item;
  else list.push(item);
}

function stripId(item: object): Record<string, unknown> {
  const { id: _id, ...rest } = item as Record<string, unknown>;
  void _id;
  return rest;
}

/* ------------------------------------------------------------------ */

export type SyncState = 'local' | 'loading' | 'live' | 'saving' | 'error';

interface Store {
  data: AppData;
  sync: SyncState;
  error: string;
  teamMode: boolean;
  replaceAll: (d: AppData) => Promise<void>;
  upsert: <K extends CollectionKey>(key: K, item: AppData[K][number]) => void;
  remove: (key: CollectionKey, id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  reload: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => (TEAM_MODE ? normalise(emptyData()) : loadLocal()));
  const [sync, setSync] = useState<SyncState>(TEAM_MODE ? 'loading' : 'local');
  const [error, setError] = useState('');
  const pending = useRef(0);
  const settingsTimer = useRef<number>(0);

  // browser-only persistence
  useEffect(() => {
    if (!TEAM_MODE) saveLocal(data);
  }, [data]);

  const reload = useCallback(() => {
    if (!TEAM_MODE) return;
    setSync('loading');
    fetchAll()
      .then((d) => {
        setData(d);
        setSync('live');
        setError('');
      })
      .catch((e) => {
        setSync('error');
        setError(e?.message || 'Could not load the shared data.');
      });
  }, []);

  // initial load + realtime updates from teammates
  useEffect(() => {
    if (!TEAM_MODE) return;
    reload();
    const ch = supabase!
      .channel('records-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => {
        setData((prev) => {
          const next = { ...prev } as AppData;
          if (p.eventType === 'DELETE') {
            const o = p.old as Partial<Row>;
            if (!o.collection || o.collection === 'settings') return prev;
            const k = o.collection as CollectionKey;
            (next as unknown as Record<string, unknown>)[k] = (prev[k] as { id: string }[]).filter((x) => x.id !== o.id);
            return next;
          }
          const r = p.new as Row;
          if (r.collection === 'settings') {
            next.settings = { ...prev.settings, ...(r.data as Partial<Settings>) };
            return next;
          }
          const k = r.collection as CollectionKey;
          if (!Array.isArray(prev[k])) return prev;
          const list = [...(prev[k] as { id: string }[])];
          const item = { ...r.data, id: r.id };
          const i = list.findIndex((x) => x.id === r.id);
          if (i >= 0) list[i] = item;
          else list.push(item);
          (next as unknown as Record<string, unknown>)[k] = list;
          return next;
        });
      })
      .subscribe();
    return () => {
      supabase!.removeChannel(ch);
    };
  }, [reload]);

  const track = useCallback(async (p: PromiseLike<{ error: { message: string } | null }>) => {
    pending.current++;
    setSync('saving');
    const { error } = await p;
    pending.current--;
    if (error) {
      setError(error.message.includes('row-level security') ? 'You are not allowed to change this. Ask an admin to add you to the team.' : error.message);
      setSync('error');
      reload();
    } else if (!pending.current) {
      setSync('live');
      setError('');
    }
  }, [reload]);

  const upsert = useCallback(<K extends CollectionKey>(key: K, item: AppData[K][number]) => {
    setData((d) => {
      const list = d[key] as { id: string }[];
      const id = (item as { id: string }).id;
      const exists = list.some((x) => x.id === id);
      const next = exists ? list.map((x) => (x.id === id ? item : x)) : [...list, item];
      return { ...d, [key]: next };
    });
    if (TEAM_MODE) {
      track(supabase!.from(TABLE).upsert({ collection: key, id: (item as { id: string }).id, data: stripId(item as object) }));
    }
  }, [track]);

  const remove = useCallback((key: CollectionKey, id: string) => {
    setData((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) }));
    if (TEAM_MODE) track(supabase!.from(TABLE).delete().eq('collection', key).eq('id', id));
  }, [track]);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setData((d) => {
      const settings = { ...d.settings, ...s };
      if (TEAM_MODE) {
        window.clearTimeout(settingsTimer.current);
        settingsTimer.current = window.setTimeout(() => {
          track(supabase!.from(TABLE).upsert({ collection: 'settings', id: 'main', data: settings }));
        }, 700);
      }
      return { ...d, settings };
    });
  }, [track]);

  /** Replace everything (backup import). In team mode this rewrites the shared database. */
  const replaceAll = useCallback(async (d: AppData) => {
    if (!TEAM_MODE) {
      setData(d);
      return;
    }
    setSync('saving');
    const rows: Row[] = [{ collection: 'settings', id: 'main', data: d.settings as unknown as Record<string, unknown> }];
    for (const k of COLLECTIONS) for (const item of d[k] as { id: string }[]) rows.push({ collection: k, id: item.id, data: stripId(item) });
    try {
      const keep = new Set(rows.map((r) => r.collection + '/' + r.id));
      const current = await fetchAll();
      const stale: Row[] = [];
      for (const k of COLLECTIONS) for (const item of current[k] as { id: string }[]) if (!keep.has(k + '/' + item.id)) stale.push({ collection: k, id: item.id, data: {} });
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase!.from(TABLE).upsert(rows.slice(i, i + 500));
        if (error) throw error;
      }
      for (const r of stale) {
        const { error } = await supabase!.from(TABLE).delete().eq('collection', r.collection).eq('id', r.id);
        if (error) throw error;
      }
      reload();
    } catch (e) {
      setError((e as Error).message || 'Import failed.');
      setSync('error');
    }
  }, [reload]);

  const value = useMemo(
    () => ({ data, sync, error, teamMode: TEAM_MODE, replaceAll, upsert, remove, updateSettings, reload }),
    [data, sync, error, replaceAll, upsert, remove, updateSettings, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
