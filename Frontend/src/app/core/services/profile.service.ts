import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CandidateProfile, RecruiterProfile, User } from '../models/models';

/**
 * Service du compte connecté : infos utilisateur (/me/) et profils
 * candidat / recruteur. Tous les appels passent par HttpClient ici.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Infos complètes de l'utilisateur connecté (avec profil imbriqué). */
  getMe(): Observable<User> {
    return this.http.get<User>(`${this.api}/me/`);
  }

  updateMe(data: { first_name: string; last_name: string }): Observable<User> {
    return this.http.put<User>(`${this.api}/me/`, data);
  }

  // ─────────── Profil candidat ───────────
  getCandidateProfile(): Observable<CandidateProfile> {
    return this.http.get<CandidateProfile>(`${this.api}/profile/candidate/`);
  }

  /** FormData accepté pour permettre l'envoi du fichier CV. */
  updateCandidateProfile(data: FormData | Partial<CandidateProfile>): Observable<CandidateProfile> {
    return this.http.put<CandidateProfile>(`${this.api}/profile/candidate/`, data);
  }

  // ─────────── Profil recruteur ───────────
  getRecruiterProfile(): Observable<RecruiterProfile> {
    return this.http.get<RecruiterProfile>(`${this.api}/profile/recruiter/`);
  }

  updateRecruiterProfile(data: Partial<RecruiterProfile>): Observable<RecruiterProfile> {
    return this.http.put<RecruiterProfile>(`${this.api}/profile/recruiter/`, data);
  }
}
