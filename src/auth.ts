import { create } from 'zustand';
import { api, ApiError, Health, User } from './api';
import { mergeProgress, pick, Progress, toWire } from './progressMerge';
import { useStore } from './store';

type Status = 'unknown' | 'anon' | 'authed';
interface AuthState {
  status: Status; user: User | null; health: Health | null; backendDown: boolean;
  error: string | null; busy: boolean;
  sync: { state: 'idle' | 'syncing' | 'ok' | 'error'; at: number | null; error: string | null };
  init(): Promise<void>;
  login(email: string, password: string): Promise<boolean>;
  register(email: string, password: string, name: string): Promise<boolean>;
  logout(): Promise<void>;
  syncNow(): Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'unknown', user: null, health: null, backendDown: false, error: null, busy: false, sync: { state: 'idle', at: null, error: null },

  async init() {
    try {
      const health = await api.health();
      set({ health, backendDown: false });
    } catch { set({ backendDown: true, status: 'anon' }); return; }
    try {
      const user = await api.me();
      set({ user, status: 'authed' });
      void get().syncNow();
    } catch (e) {
      set({ status: 'anon', user: null });
      if (!(e instanceof ApiError && e.status === 401)) set({ error: e instanceof Error ? e.message : 'Unexpected error' });
    }
  },

  async login(email, password) {
    set({ busy: true, error: null });
    try { const user = await api.login(email, password); set({ user, status: 'authed', busy: false }); void get().syncNow(); return true; }
    catch (e) { set({ busy: false, error: e instanceof Error ? e.message : 'Sign-in failed' }); return false; }
  },

  async register(email, password, name) {
    set({ busy: true, error: null });
    try { const user = await api.register(email, password, name); set({ user, status: 'authed', busy: false }); void get().syncNow(); return true; }
    catch (e) { set({ busy: false, error: e instanceof Error ? e.message : 'Sign-up failed' }); return false; }
  },

  async logout() {
    await get().syncNow();                       // best effort: make sure the account has the latest progress
    try { await api.logout(); } catch { /* the session is dropped locally either way */ }
    useStore.getState().reset();                 // progress belongs to the account: never carry it into the next person's sign-in
    lastPushed = '';
    set({ user: null, status: 'anon', sync: { state: 'idle', at: null, error: null } });
  },

  async syncNow() {
    if (get().status !== 'authed') return;
    set(s => ({ sync: { ...s.sync, state: 'syncing', error: null } }));
    try {
      const remote = await api.getProgress();
      const merged = mergeProgress(pick(useStore.getState()), remote.data);
      useStore.setState(merged as Partial<Progress>);
      const saved = await api.putProgress(toWire(merged));
      lastPushed = fingerprint(pick(useStore.getState()));
      void saved;
      set({ sync: { state: 'ok', at: Date.now(), error: null } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) set({ status: 'anon', user: null, error: 'Your session expired. Please sign in again.' });
      set({ sync: { state: 'error', at: null, error: e instanceof Error ? e.message : 'Sync failed' } });
    }
  },
}));

// ---- automatic background sync: debounce changes (ignoring the learning-time counter), plus a slow flush for it ----
let lastPushed = '';
let timer: ReturnType<typeof setTimeout> | undefined;
const fingerprint = (p: Progress) => JSON.stringify({ ...p, seconds: 0 });

export function startAutoSync(): () => void {
  const push = async () => {
    const auth = useAuth.getState();
    if (auth.status !== 'authed') return;
    const mine = pick(useStore.getState());
    try {
      const res = await api.putProgress(toWire(mine));
      useStore.setState(mergeProgress(pick(useStore.getState()), res.data) as Partial<Progress>);
      lastPushed = fingerprint(pick(useStore.getState()));
      useAuth.setState({ sync: { state: 'ok', at: Date.now(), error: null } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) useAuth.setState({ status: 'anon', user: null, error: 'Your session expired. Please sign in again.' });
      useAuth.setState({ sync: { state: 'error', at: null, error: e instanceof Error ? e.message : 'Sync failed' } });
    }
  };
  const unsub = useStore.subscribe(state => {
    if (useAuth.getState().status !== 'authed') return;
    if (fingerprint(pick(state)) === lastPushed) return;
    clearTimeout(timer);
    timer = setTimeout(push, 2500);
  });
  const flush = setInterval(() => { if (useAuth.getState().status === 'authed' && document.visibilityState === 'visible') void push(); }, 60000);
  return () => { unsub(); clearInterval(flush); clearTimeout(timer); };
}
