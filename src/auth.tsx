import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface Member {
  email: string;
  name: string | null;
  role: 'admin' | 'member';
}

interface AuthState {
  email: string;
  member: Member | null;
  isAdmin: boolean;
  signOut: () => void;
}

const Ctx = createContext<AuthState>({ email: '', member: null, isAdmin: true, signOut: () => {} });
export const useAuth = () => useContext(Ctx);

/** Sign-in gate. Without Supabase configured it lets everyone through (browser-only mode). */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const [member, setMember] = useState<Member | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setMember(undefined);
      return;
    }
    const email = (session.user.email || '').toLowerCase();
    supabase
      .from('members')
      .select('email,name,role')
      .eq('email', email)
      .maybeSingle()
      .then(({ data }) => setMember((data as Member) ?? null));
  }, [session]);

  if (!supabase) {
    return <Ctx.Provider value={{ email: '', member: null, isAdmin: true, signOut: () => {} }}>{children}</Ctx.Provider>;
  }

  const signOut = () => supabase!.auth.signOut();

  if (session === undefined || (session && member === undefined)) {
    return <div className="auth-screen"><div className="auth-card"><p className="muted">Loading…</p></div></div>;
  }
  if (!session) return <SignIn />;
  if (!member) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <Logo />
          <h2>Not on the team list yet</h2>
          <p>You're signed in as <strong>{session.user.email}</strong>, but this address hasn't been added to the ISO dashboard team.</p>
          <p className="muted small">Ask an admin to add you under Settings → Team members, then sign in again.</p>
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <Ctx.Provider value={{ email: session.user.email || '', member, isAdmin: member.role === 'admin', signOut }}>
      {children}
    </Ctx.Provider>
  );
}

function Logo() {
  return (
    <picture>
      <source srcSet="/logo-on-dark.png" media="(prefers-color-scheme: dark)" />
      <img className="auth-logo" src="/logo-on-light.png" alt="Black Gold Security" />
    </picture>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setMsg(error.message);
    else setStep('code');
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const { error } = await supabase!.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setMsg('That code did not work. Check the latest email, or send a new one.');
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <Logo />
        <h2>ISO 9001 · ISO 45001 compliance</h2>
        {step === 'email' ? (
          <form onSubmit={send} className="auth-form">
            <label htmlFor="auth-email">Work email</label>
            <input id="auth-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@blackgoldsecurity.my" />
            <button className="btn primary" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
          </form>
        ) : (
          <form onSubmit={verify} className="auth-form">
            <p>We sent a sign-in email to <strong>{email}</strong>. Click the link in it, or type the code from the email here.</p>
            <label htmlFor="auth-code">Code</label>
            <input id="auth-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn primary" disabled={busy || !code.trim()}>{busy ? 'Checking…' : 'Sign in'}</button>
            <button type="button" className="btn ghost" onClick={() => setStep('email')}>Use a different email</button>
          </form>
        )}
        {msg && <p className="bad-text small">{msg}</p>}
      </div>
    </div>
  );
}
