import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth';
import { Badge, Card } from '../components/ui';
import { emptyData, sampleData } from '../seed';
import { normalise, useStore } from '../store';
import { supabase } from '../supabase';
import { downloadFile, today } from '../util';

export function SettingsView() {
  const { data, updateSettings, replaceAll, teamMode } = useStore();
  const { isAdmin } = useAuth();
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState<'' | 'clear' | 'sample' | 'import'>('');
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof normalise> | null>(null);

  return (
    <div className="grid">
      <Card title="Organisation" className="span-2">
        <div className="form">
          <label><span>Company name</span><input value={s.company} onChange={(e) => updateSettings({ company: e.target.value })} /></label>
          <label><span>Certification body</span><input value={s.certBody} onChange={(e) => updateSettings({ certBody: e.target.value })} /></label>
          <label><span>ISO 9001 certificate expiry</span><input type="date" value={s.cert9001Expiry} onChange={(e) => updateSettings({ cert9001Expiry: e.target.value })} /></label>
          <label><span>ISO 45001 certificate expiry</span><input type="date" value={s.cert45001Expiry} onChange={(e) => updateSettings({ cert45001Expiry: e.target.value })} /></label>
          <label className="span2">
            <span>Hours worked year-to-date</span>
            <input type="number" value={s.hoursWorkedYTD || ''} onChange={(e) => updateSettings({ hoursWorkedYTD: Number(e.target.value) || 0 })} />
            <small>Used for LTIFR (per 1,000,000 hours) and TRIR (per 200,000 hours).</small>
          </label>
        </div>
      </Card>

      <Card title="Data">
        <p className="muted small">
          {teamMode
            ? 'Data is stored in the shared team database and updates live for everyone. Export a backup now and then for your records.'
            : 'Data is saved in this browser only. Export a backup regularly, or move it to another computer with Import.'}
        </p>
        <div className="btn-col">
          <button className="btn primary" onClick={() => downloadFile(`iso-dashboard-backup-${today()}.json`, JSON.stringify(data, null, 2))}>Export backup (JSON)</button>
          {(!teamMode || isAdmin) && <button className="btn" onClick={() => fileRef.current?.click()}>Import backup…</button>}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setPendingImport(normalise(JSON.parse(await f.text())));
                setConfirm('import');
              } catch {
                setMsg('That file could not be read as a dashboard backup.');
              }
              e.target.value = '';
            }}
          />
          {confirm ? (
            <div className="confirm-box">
              <span>
                {confirm === 'import'
                  ? `Replace ${teamMode ? 'the team’s shared data' : 'all data'} with this backup? Records not in the file will be removed.`
                  : confirm === 'clear' ? 'Remove all records and start blank?' : 'Replace everything with demo data?'}{' '}
                Export a backup first if needed.
              </span>
              <div>
                <button className="btn danger" onClick={async () => {
                  const next = confirm === 'import' ? pendingImport! : confirm === 'clear' ? emptyData() : sampleData();
                  setConfirm('');
                  await replaceAll(next);
                  setMsg(confirm === 'import' ? 'Backup imported.' : confirm === 'clear' ? 'Started blank.' : 'Demo data loaded.');
                }}>Yes, continue</button>{' '}
                <button className="btn ghost" onClick={() => setConfirm('')}>Cancel</button>
              </div>
            </div>
          ) : !teamMode && (
            <>
              <button className="btn ghost danger-text" onClick={() => setConfirm('clear')}>Start blank (remove demo data)</button>
              <button className="btn ghost" onClick={() => setConfirm('sample')}>Reload demo data</button>
            </>
          )}
          {msg && <p className="good-text small">{msg}</p>}
        </div>
      </Card>

      {teamMode && <TeamCard />}
    </div>
  );
}

interface Member { email: string; name: string | null; role: 'admin' | 'member' }

function TeamCard() {
  const { isAdmin, email: me } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    supabase!.from('members').select('email,name,role').order('email').then(({ data }) => setMembers((data as Member[]) ?? []));
  }, []);
  useEffect(load, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em) return;
    const { error } = await supabase!.from('members').upsert({ email: em, name: name.trim() || null, role });
    if (error) setMsg(error.message);
    else { setEmail(''); setName(''); setRole('member'); setMsg(`${em} can now sign in.`); load(); }
  };

  const removeMember = async (em: string) => {
    const { error } = await supabase!.from('members').delete().eq('email', em);
    if (error) setMsg(error.message);
    else load();
  };

  return (
    <Card title={<>Team members <span className="count">{members.length}</span></>} className="span-2">
      <p className="muted small">Only these email addresses can sign in and see the data. Members can view and edit records; admins can also manage this list and import backups.</p>
      <ul className="team-list">
        {members.map((m) => (
          <li key={m.email}>
            <span>{m.name ? <strong>{m.name} </strong> : null}{m.email}</span>
            <span>
              <Badge tone={m.role === 'admin' ? 'info' : 'muted'}>{m.role}</Badge>{' '}
              {isAdmin && m.email !== me.toLowerCase() && <button className="btn ghost small danger-text" onClick={() => removeMember(m.email)}>Remove</button>}
            </span>
          </li>
        ))}
      </ul>
      {isAdmin && (
        <form className="inline-form" onSubmit={add}>
          <input type="email" required placeholder="email@blackgoldsecurity.my" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
          <select value={role} onChange={(e) => setRole(e.target.value as 'member' | 'admin')} aria-label="Role"><option value="member">Member</option><option value="admin">Admin</option></select>
          <button className="btn primary">Add</button>
        </form>
      )}
      {msg && <p className="small muted">{msg}</p>}
    </Card>
  );
}
