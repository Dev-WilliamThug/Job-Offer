import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { JobService } from '../../core/services/job.service';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { SpinnerComponent } from '../../shared/spinner.component';
import { JobDetail, RecruiterProfile } from '../../core/models/models';
import { JOB_STATUS_BADGE, JOB_STATUS_LABELS } from '../../core/models/labels';

/**
 * Tableau de bord recruteur : nombre d'offres publiées, total de
 * candidatures reçues, et aperçu des offres récentes.
 */
@Component({
  selector: 'app-recruiter-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container">
        <div class="page-head flex items-center justify-between flex-wrap gap-2">
          <div><h1>Tableau de bord</h1><p class="sub">Bienvenue {{ auth.fullName() }}, voici l'activité de vos recrutements.</p></div>
          <a routerLink="/recruteur/offres/nouvelle" class="btn btn-accent">+ Créer une offre</a>
        </div>

        @if (loading()) {
          <app-spinner message="Chargement du tableau de bord…" />
        } @else {
          <!-- Bandeau entreprise -->
          @if (!hasCompany()) {
            <div class="alert alert-warn mb-3">
              ⚠️ Vous n'avez pas encore d'entreprise active. Créez votre fiche entreprise pour pouvoir publier des offres.
              <a routerLink="/recruteur/entreprise" class="fw-700" style="margin-left:6px">Configurer →</a>
            </div>
          }

          <!-- Statistiques -->
          <div class="grid grid-4">
            <div class="card stat-card">
              <span class="stat-icon blue">📢</span>
              <div><div class="stat-value">{{ publishedCount() }}</div><div class="stat-label">Offres publiées</div></div>
            </div>
            <div class="card stat-card">
              <span class="stat-icon amber">📝</span>
              <div><div class="stat-value">{{ draftCount() }}</div><div class="stat-label">Brouillons</div></div>
            </div>
            <div class="card stat-card">
              <span class="stat-icon green">👥</span>
              <div><div class="stat-value">{{ totalApplications() }}</div><div class="stat-label">Candidatures reçues</div></div>
            </div>
            <div class="card stat-card">
              <span class="stat-icon orange">📁</span>
              <div><div class="stat-value">{{ jobs().length }}</div><div class="stat-label">Offres au total</div></div>
            </div>
          </div>

          <!-- Raccourcis -->
          <div class="grid grid-3 mt-3">
            <a routerLink="/recruteur/offres" class="card card-pad card-hover quick">
              <span class="quick-icon blue">📋</span><div><strong>Mes offres</strong><p class="text-muted text-sm mb-0">Gérez et suivez toutes vos offres.</p></div>
            </a>
            <a routerLink="/recruteur/offres/nouvelle" class="card card-pad card-hover quick">
              <span class="quick-icon orange">➕</span><div><strong>Publier une offre</strong><p class="text-muted text-sm mb-0">Créez une nouvelle offre d'emploi.</p></div>
            </a>
            <a routerLink="/recruteur/entreprise" class="card card-pad card-hover quick">
              <span class="quick-icon green">🏢</span><div><strong>Mon entreprise</strong><p class="text-muted text-sm mb-0">Gérez la fiche de votre entreprise.</p></div>
            </a>
          </div>

          <!-- Offres récentes -->
          <div class="flex items-center justify-between mt-4 mb-2">
            <h2 class="mb-0">Offres récentes</h2>
            <a routerLink="/recruteur/offres" class="text-sm fw-700">Tout voir →</a>
          </div>

          @if (jobs().length === 0) {
            <div class="empty-state card">
              <div class="icon">📭</div>
              <h3>Aucune offre publiée</h3>
              <p>Créez votre première offre pour commencer à recevoir des candidatures.</p>
              <a routerLink="/recruteur/offres/nouvelle" class="btn btn-accent mt-2">Créer une offre</a>
            </div>
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Intitulé</th><th>Statut</th><th>Candidatures</th><th>Date limite</th><th></th></tr></thead>
                <tbody>
                  @for (j of recent(); track j.id) {
                    <tr>
                      <td class="fw-600">{{ j.title }}</td>
                      <td><span class="badge" [class]="badge(j.status)">{{ statusLabel(j.status) }}</span></td>
                      <td>{{ j.application_count }}</td>
                      <td class="text-muted">{{ j.deadline | date:'dd/MM/yyyy' }}</td>
                      <td class="text-right">
                        <a [routerLink]="['/recruteur/offres', j.slug, 'candidats']" class="btn btn-outline btn-sm">Candidats</a>
                      </td>
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
    .text-right { text-align: right; }
  `],
})
export class RecruiterDashboardComponent implements OnInit {
  private jobService = inject(JobService);
  private profileService = inject(ProfileService);
  auth = inject(AuthService);

  loading = signal(true);
  jobs = signal<JobDetail[]>([]);
  profile = signal<RecruiterProfile | null>(null);

  hasCompany = computed(() => !!this.profile()?.company);
  publishedCount = computed(() => this.jobs().filter((j) => j.status === 'published').length);
  draftCount = computed(() => this.jobs().filter((j) => j.status === 'draft').length);
  totalApplications = computed(() => this.jobs().reduce((sum, j) => sum + (j.application_count || 0), 0));
  recent = computed(() => this.jobs().slice(0, 5));

  statusLabel = (s: JobDetail['status']) => JOB_STATUS_LABELS[s];
  badge = (s: JobDetail['status']) => JOB_STATUS_BADGE[s];

  ngOnInit(): void {
    forkJoin({
      jobs: this.jobService.mine(),
      profile: this.profileService.getRecruiterProfile(),
    }).subscribe({
      next: ({ jobs, profile }) => {
        this.jobs.set(jobs);
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
