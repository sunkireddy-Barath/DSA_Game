import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth';

/** Sign in / create account, server status and sync state. Everything shown here comes from the real backend. */
export function Account() {
  const a = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  // after signing out the form should offer "Sign in" again, with no stale password left in it
  useEffect(() => { if (a.status === 'anon') { setMode('login'); setPassword(''); } }, [a.status]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'login') await a.login(email.trim(), password); else await a.register(email.trim(), password, name.trim());
  };

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h1>Account</h1>
      {a.backendDown && <div className="note err" role="alert">The backend is not reachable, so sign-in, cloud progress, the C++ sandbox and the AI tutor are unavailable. Everything else keeps working locally in your browser.</div>}

      {a.status === 'authed' && a.user ? (
        <div className="card">
          <h3>Signed in</h3>
          <p><b>{a.user.displayName}</b> · {a.user.email}</p>
          <p className="dim" data-testid="sync-status">
            {a.sync.state === 'syncing' && 'Syncing progress…'}
            {a.sync.state === 'ok' && `Progress saved to your account${a.sync.at ? ` at ${new Date(a.sync.at).toLocaleTimeString()}` : ''}.`}
            {a.sync.state === 'error' && `Sync failed: ${a.sync.error}`}
            {a.sync.state === 'idle' && 'Progress syncs automatically.'}
          </p>
          <div className="row" style={{ gap: 8 }}>
            <button onClick={() => void a.syncNow()} disabled={a.sync.state === 'syncing'}>Sync now</button>
            <button onClick={() => { if (confirm('Sign out? Progress is saved in your account and will be cleared from this browser.')) void a.logout(); }}>Sign out</button>
          </div>
        </div>
      ) : (
        <form className="card" onSubmit={submit} aria-label={mode === 'login' ? 'Sign in' : 'Create account'}>
          <div className="seg" role="tablist">
            <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Sign in</button>
            <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Create account</button>
          </div>
          {mode === 'register' && <label style={{ display: 'block', margin: '8px 0' }}>Display name (optional)<br /><input value={name} maxLength={40} onChange={e => setName(e.target.value)} autoComplete="nickname" style={{ width: '100%' }} /></label>}
          <label style={{ display: 'block', margin: '8px 0' }}>E-mail<br /><input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={{ width: '100%' }} /></label>
          <label style={{ display: 'block', margin: '8px 0' }}>Password{mode === 'register' && ' (8+ characters)'}<br /><input type="password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} style={{ width: '100%' }} /></label>
          {a.error && <div className="err" role="alert">{a.error}</div>}
          <button className="primary" type="submit" disabled={a.busy || a.backendDown}>{a.busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <p className="dim small">Your local progress is merged into your account when you sign in, so nothing is lost.</p>
        </form>
      )}

      <h3>Server capabilities</h3>
      <ul data-testid="capabilities">
        <li>Backend: {a.backendDown ? '❌ not reachable' : a.health ? `✅ online (v${a.health.version})` : 'checking…'}</li>
        <li>C++17/20 sandbox: {a.health ? (a.health.sandbox.available ? '✅ available' : `❌ unavailable (${a.health.sandbox.detail})`) : '—'}</li>
        <li>AI tutor: {a.health ? (a.health.tutor.configured ? '✅ configured' : '❌ not configured on this server') : '—'}</li>
      </ul>
    </div>
  );
}
