import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../core/services/application.service';
import { NotificationService } from '../../core/services/notification.service';
import { SpinnerComponent } from '../../shared/spinner.component';
import { CandidateApplication, ApplicationStatus } from '../../core/models/models';
import { APP_STATUS_BADGE, APP_STATUS_LABELS } from '../../core/models/labels';

/**
 * « Mes candidatures » : liste filtrable par statut, avec possibilité de
 * retirer une candidature encore en attente.
 */
@Component({
  selector: 'app-my-applications',
  standalone: true,
  imports: [RouterLink, DatePipe, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container">
        <div class="page-head"><h1>Mes candidatures</h1><p class="sub">Suivez l'état de chacune de vos candidatures.</p></div>

        <!-- Filtres par statut -->
        <div class="tabs mb-3">
          @for (t of tabs; track t.value) {
            <button class="tab" [class.active]="filter() === t.value" (click)="filter.set(t.value)">
              {{ t.label }}
              <span class="tab-count">{{ countFor(t.value) }}</span>
            </button>
          }
        </div>

        @if (loading()) {
          <app-spinner message="Chargement de vos candidatures…" />
        } @else if (visible().length === 0) {
          <div class="empty-state card">
            <div class="icon">📭</div>
            <h3>Aucune candidature {{ filter() ? 'dans cette catégorie' : '' }}</h3>
            <p>Parcourez les offres et postulez pour démarrer votre suivi.</p>
            <a routerLink="/offres" class="btn btn-primary mt-2">Voir les offres</a>
          </div>
        } @else {
          <div class="app-list">
            @for (a of visible(); track a.id) {
              <div class="card app-item fade-in">
                <div class="flex-1">
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <a [routerLink]="['/offres', a.job_slug]" class="app-title">{{ a.job_title }}</a>
                    <span class="badge" [class]="badge(a.status)">{{ label(a.status) }}</span>
                  </div>
                  <p class="text-muted text-sm mb-1">{{ a.company_name }} · Postulé le {{ a.applied_at | date:'dd MMM yyyy' }}</p>
                  @if (a.cover_letter) { <p class="cover text-sm">{{ a.cover_letter }}</p> }
                </div>
                <div class="app-actions">
                  <a [routerLink]="['/offres', a.job_slug]" class="btn btn-outline btn-sm">Voir l'offre</a>
                  @if (a.can_withdraw) {
                    <button class="btn btn-danger btn-sm" (click)="withdraw(a)" [disabled]="busyId() === a.id">
                      @if (busyId() === a.id) { <span class="spinner"></span> }
                      @else { Retirer }
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; border: 1.5px solid var(--gray-200); background: #fff; font-weight: 600; font-size: .88rem; color: var(--gray-600); cursor: pointer; font-family: inherit; transition: .15s; }
    .tab:hover { border-color: var(--blue-300); color: var(--blue-700); }
    .tab.active { background: var(--blue-600); border-color: var(--blue-600); color: #fff; }
    .tab-count { background: rgba(0,0,0,.08); padding: 1px 8px; border-radius: 999px; font-size: .78rem; }
    .tab.active .tab-count { background: rgba(255,255,255,.25); }
    .app-list { display: flex; flex-direction: column; gap: 14px; }
    .app-item { display: flex; align-items: center; gap: 18px; padding: 20px 22px; }
    .app-title { font-size: 1.05rem; font-weight: 700; color: var(--gray-900); }
    .app-title:hover { color: var(--blue-700); }
    .cover { color: var(--gray-600); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .app-actions { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    @media (max-width: 640px) { .app-item { flex-direction: column; align-items: stretch; } .app-actions { flex-direction: row; } }
  `],
})
export class MyApplicationsComponent implements OnInit {
  private appService = inject(ApplicationService);
  private notify = inject(NotificationService);

  loading = signal(true);
  busyId = signal<number | null>(null);
  apps = signal<CandidateApplication[]>([]);
  filter = signal<ApplicationStatus | ''>('');

  tabs: { value: ApplicationStatus | ''; label: string }[] = [
    { value: '', label: 'Toutes' },
    { value: 'pending', label: 'En attente' },
    { value: 'reviewing', label: 'En examen' },
    { value: 'accepted', label: 'Acceptées' },
    { value: 'rejected', label: 'Refusées' },
    { value: 'withdrawn', label: 'Retirées' },
  ];

  visible = computed(() => {
    const f = this.filter();
    return f ? this.apps().filter((a) => a.status === f) : this.apps();
  });

  label = (s: ApplicationStatus) => APP_STATUS_LABELS[s];
  badge = (s: ApplicationStatus) => APP_STATUS_BADGE[s];
  countFor = (s: ApplicationStatus | '') => s ? this.apps().filter((a) => a.status === s).length : this.apps().length;

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.appService.mine().subscribe({
      next: (apps) => { this.apps.set(apps); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  withdraw(a: CandidateApplication): void {
    if (!confirm(`Retirer votre candidature pour « ${a.job_title} » ?`)) return;
    this.busyId.set(a.id);
    this.appService.withdraw(a.id).subscribe({
      next: () => {
        this.notify.success('Candidature retirée.');
        this.apps.update((list) => list.map((x) => x.id === a.id ? { ...x, status: 'withdrawn', can_withdraw: false } : x));
        this.busyId.set(null);
      },
      error: () => this.busyId.set(null),
    });
  }
}
