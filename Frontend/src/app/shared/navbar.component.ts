import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { initials } from '../core/services/media.util';

/**
 * Barre de navigation principale, adaptée au rôle de l'utilisateur :
 * - Visiteur  : Accueil, Offres, Connexion, Inscription
 * - Candidat  : Dashboard, Mes candidatures, Profil + menu compte
 * - Recruteur : Dashboard, Mes offres, Entreprise + menu compte
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="nav">
      <div class="container nav-inner">
        <a routerLink="/" class="brand" (click)="closeAll()">
          <span class="brand-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="brand-text">Job<span class="brand-accent">Offer</span></span>
        </a>

        <button class="burger" (click)="mobileOpen.set(!mobileOpen())" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>

        <nav class="nav-links" [class.open]="mobileOpen()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="closeAll()">Accueil</a>
          <a routerLink="/offres" routerLinkActive="active" (click)="closeAll()">Offres</a>

          @if (auth.isCandidate()) {
            <a routerLink="/candidat/dashboard" routerLinkActive="active" (click)="closeAll()">Tableau de bord</a>
            <a routerLink="/candidat/candidatures" routerLinkActive="active" (click)="closeAll()">Mes candidatures</a>
          }
          @if (auth.isRecruiter()) {
            <a routerLink="/recruteur/dashboard" routerLinkActive="active" (click)="closeAll()">Tableau de bord</a>
            <a routerLink="/recruteur/offres" routerLinkActive="active" (click)="closeAll()">Mes offres</a>
            <a routerLink="/recruteur/entreprise" routerLinkActive="active" (click)="closeAll()">Entreprise</a>
          }

          <div class="nav-cta">
            @if (!auth.isLoggedIn()) {
              <a routerLink="/connexion" class="btn btn-outline btn-sm" (click)="closeAll()">Connexion</a>
              <a routerLink="/inscription" class="btn btn-primary btn-sm" (click)="closeAll()">Inscription</a>
            } @else {
              <div class="account">
                <button class="account-btn" (click)="menuOpen.set(!menuOpen())">
                  <span class="avatar" style="width:34px;height:34px;font-size:.78rem">{{ ini() }}</span>
                  <span class="account-name">{{ auth.fullName() }}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                @if (menuOpen()) {
                  <div class="account-menu">
                    <div class="account-head">
                      <strong>{{ auth.fullName() }}</strong>
                      <span class="text-xs text-muted">{{ roleLabel() }}</span>
                    </div>
                    <hr class="divider" style="margin:8px 0">
                    @if (auth.isCandidate()) {
                      <a routerLink="/candidat/profil" (click)="closeAll()">Mon profil</a>
                    }
                    @if (auth.isRecruiter()) {
                      <a routerLink="/recruteur/entreprise" (click)="closeAll()">Mon entreprise</a>
                    }
                    <a routerLink="/mot-de-passe" (click)="closeAll()">Mot de passe</a>
                    <button class="logout" (click)="logout()">Se déconnecter</button>
                  </div>
                }
              </div>
            }
          </div>
        </nav>
      </div>
    </header>
  `,
  styles: [`
    .nav { position: sticky; top: 0; z-index: 900; background: rgba(255,255,255,.85); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 68px; gap: 20px; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.3rem; color: var(--gray-900); letter-spacing: -.02em; }
    .brand:hover { color: var(--gray-900); }
    .brand-logo { width: 38px; height: 38px; border-radius: 11px; background: linear-gradient(135deg, var(--blue-600), var(--blue-700)); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-blue); }
    .brand-accent { color: var(--accent); }
    .nav-links { display: flex; align-items: center; gap: 6px; }
    .nav-links > a { padding: 8px 14px; border-radius: 9px; font-weight: 600; font-size: .92rem; color: var(--gray-600); }
    .nav-links > a:hover { background: var(--blue-50); color: var(--blue-700); }
    .nav-links > a.active { background: var(--blue-50); color: var(--blue-700); }
    .nav-cta { display: flex; align-items: center; gap: 10px; margin-left: 10px; }
    .account { position: relative; }
    .account-btn { display: flex; align-items: center; gap: 9px; background: var(--gray-100); border: 1px solid var(--border); padding: 5px 12px 5px 6px; border-radius: 999px; cursor: pointer; font-family: inherit; color: var(--gray-700); font-weight: 600; }
    .account-btn:hover { background: var(--gray-200); }
    .account-name { font-size: .88rem; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .account-menu { position: absolute; right: 0; top: calc(100% + 10px); width: 230px; background: #fff; border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow-lg); padding: 12px; animation: fadeIn .15s ease both; }
    .account-head { display: flex; flex-direction: column; gap: 2px; padding: 4px 8px; }
    .account-menu a, .logout { display: block; width: 100%; text-align: left; padding: 9px 12px; border-radius: 9px; font-size: .9rem; font-weight: 500; color: var(--gray-700); background: none; border: none; cursor: pointer; font-family: inherit; }
    .account-menu a:hover { background: var(--blue-50); color: var(--blue-700); }
    .logout { color: var(--red-600); }
    .logout:hover { background: var(--red-50); }
    .burger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 8px; }
    .burger span { width: 24px; height: 2.5px; background: var(--gray-700); border-radius: 2px; transition: .2s; }
    @media (max-width: 900px) {
      .burger { display: flex; }
      .nav-links { position: absolute; top: 68px; left: 0; right: 0; background: #fff; flex-direction: column; align-items: stretch; gap: 4px; padding: 16px; border-bottom: 1px solid var(--border); box-shadow: var(--shadow); max-height: 0; overflow: hidden; opacity: 0; pointer-events: none; transition: max-height .25s, opacity .2s; }
      .nav-links.open { max-height: 560px; opacity: 1; pointer-events: auto; }
      .nav-cta { flex-direction: column; align-items: stretch; margin-left: 0; margin-top: 8px; }
      .nav-cta .btn { width: 100%; }
      .account { width: 100%; }
      .account-btn { width: 100%; justify-content: flex-start; }
      .account-menu { position: static; width: 100%; box-shadow: none; border: none; padding: 6px 0; }
      .account-name { max-width: none; }
    }
  `],
})
export class NavbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  private host = inject(ElementRef);

  menuOpen = signal(false);
  mobileOpen = signal(false);

  ini = () => initials(this.auth.fullName());
  roleLabel = () => {
    switch (this.auth.role()) {
      case 'candidate': return 'Candidat';
      case 'recruiter': return 'Recruteur';
      case 'admin': return 'Administrateur';
      default: return '';
    }
  };

  closeAll(): void { this.menuOpen.set(false); this.mobileOpen.set(false); }

  logout(): void {
    this.auth.logout();
    this.closeAll();
    this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!this.host.nativeElement.contains(ev.target)) this.menuOpen.set(false);
  }
}
