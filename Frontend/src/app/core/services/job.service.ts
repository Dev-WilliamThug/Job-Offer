import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JobDetail, JobListItem, JobWrite, MessageResponse } from '../models/models';

export interface JobFilters {
  search?: string;
  location?: string;
  contract_type?: string;
  experience?: string;
  work_mode?: string;
  company?: string;
}

/**
 * Service des offres d'emploi.
 * Couvre la lecture publique, le CRUD recruteur et le changement de statut.
 */
@Injectable({ providedIn: 'root' })
export class JobService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/jobs`;

  /** Liste publique des offres publiées, avec filtres optionnels. */
  list(filters: JobFilters = {}): Observable<JobListItem[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<JobListItem[]>(`${this.api}/`, { params });
  }

  detail(slug: string): Observable<JobDetail> {
    return this.http.get<JobDetail>(`${this.api}/${slug}/`);
  }

  /** Offres du recruteur connecté (tous statuts). */
  mine(): Observable<JobDetail[]> {
    return this.http.get<JobDetail[]>(`${this.api}/mine/`);
  }

  create(data: JobWrite): Observable<{ message: string; job: JobDetail }> {
    return this.http.post<{ message: string; job: JobDetail }>(`${this.api}/create/`, data);
  }

  update(slug: string, data: Partial<JobWrite>): Observable<JobDetail> {
    return this.http.put<JobDetail>(`${this.api}/${slug}/edit/`, data);
  }

  changeStatus(slug: string, status: string): Observable<{ message: string; status: string }> {
    return this.http.patch<{ message: string; status: string }>(`${this.api}/${slug}/status/`, { status });
  }

  remove(slug: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.api}/${slug}/delete/`);
  }

  byCompany(companySlug: string): Observable<JobListItem[]> {
    return this.http.get<JobListItem[]>(`${this.api}/company/${companySlug}/`);
  }
}
