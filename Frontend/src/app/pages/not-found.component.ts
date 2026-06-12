import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page nf">
      <div class="container text-center">
        <div class="nf-code">404</div>
        <h1>Page introuvable</h1>
        <p class="text-muted">La page que vous cherchez n'existe pas ou a été déplacée.</p>
        <div class="flex gap-2 justify-center mt-3">
          <a routerLink="/" class="btn btn-primary">Retour à l'accueil</a>
          <a routerLink="/offres" class="btn btn-outline">Voir les offres</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nf { display: flex; align-items: center; min-height: calc(100vh - 200px); }
    .nf-code { font-size: clamp(5rem, 18vw, 10rem); font-weight: 900; line-height: 1; background: linear-gradient(120deg, var(--blue-600), var(--orange-500)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  `],
})
export class NotFoundComponent {}
