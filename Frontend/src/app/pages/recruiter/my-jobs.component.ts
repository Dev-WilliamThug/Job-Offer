import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { JobService } from '../../core/services/job.service';
import { NotificationService } from '../../core/services/notification.service';
import { SpinnerComponent } from '../../shared/spinner.component';
import { JobDetail } from '../../core/models/models';
import { JOB_STATUS_BADGE, JOB_STATUS_LABELS } from '../../core/models/labels';

/**
 * « Mes offres » : tableau des offres du recruteur avec actions
 * (publier, clôturer, modifier, voir les candidats, supprimer).
 */
@Component({
  selector: 'app-my-jobs',
  standalone: true,
  imports: [RouterLink, DatePipe, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container">
        <div class="page-head flex items-center justify-between flex-wrap gap-2">
          <div><h1>Mes offres</h1><p class="sub">{{ jobs().length }} offre{{ jobs().length > 1 ? 's' : '' }} créée{{ jobs().length > 1 ? 's' : '' }}.</p></div>
          <a routerLink="/recruteur/offres/nouvelle" class="btn btn-accent">+ Créer une offre</a>
        </div>

        @if (loading()) {
          <app-spinner message="Chargement de vos offres…" />
        } @else if (jobs().length === 0) {
          <div class="empty-state card">
            <div class="icon">📋</div>
            <h3>Vous n'avez pas encore d'offre</h3>
            <p>Publiez votre première offre pour commencer à recevoir des candidatures.</p>
            <a routerLink="/recruteur/offres/nouvelle" class="btn btn-accent mt-2">Créer une offre</a>
          </div>
        } @else {
          <!-- Filtres rapides -->
          <div class="tabs mb-3">
            @for (t of tabs; track t.value) {
              <button class="tab" [class.active]="filter() === t.value" (click)="filter.set(t.value)">{{ t.label }}<span class="tab-count">{{ countFor(t.value) }}</span></button>
            }
          </div>

          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Intitulé</th><th>Statut</th><th>Candidatures</th><th>Date limite</th><th>Actions</th></tr></thead>
              <tbody>
                @for (j of visible(); track j.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/offres', j.slug]" class="fw-700" style="color:var(--gray-900)">{{ j.title }}</a>
                      @if (j.is_expired) { <span class="badge badge-red" style="margin-left:6px">Expirée</span> }
                    </td>
                    <td><span class="badge" [class]="badge(j.status)">{{ statusLabel(j.status) }}</span></td>
                    <td>
                      <a [routerLink]="['/recruteur/offres', j.slug, 'candidats']" class="chip">{{ j.application_count }} 👥</a>
                    </td>
                    <td class="text-muted">{{ j.deadline | date:'dd/MM/yyyy' }}</td>
                    <td>
                      <div class="actions">
                        <a [routerLink]="['/recruteur/offres', j.slug, 'candidats']" class="btn btn-outline btn-sm">Candidats</a>
                        <a [routerLink]="['/recruteur/offres', j.slug, 'modifier']" class="btn btn-ghost btn-sm">Modifier</a>
                        @if (j.status === 'draft') {
                          <button class="btn btn-success btn-sm" (click)="setStatus(j, 'published')" [disabled]="busy() === j.id">Publier</button>
                        } @else if (j.status === 'published') {
                          <button class="btn btn-ghost btn-sm" (click)="setStatus(j, 'closed')" [disabled]="busy() === j.id">Clôturer</button>
                        }
                        <button class="btn btn-danger btn-sm" (click)="remove(j)" [disabled]="busy() === j.id">🗑</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab { display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px; border-radius: 999px; border: 1.5px solid var(--gray-200); background: #fff; font-weight: 600; font-size: .86rem; color: var(--gray-600); cursor: pointer; font-family: inherit; }
    .tab.active { background: var(--blue-600); border-color: var(--blue-600); color: #fff; }
    .tab-count { background: rgba(0,0,0,.08); padding: 1px 8px; border-radius: 999px; font-size: .76rem; }
    .tab.active .tab-count { background: rgba(255,255,255,.25); }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  `],
})
export class MyJobsComponent implements OnInit {
  private jobService = inject(JobService);
  private notify = inject(NotificationService);

  loading = signal(true);
  busy = signal<number | null>(null);
  jobs = signal<JobDetail[]>([]);
  filter = signal<JobDetail['status'] | ''>('');

  tabs: { value: JobDetail['status'] | ''; label: string }[] = [
    { value: '', label: 'Toutes' },
    { value: 'published', label: 'Publiées' },
    { value: 'draft', label: 'Brouillons' },
    { value: 'closed', label: 'Clôturées' },
  ];

  visible = computed(() => {
    const f = this.filter();
    return f ? this.jobs().filter((j) => j.status === f) : this.jobs();
  });

  statusLabel = (s: JobDetail['status']) => JOB_STATUS_LABELS[s];
  badge = (s: JobDetail['status']) => JOB_STATUS_BADGE[s];
  countFor = (s: JobDetail['status'] | '') => s ? this.jobs().filter((j) => j.status === s).length : this.jobs().length;

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.jobService.mine().subscribe({
      next: (jobs) => { this.jobs.set(jobs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setStatus(j: JobDetail, status: JobDetail['status']): void {
    this.busy.set(j.id);
    this.jobService.changeStatus(j.slug, status).subscribe({
      next: () => {
        this.notify.success(status === 'published' ? 'Offre publiée.' : 'Offre clôturée.');
        this.jobs.update((list) => list.map((x) => x.id === j.id ? { ...x, status } : x));
        this.busy.set(null);
      },
      error: () => this.busy.set(null),
    });
  }

  remove(j: JobDetail): void {
    if (!confirm(`Supprimer définitivement l'offre « ${j.title} » ?`)) return;
    this.busy.set(j.id);
    this.jobService.remove(j.slug).subscribe({
      next: () => {
        this.notify.success('Offre supprimée.');
        this.jobs.update((list) => list.filter((x) => x.id !== j.id));
        this.busy.set(null);
      },
      error: () => this.busy.set(null),
    });
  }
}
