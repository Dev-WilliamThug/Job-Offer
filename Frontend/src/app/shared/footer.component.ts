import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container footer-inner">
        <div class="footer-brand">
          <div class="brand">
            <span class="brand-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
              </svg>
            </span>
            <span>Job<span class="brand-accent">Offer</span></span>
          </div>
          <p class="text-sm">La plateforme moderne qui connecte les talents et les recruteurs.</p>
        </div>
        <div class="footer-col">
          <h4>Explorer</h4>
          <a routerLink="/offres">Offres d'emploi</a>
          <a routerLink="/inscription">Devenir candidat</a>
          <a routerLink="/inscription">Espace recruteur</a>
        </div>
        <div class="footer-col">
          <h4>Compte</h4>
          <a routerLink="/connexion">Connexion</a>
          <a routerLink="/inscription">Inscription</a>
        </div>
      </div>
      <div class="footer-bottom container">
        <span>© {{ year }} JobOffer. Tous droits réservés.</span>
      </div>
    </footer>
  `,
  styles: [`
    .footer { background: var(--gray-900); color: var(--gray-300); margin-top: 60px; }
    .footer-inner { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 36px; padding: 52px 20px 32px; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.25rem; color: #fff; margin-bottom: 12px; }
    .brand-logo { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, var(--blue-600), var(--blue-700)); color: #fff; display: flex; align-items: center; justify-content: center; }
    .brand-accent { color: var(--orange-400); }
    .footer-brand p { max-width: 320px; color: var(--gray-400); }
    .footer-col h4 { color: #fff; font-size: .95rem; margin-bottom: 14px; }
    .footer-col a { display: block; color: var(--gray-400); padding: 5px 0; font-size: .9rem; }
    .footer-col a:hover { color: var(--orange-400); }
    .footer-bottom { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 20px; border-top: 1px solid var(--gray-800); font-size: .82rem; color: var(--gray-500); }
    @media (max-width: 760px) { .footer-inner { grid-template-columns: 1fr 1fr; } .footer-brand { grid-column: 1 / -1; } }
  `],
})
export class FooterComponent {
  year = 2026;
}
