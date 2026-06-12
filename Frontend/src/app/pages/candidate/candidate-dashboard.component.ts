import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/services/auth.service';
import { SpinnerComponent } from '../../shared/spinner.component';
import { CandidateApplication } from '../../core/models/models';
import { APP_STATUS_BADGE, APP_STATUS_LABELS } from '../../core/models/labels';

/**
 * Tableau de bord candidat : nombre de candidatures, acceptées, en attente,
 * et un aperçu des candidatures récentes.
 */
@Component({
  selector: 'app-candidate-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container">
        <div class="page-head flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1>Bonjour, {{ auth.fullName() }} 👋</h1>
            <p class="sub">Voici un aperçu de votre activité de candidature.</p>
          </div>
          <a routerLink="/offres" class="btn btn-primary">Parcourir les offres</a>
        </div>

        @if (loading()) {
          <app-spinner message="Chargement de votre tableau de bord…" />
        } @else {
          <!-- Statistiques -->
          <div class="grid grid-4">
            <div class="card stat-card">
              <span class="stat-icon blue">📋</span>
              <div><div class="stat-value">{{ total() }}</div><div class="stat-label">Candidatures envoyées</div></div>
            </div>
            <div class="card stat-card">
              <span class="stat-icon green">✓</span>
              <div><div class="stat-value">{{ count('accepted') }}</div><div class="stat-label">Acceptées</div></div>
            </div>
            <div class="card stat-card">
              <span class="stat-icon amber">⏳</span>
              <div><div class="stat-value">{{ count('pending') + count('reviewing') }}</div><div class="stat-label">En attente</div></div>
            </div>
            <div class="card stat-card">
              <span class="stat-icon red">✕</span>
              <div><div class="stat-value">{{ count('rejected') }}</div><div class="stat-label">Refusées</div></div>
            </div>
          </div>

          <!-- Raccourcis -->
          <div class="grid grid-3 mt-3">
            <a routerLink="/candidat/candidatures" class="card card-pad card-hover quick">
              <span class="quick-icon blue">📨</span>
              <div><strong>Mes candidatures</strong><p class="text-muted text-sm mb-0">Suivez le statut de chaque candidature.</p></div>
            </a>
            <a routerLink="/candidat/profil" class="card card-pad card-hover quick">
              <span class="quick-icon orange">👤</span>
              <div><strong>Mon profil</strong><p class="text-muted text-sm mb-0">Complétez vos informations et votre CV.</p></div>
            </a>
            <a routerLink="/offres" class="card card-pad card-hover quick">
              <span class="quick-icon green">🔍</span>
              <div><strong>Explorer les offres</strong><p class="text-muted text-sm mb-0">Trouvez votre prochaine opportunité.</p></div>
            </a>
          </div>

          <!-- Candidatures récentes -->
          <div class="flex items-center justify-between mt-4 mb-2">
            <h2 class="mb-0">Candidatures récentes</h2>
            <a routerLink="/candidat/candidatures" class="text-sm fw-700">Tout voir →</a>
          </div>

          @if (recent().length === 0) {
            <div class="empty-state card">
              <div class="icon">📭</div>
              <h3>Aucune candidature pour l'instant</h3>
              <p>Postulez à votre première offre pour la voir apparaître ici.</p>
              <a routerLink="/offres" class="btn btn-primary mt-2">Voir les offres</a>
            </div>
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Poste</th><th>Entreprise</th><th>Date</th><th>Statut</th></tr></thead>
                <tbody>
                  @for (a of recent(); track a.id) {
                    <tr>
                      <td class="fw-600">{{ a.job_title }}</td>
                      <td class="text-muted">{{ a.company_name }}</td>
                      <td class="text-muted">{{ a.applied_at | date:'dd/MM/yyyy' }}</td>
                      <td><span class="badge" [class]="badge(a.status)">{{ label(a.status) }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .quick { display: flex; align-items: center; gap: 16px; text-decoration: none; }
    .quick strong { color: var(--gray-900); display: block; }
    .quick-icon { width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0; }
    .quick-icon.blue { background: var(--blue-50); } .quick-icon.orange { background: var(--orange-50); } .quick-icon.green { background: var(--green-50); }
  `],
})
export class CandidateDashboardComponent implements OnInit {
  private appService = inject(ApplicationService);
  auth = inject(AuthService);

  loading = signal(true);
  apps = signal<CandidateApplication[]>([]);

  total = computed(() => this.apps().length);
  recent = computed(() => this.apps().slice(0, 5));

  label = (s: CandidateApplication['status']) => APP_STATUS_LABELS[s];
  badge = (s: CandidateApplication['status']) => APP_STATUS_BADGE[s];
  count = (s: CandidateApplication['status']) => this.apps().filter((a) => a.status === s).length;

  ngOnInit(): void {
    this.appService.mine().subscribe({
      next: (apps) => { this.apps.set(apps); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
