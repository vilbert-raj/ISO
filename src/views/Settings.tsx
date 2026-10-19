import { useRef, useState } from 'react';
import { Card } from '../components/ui';
import { emptyData, sampleData } from '../seed';
import { normalise, useStore } from '../store';
import { downloadFile, today } from '../util';

export function SettingsView() {
  const { data, updateSettings, replaceAll } = useStore();
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState<'' | 'clear' | 'sample'>('');

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
          Data is saved in this browser. Export a backup regularly, or move it to another computer with Import.
        </p>
        <div className="btn-col">
          <button className="btn primary" onClick={() => downloadFile(`iso-dashboard-backup-${today()}.json`, JSON.stringify(data, null, 2))}>Export backup (JSON)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import backup…</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                replaceAll(normalise(JSON.parse(await f.text())));
                setMsg('Backup imported.');
              } catch {
                setMsg('That file could not be read as a dashboard backup.');
              }
              e.target.value = '';
            }}
          />
          {confirm ? (
            <div className="confirm-box">
              <span>{confirm === 'clear' ? 'Remove all records and start blank?' : 'Replace everything with demo data?'} Export a backup first if needed.</span>
              <div>
                <button className="btn danger" onClick={() => { replaceAll(confirm === 'clear' ? emptyData() : sampleData()); setConfirm(''); setMsg(confirm === 'clear' ? 'Started blank.' : 'Demo data loaded.'); }}>Yes, continue</button>{' '}
                <button className="btn ghost" onClick={() => setConfirm('')}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <button className="btn ghost danger-text" onClick={() => setConfirm('clear')}>Start blank (remove demo data)</button>
              <button className="btn ghost" onClick={() => setConfirm('sample')}>Reload demo data</button>
            </>
          )}
          {msg && <p className="good-text small">{msg}</p>}
        </div>
      </Card>
    </div>
  );
}
