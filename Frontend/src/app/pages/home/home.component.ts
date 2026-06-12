import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobService } from '../../core/services/job.service';
import { AuthService } from '../../core/services/auth.service';
import { JobCardComponent } from '../../shared/job-card.component';
import { JobListItem } from '../../core/models/models';

/**
 * Page d'accueil publique.
 * - Présentation du site (hero)
 * - Nombre d'offres disponibles (compteur dynamique)
 * - Boutons Connexion / Inscription
 * - Aperçu des dernières offres
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, JobCardComponent],
  template: `
    <!-- HERO -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-text fade-in">
          <span class="hero-pill">🚀 Plateforme de recrutement nouvelle génération</span>
          <h1>Trouvez l'emploi qui<br><span class="grad">vous ressemble vraiment</span></h1>
          <p class="hero-sub">
            JobOffer connecte les meilleurs talents aux entreprises qui recrutent.
            Postulez en un clic, suivez vos candidatures en temps réel, et faites avancer votre carrière.
          </p>
          <div class="hero-cta">
            <a routerLink="/offres" class="btn btn-primary btn-lg">Voir les offres</a>
            @if (!auth.isLoggedIn()) {
              <a routerLink="/inscription" class="btn btn-accent btn-lg">Créer un compte</a>
            } @else {
              <a [routerLink]="auth.homeRoute()" class="btn btn-accent btn-lg">Mon espace</a>
            }
          </div>

          <div class="hero-stats">
            <div class="hero-stat">
              <span class="hero-stat-value">{{ jobCount() !== null ? jobCount() : '—' }}</span>
              <span class="hero-stat-label">Offres disponibles</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">100%</span>
              <span class="hero-stat-label">Gratuit pour les candidats</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">24/7</span>
              <span class="hero-stat-label">Suivi en temps réel</span>
            </div>
          </div>
        </div>

        <div class="hero-art fade-in">
          <div class="art-card art-card-1">
            <span class="avatar" style="background:var(--blue-600);color:#fff">JO</span>
            <div><strong>Développeur Full-Stack</strong><p class="text-xs text-muted mb-0">TechCorp · Paris</p></div>
            <span class="badge badge-green">Nouveau</span>
          </div>
          <div class="art-card art-card-2">
            <span class="avatar" style="background:var(--orange-500);color:#fff">UX</span>
            <div><strong>UX Designer</strong><p class="text-xs text-muted mb-0">Studio · Remote</p></div>
            <span class="badge badge-orange">Remote</span>
          </div>
          <div class="art-card art-card-3">
            <div class="flex items-center gap-2">
              <span class="stat-icon green" style="width:42px;height:42px">✓</span>
              <div><strong>Candidature acceptée</strong><p class="text-xs text-muted mb-0">il y a 2 min</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="section">
      <div class="container">
        <div class="text-center mb-4">
          <span class="badge badge-blue">Pourquoi JobOffer ?</span>
          <h2 class="mt-2">Une expérience pensée pour vous</h2>
          <p class="text-muted">Que vous cherchiez un emploi ou un talent, tout est simple, rapide et transparent.</p>
        </div>
        <div class="grid grid-3">
          <div class="card card-pad feature">
            <span class="feature-icon blue">🔍</span>
            <h3>Recherche puissante</h3>
            <p class="text-muted mb-0">Filtrez par métier, localisation, type de contrat et mode de travail pour trouver l'offre idéale.</p>
          </div>
          <div class="card card-pad feature">
            <span class="feature-icon orange">⚡</span>
            <h3>Candidature express</h3>
            <p class="text-muted mb-0">Un profil, un CV, et postulez en un clic. Joignez une lettre de motivation personnalisée.</p>
          </div>
          <div class="card card-pad feature">
            <span class="feature-icon green">📊</span>
            <h3>Suivi transparent</h3>
            <p class="text-muted mb-0">Suivez le statut de chaque candidature : en attente, acceptée ou refusée, en temps réel.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- DERNIÈRES OFFRES -->
    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 class="mb-0">Dernières offres</h2>
            <p class="text-muted mb-0">Les opportunités les plus récentes publiées sur la plateforme.</p>
          </div>
          <a routerLink="/offres" class="btn btn-outline">Toutes les offres →</a>
        </div>

        @if (loading()) {
          <div class="grid grid-3">
            @for (i of [1,2,3]; track i) { <div class="skeleton" style="height:230px"></div> }
          </div>
        } @else if (latest().length === 0) {
          <div class="empty-state card">
            <div class="icon">📭</div>
            <h3>Aucune offre pour le moment</h3>
            <p>Revenez bientôt, de nouvelles opportunités arrivent chaque jour.</p>
          </div>
        } @else {
          <div class="grid grid-3">
            @for (job of latest(); track job.id) { <app-job-card [job]="job" /> }
          </div>
        }
      </div>
    </section>

    <!-- CTA RECRUTEUR -->
    <section class="section">
      <div class="container">
        <div class="cta-band">
          <div>
            <h2 style="color:#fff">Vous recrutez ?</h2>
            <p style="color:rgba(255,255,255,.9);max-width:520px" class="mb-0">
              Publiez vos offres, gérez vos candidatures et trouvez les meilleurs profils. Créez votre espace recruteur en quelques minutes.
            </p>
          </div>
          <a routerLink="/inscription" class="btn btn-accent btn-lg">Devenir recruteur</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero { background: radial-gradient(1200px 500px at 80% -10%, var(--blue-50), transparent), linear-gradient(180deg, #fff, var(--gray-50)); padding: 56px 0 40px; overflow: hidden; }
    .hero-inner { display: grid; grid-template-columns: 1.1fr .9fr; gap: 40px; align-items: center; }
    .hero-pill { display: inline-block; background: var(--white); border: 1px solid var(--blue-100); color: var(--blue-700); font-weight: 600; font-size: .82rem; padding: 7px 14px; border-radius: 999px; box-shadow: var(--shadow-sm); margin-bottom: 20px; }
    .grad { background: linear-gradient(100deg, var(--blue-600), var(--orange-500)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-sub { font-size: 1.12rem; color: var(--gray-600); max-width: 540px; margin-bottom: 28px; }
    .hero-cta { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 36px; }
    .hero-stats { display: flex; gap: 36px; flex-wrap: wrap; }
    .hero-stat-value { display: block; font-size: 1.8rem; font-weight: 800; color: var(--gray-900); line-height: 1; }
    .hero-stat-label { font-size: .85rem; color: var(--text-muted); }
    .hero-art { position: relative; height: 380px; }
    .art-card { position: absolute; background: #fff; border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-lg); padding: 16px; display: flex; align-items: center; gap: 12px; width: 290px; }
    .art-card-1 { top: 20px; right: 0; animation: float 5s ease-in-out infinite; }
    .art-card-2 { top: 150px; left: 0; animation: float 5s ease-in-out infinite .8s; }
    .art-card-3 { bottom: 10px; right: 30px; width: 250px; animation: float 5s ease-in-out infinite 1.6s; }
    @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
    .feature { text-align: left; }
    .feature-icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 16px; font-size: 1.6rem; margin-bottom: 14px; }
    .feature-icon.blue { background: var(--blue-50); } .feature-icon.orange { background: var(--orange-50); } .feature-icon.green { background: var(--green-50); }
    .cta-band { background: linear-gradient(120deg, var(--blue-700), var(--blue-600)); border-radius: var(--radius-xl); padding: 44px; display: flex; align-items: center; justify-content: space-between; gap: 28px; flex-wrap: wrap; box-shadow: var(--shadow-blue); }
    @media (max-width: 900px) { .hero-inner { grid-template-columns: 1fr; } .hero-art { display: none; } }
  `],
})
export class HomeComponent implements OnInit {
  private jobService = inject(JobService);
  auth = inject(AuthService);

  jobCount = signal<number | null>(null);
  latest = signal<JobListItem[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.jobService.list().subscribe({
      next: (jobs) => {
        this.jobCount.set(jobs.length);
        this.latest.set(jobs.slice(0, 6));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
