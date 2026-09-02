export interface SessionUser {
  id: string;
  username: string;
  name: string;
  nip?: string;
  division?: string;
  phone?: string;
  role: 'Staff' | 'Admin' | 'Superadmin';
}

const SESSION_KEY = 'pelindo_session';

export function saveSession(user: SessionUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}
