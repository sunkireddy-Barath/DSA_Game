// Typed client for the CS Quest FastAPI backend. Same-origin by default (/api is proxied in dev and rewritten on Vercel);
// set VITE_API_BASE only when the API is served from another origin that allows credentialed CORS.
import type { Progress } from './progressMerge';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

function messageOf(status: number, body: any): { code: string; message: string } {
  const d = body?.detail;
  if (d && typeof d === 'object' && !Array.isArray(d) && d.message) return { code: String(d.code ?? 'error'), message: String(d.message) };
  if (typeof d === 'string' && body?.errors?.length) return { code: 'invalid', message: `${d}: ${body.errors.map((e: any) => `${e.field} ${e.message}`).join('; ')}` };
  if (typeof d === 'string') return { code: 'error', message: d };
  return { code: 'error', message: `Request failed (HTTP ${status})` };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'csquest' },
    });
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the server. Check your connection, or that the backend is running.');
  }
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok) { const m = messageOf(res.status, json); throw new ApiError(res.status, m.code, m.message); }
  return json as T;
}

export interface User { id: number; email: string; displayName: string }
export interface Health { status: string; version: string; sandbox: { available: boolean; detail: string }; tutor: { configured: boolean } }
export interface NativeRun {
  mode: 'function' | 'program'; std: string; compiled: boolean; compileOutput: string; stage: 'compile' | 'run' | 'done'; ok: boolean;
  stdout: string; stderr: string; exitCode: number | null; timeMs: number; timedOut: boolean; killed: boolean; result: any; args: any[] | null; error: string | null;
}
export interface NativeCase { ok: boolean; result: any; args: any[] | null; stdout: string; timeMs: number; error: string | null }
export interface NativeBatch { std: string; compiled: boolean; compileOutput: string; cases: NativeCase[] }
export interface TutorContext {
  question: string; level: 'hint' | 'explain' | 'solution';
  problem: { title: string; statement: string; constraints: string[]; hints: string[]; approaches: string[] };
  code: string; lastRun: string;
  trace: { step: number; total: number; line: number; lineText: string; event: string; variables: string; callStack: string } | null;
  history: { role: 'user' | 'assistant'; content: string }[];
}

export const api = {
  health: () => request<Health>('GET', '/api/health'),
  me: () => request<User>('GET', '/api/auth/me'),
  register: (email: string, password: string, displayName: string) => request<User>('POST', '/api/auth/register', { email, password, displayName }),
  login: (email: string, password: string) => request<User>('POST', '/api/auth/login', { email, password }),
  logout: () => request<{ ok: boolean }>('POST', '/api/auth/logout'),
  getProgress: () => request<{ data: Progress; updatedAt: number }>('GET', '/api/progress'),
  deleteProgress: () => request<{ ok: boolean }>('DELETE', '/api/progress'),
  putProgress: (data: Progress) => request<{ data: Progress; updatedAt: number }>('PUT', '/api/progress', { data }),
  runCpp: (b: { code: string; std: 'c++17' | 'c++20'; fn: string; args: any[]; signature?: string }) => request<NativeRun>('POST', '/api/run/cpp', { ...b, mode: 'function' }),
  runCppTests: (b: { code: string; std: 'c++17' | 'c++20'; fn: string; tests: any[][]; signature?: string }) => request<NativeBatch>('POST', '/api/run/cpp-tests', b),
  tutorAsk: (b: TutorContext) => request<{ answer: string; model: string }>('POST', '/api/tutor/ask', b),
};
