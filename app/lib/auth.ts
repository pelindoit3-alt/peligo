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

function setCookie(name: string, value: string, days = 1) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
}

export function saveSession(user: SessionUser): void {
  if (typeof window === 'undefined') return;
  const value = JSON.stringify(user);
  localStorage.setItem(SESSION_KEY, value);
  setCookie(SESSION_KEY, value);
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
  deleteCookie(SESSION_KEY);
}
