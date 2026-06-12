import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

/**
 * Routing de la SPA.
 * - Routes publiques : accueil, connexion, inscription, offres, détail.
 * - Routes privées candidat : canActivate [authGuard, roleGuard(['candidate'])].
 * - Routes privées recruteur : canActivate [authGuard, roleGuard(['recruiter'])].
 * Lazy loading (loadComponent) pour alléger le bundle initial.
 */
export const routes: Routes = [
  // ─────────── Public ───────────
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'JobOffer — Trouvez l\'emploi qui vous ressemble',
  },
  {
    path: 'connexion',
    loadComponent: () => import('./pages/auth/login.component').then((m) => m.LoginComponent),
    title: 'Connexion · JobOffer',
  },
  {
    path: 'inscription',
    loadComponent: () => import('./pages/auth/register.component').then((m) => m.RegisterComponent),
    title: 'Inscription · JobOffer',
  },
  {
    path: 'offres',
    loadComponent: () => import('./pages/jobs/jobs-list.component').then((m) => m.JobsListComponent),
    title: 'Offres d\'emploi · JobOffer',
  },
  {
    path: 'offres/:slug',
    loadComponent: () => import('./pages/jobs/job-detail.component').then((m) => m.JobDetailComponent),
    title: 'Détail de l\'offre · JobOffer',
  },

  // ─────────── Espace candidat ───────────
  {
    path: 'candidat',
    canActivate: [authGuard, roleGuard(['candidate'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/candidate/candidate-dashboard.component').then((m) => m.CandidateDashboardComponent),
        title: 'Tableau de bord · Candidat',
      },
      {
        path: 'profil',
        loadComponent: () => import('./pages/candidate/candidate-profile.component').then((m) => m.CandidateProfileComponent),
        title: 'Mon profil · Candidat',
      },
      {
        path: 'profil/modifier',
        loadComponent: () => import('./pages/candidate/candidate-profile-edit.component').then((m) => m.CandidateProfileEditComponent),
        title: 'Modifier mon profil · Candidat',
      },
      {
        path: 'candidatures',
        loadComponent: () => import('./pages/candidate/my-applications.component').then((m) => m.MyApplicationsComponent),
        title: 'Mes candidatures · Candidat',
      },
    ],
  },

  // ─────────── Espace recruteur ───────────
  {
    path: 'recruteur',
    canActivate: [authGuard, roleGuard(['recruiter'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/recruiter/recruiter-dashboard.component').then((m) => m.RecruiterDashboardComponent),
        title: 'Tableau de bord · Recruteur',
      },
      {
        path: 'entreprise',
        loadComponent: () => import('./pages/recruiter/company-setup.component').then((m) => m.CompanySetupComponent),
        title: 'Mon entreprise · Recruteur',
      },
      {
        path: 'offres',
        loadComponent: () => import('./pages/recruiter/my-jobs.component').then((m) => m.MyJobsComponent),
        title: 'Mes offres · Recruteur',
      },
      {
        path: 'offres/nouvelle',
        loadComponent: () => import('./pages/recruiter/job-form.component').then((m) => m.JobFormComponent),
        title: 'Créer une offre · Recruteur',
      },
      {
        path: 'offres/:slug/modifier',
        loadComponent: () => import('./pages/recruiter/job-form.component').then((m) => m.JobFormComponent),
        title: 'Modifier l\'offre · Recruteur',
      },
      {
        path: 'offres/:slug/candidats',
        loadComponent: () => import('./pages/recruiter/job-applicants.component').then((m) => m.JobApplicantsComponent),
        title: 'Candidatures reçues · Recruteur',
      },
    ],
  },

  // ─────────── Compte (commun) ───────────
  {
    path: 'mot-de-passe',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/account/change-password.component').then((m) => m.ChangePasswordComponent),
    title: 'Changer de mot de passe',
  },

  // ─────────── 404 ───────────
  {
    path: '**',
    loadComponent: () => import('./pages/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page introuvable · JobOffer',
  },
];
