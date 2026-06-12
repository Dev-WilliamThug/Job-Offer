import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Company, CompanyListItem, CompanyWrite, MessageResponse } from '../models/models';

/**
 * Service des entreprises.
 * Lecture publique + CRUD pour le recruteur propriétaire.
 */
@Injectable({ providedIn: 'root' })
export class CompanyService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/companies`;

  list(search?: string): Observable<CompanyListItem[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<CompanyListItem[]>(`${this.api}/`, { params });
  }

  detail(slug: string): Observable<Company> {
    return this.http.get<Company>(`${this.api}/${slug}/`);
  }

  /** Entreprises créées par le recruteur connecté. */
  mine(): Observable<CompanyListItem[]> {
    return this.http.get<CompanyListItem[]>(`${this.api}/mine/`);
  }

  create(data: CompanyWrite): Observable<{ message: string; company: Company }> {
    return this.http.post<{ message: string; company: Company }>(`${this.api}/create/`, data);
  }

  update(slug: string, data: Partial<CompanyWrite>): Observable<Company> {
    return this.http.put<Company>(`${this.api}/${slug}/edit/`, data);
  }

  remove(slug: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.api}/${slug}/delete/`);
  }
}
