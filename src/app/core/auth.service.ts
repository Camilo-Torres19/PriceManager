import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type Role = 'admin' | 'preventista';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  zone: string | null;
}

interface LoginResponse {
  token: string;
  user: User;
}

const TOKEN_KEY = 'pm_token';
const USER_KEY = 'pm_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly token = signal<string | null>(null);
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => !!this.token() && !!this.user());
  readonly role = computed(() => this.user()?.role ?? null);

  constructor() {
    this.restoreSession();
  }

  /** POST /api/auth/login y guarda la sesión */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.saveSession(res.token, res.user)));
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    this.storageRemove(TOKEN_KEY);
    this.storageRemove(USER_KEY);
    this.router.navigateByUrl('/login');
  }

  /** Ruta de inicio según el rol */
  homeFor(role: Role | null): string {
    return role === 'admin' ? '/admin' : '/preventista';
  }

  // ── Sesión guardada ─────────────────────────────────────────
  private saveSession(token: string, user: User): void {
    this.token.set(token);
    this.user.set(user);
    this.storageSet(TOKEN_KEY, token);
    this.storageSet(USER_KEY, JSON.stringify(user));
  }

  private restoreSession(): void {
    const token = this.storageGet(TOKEN_KEY);
    const rawUser = this.storageGet(USER_KEY);
    if (!token || !rawUser) return;

    if (this.isExpired(token)) {
      this.storageRemove(TOKEN_KEY);
      this.storageRemove(USER_KEY);
      return;
    }
    try {
      this.user.set(JSON.parse(rawUser) as User);
      this.token.set(token);
    } catch {
      this.storageRemove(TOKEN_KEY);
      this.storageRemove(USER_KEY);
    }
  }

  /** Lee el campo exp del JWT (solo para saber si ya venció) */
  private isExpired(token: string): boolean {
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const { exp } = JSON.parse(atob(payload)) as { exp?: number };
      return !exp || exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  private storageGet(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  private storageSet(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* sin almacenamiento */ }
  }
  private storageRemove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* sin almacenamiento */ }
  }
}
