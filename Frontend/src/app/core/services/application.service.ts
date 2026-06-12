import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CandidateApplication, RecruiterApplication, ApplicationStatus, MessageResponse,
} from '../models/models';

/**
 * Service des candidatures.
 * - Côté candidat : postuler, lister ses candidatures, se retirer.
 * - Côté recruteur : voir les candidats d'une offre, changer le statut.
 */
@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/applications`;

  // ─────────── Candidat ───────────
  /** Postuler : FormData pour permettre la pièce jointe (CV). */
  apply(data: FormData): Observable<{ message: string; application: CandidateApplication }> {
    return this.http.post<{ message: string; application: CandidateApplication }>(`${this.api}/apply/`, data);
  }

  mine(status?: ApplicationStatus): Observable<CandidateApplication[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<CandidateApplication[]>(`${this.api}/mine/`, { params });
  }

  withdraw(id: number): Observable<{ message: string; application: CandidateApplication }> {
    return this.http.patch<{ message: string; application: CandidateApplication }>(
      `${this.api}/mine/${id}/withdraw/`, {},
    );
  }

  // ─────────── Recruteur ───────────
  /** Candidatures reçues sur une offre (par id d'offre). */
  forJob(jobId: number, status?: ApplicationStatus): Observable<RecruiterApplication[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<RecruiterApplication[]>(`${this.api}/job/${jobId}/`, { params });
  }

  updateStatus(id: number, status: ApplicationStatus, note?: string)
    : Observable<{ message: string; application: RecruiterApplication }> {
    const body: { status: ApplicationStatus; recruiter_note?: string } = { status };
    if (note !== undefined) body.recruiter_note = note;
    return this.http.patch<{ message: string; application: RecruiterApplication }>(
      `${this.api}/${id}/status/`, body,
    );
  }
}
