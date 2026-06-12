import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { JobListItem } from '../core/models/models';
import { CONTRACT_LABELS, EXPERIENCE_LABELS, WORKMODE_LABELS } from '../core/models/labels';
import { mediaUrl, initials } from '../core/services/media.util';

/**
 * Carte d'offre réutilisable (listes, accueil, page entreprise).
 */
@Component({
  selector: 'app-job-card',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <a class="card card-hover job-card" [routerLink]="['/offres', job.slug]">
      <div class="job-top">
        <span class="avatar">
          @if (logo()) { <img [src]="logo()!" [alt]="job.company_name" style="width:100%;height:100%;border-radius:inherit;object-fit:cover"> }
          @else { {{ ini() }} }
        </span>
        <div class="job-head">
          <h3 class="job-title">{{ job.title }}</h3>
          <p class="job-company">{{ job.company_name }}</p>
        </div>
        @if (job.work_mode === 'remote') { <span class="badge badge-orange">Télétravail</span> }
      </div>

      <div class="job-meta">
        @if (job.location) {
          <span class="job-meta-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.8"/></svg>
            {{ job.location }}
          </span>
        }
        <span class="job-meta-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="1.8"/></svg>
          {{ workmode() }}
        </span>
      </div>

      <div class="job-tags">
        <span class="chip">{{ contract() }}</span>
        <span class="chip">{{ experience() }}</span>
      </div>

      <div class="job-foot">
        <span class="salary">
          @if (job.salary_display) { 💰 {{ job.salary_display }} }
          @else { <span class="text-muted text-sm">Salaire non communiqué</span> }
        </span>
        <span class="text-xs text-muted">{{ job.created_at | date:'dd/MM/yyyy' }}</span>
      </div>
    </a>
  `,
  styles: [`
    .job-card { display: flex; flex-direction: column; gap: 14px; padding: 22px; height: 100%; }
    .job-top { display: flex; align-items: flex-start; gap: 14px; }
    .job-head { flex: 1; min-width: 0; }
    .job-title { font-size: 1.08rem; margin: 0 0 3px; color: var(--gray-900); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .job-company { margin: 0; color: var(--text-muted); font-size: .88rem; font-weight: 600; }
    .job-meta { display: flex; flex-wrap: wrap; gap: 14px; }
    .job-meta-item { display: inline-flex; align-items: center; gap: 5px; color: var(--gray-600); font-size: .85rem; font-weight: 500; }
    .job-meta-item svg { color: var(--blue-500); }
    .job-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .job-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--gray-100); }
    .salary { font-weight: 700; color: var(--gray-800); font-size: .9rem; }
  `],
})
export class JobCardComponent {
  @Input({ required: true }) job!: JobListItem;

  logo = () => mediaUrl(this.job.company_logo);
  ini = () => initials(this.job.company_name);
  contract = () => CONTRACT_LABELS[this.job.contract_type] ?? this.job.contract_type;
  experience = () => EXPERIENCE_LABELS[this.job.experience_level] ?? this.job.experience_level;
  workmode = () => WORKMODE_LABELS[this.job.work_mode] ?? this.job.work_mode;
}
