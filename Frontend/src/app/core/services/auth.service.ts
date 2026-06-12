import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthTokens, ChangePasswordPayload, JwtPayload, LoginPayload,
  MessageResponse, RegisterPayload, User, UserRole,
} from '../models/models';

const ACCESS_KEY = 'jo_access';
const REFRESH_KEY = 'jo_refresh';

/**
 * Service d'authentification JWT.
 * - Stocke les tokens dans le localStorage.
 * - Décode le token pour connaître l'utilisateur courant (signal réactif).
 * - Expose login / register / logout / refresh / changePassword.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Utilisateur courant (issu du JWT), null si déconnecté. */
  readonly currentUser = signal<JwtPayload | null>(this.decode(this.accessToken));

  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly role = computed<UserRole | null>(() => this.currentUser()?.role ?? null);
  readonly isCandidate = computed(() => this.role() === 'candidate');
  readonly isRecruiter = computed(() => this.role() === 'recruiter');
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly fullName = computed(() => this.currentUser()?.full_name?.trim() || this.currentUser()?.email || '');

  // ─────────── Tokens ───────────
  get accessToken(): string | null { return localStorage.getItem(ACCESS_KEY); }
  get refreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_KEY, tokens.access);
    localStorage.setItem(REFRESH_KEY, tokens.refresh);
    this.currentUser.set(this.decode(tokens.access));
  }

  // ─────────── Auth ───────────
  login(payload: LoginPayload): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.api}/login/`, payload).pipe(
      tap((tokens) => this.storeTokens(tokens)),
    );
  }

  register(payload: RegisterPayload): Observable<{ message: string; user: User }> {
    return this.http.post<{ message: string; user: User }>(`${this.api}/register/`, payload);
  }

  refresh(): Observable<{ access: string }> {
    return this.http.post<{ access: string }>(`${this.api}/token/refresh/`, {
      refresh: this.refreshToken,
    }).pipe(
      tap(({ access }) => {
        localStorage.setItem(ACCESS_KEY, access);
        this.currentUser.set(this.decode(access));
      }),
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.api}/change-password/`, payload);
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.currentUser.set(null);
  }

  /** Tableau de bord par défaut selon le rôle. */
  homeRoute(): string {
    switch (this.role()) {
      case 'recruiter': return '/recruteur/dashboard';
      case 'candidate': return '/candidat/dashboard';
      case 'admin': return '/offres';
      default: return '/';
    }
  }

  // ─────────── Décodage JWT ───────────
  private decode(token: string | null): JwtPayload | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
      if (payload.exp && payload.exp * 1000 < Date.now()) return null; // expiré
      return payload;
    } catch {
      return null;
    }
  }
}
