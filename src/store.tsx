import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { blankClauses } from './clauses';
import { sampleData } from './seed';
import type { AppData, CollectionKey, Settings } from './types';

const KEY = 'iso-dashboard-data-v1';

/**
 * Data layer. Today this persists to the browser (localStorage) so the app
 * runs on Vercel with zero setup. To share data across a team, replace
 * load()/save() with calls to an API backed by a database – nothing else
 * in the UI needs to change.
 */
function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalise(JSON.parse(raw));
  } catch {
    /* storage unavailable or corrupt – fall through */
  }
  return sampleData();
}

function save(data: AppData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** Fill in anything missing from an imported/older file. */
export function normalise(input: Partial<AppData>): AppData {
  const base = sampleData();
  const out: AppData = {
    version: 1,
    settings: { ...base.settings, ...(input.settings || {}) },
    clauses: Array.isArray(input.clauses) && input.clauses.length ? input.clauses : blankClauses(),
    audits: input.audits ?? [],
    findings: input.findings ?? [],
    incidents: input.incidents ?? [],
    hazards: input.hazards ?? [],
    documents: input.documents ?? [],
    training: input.training ?? [],
    objectives: input.objectives ?? [],
  };
  // ensure every standard clause exists (e.g. if the clause list is extended later)
  const have = new Set(out.clauses.map((c) => c.id));
  for (const c of blankClauses()) if (!have.has(c.id)) out.clauses.push(c);
  return out;
}

interface Store {
  data: AppData;
  replaceAll: (d: AppData) => void;
  upsert: <K extends CollectionKey>(key: K, item: AppData[K][number]) => void;
  remove: (key: CollectionKey, id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => save(data), [data]);

  const upsert = useCallback(<K extends CollectionKey>(key: K, item: AppData[K][number]) => {
    setData((d) => {
      const list = d[key] as { id: string }[];
      const exists = list.some((x) => x.id === (item as { id: string }).id);
      const next = exists ? list.map((x) => (x.id === (item as { id: string }).id ? item : x)) : [...list, item];
      return { ...d, [key]: next };
    });
  }, []);

  const remove = useCallback((key: CollectionKey, id: string) => {
    setData((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) }));
  }, []);

  const updateSettings = useCallback((s: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...s } }));
  }, []);

  const value = useMemo(() => ({ data, replaceAll: setData, upsert, remove, updateSettings }), [data, upsert, remove, updateSettings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}
