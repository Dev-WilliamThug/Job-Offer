import { Component, inject } from '@angular/core';
import { LoadingService } from '../core/services/loading.service';

/**
 * Barre de progression fine en haut de l'écran, visible pendant
 * qu'au moins une requête HTTP est en cours (indicateur de chargement global).
 */
@Component({
  selector: 'app-loading-bar',
  standalone: true,
  template: `
    @if (loading.isLoading()) {
      <div class="loading-bar"><div class="loading-bar-inner"></div></div>
    }
  `,
  styles: [`
    .loading-bar {
      position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 10000;
      background: var(--blue-100); overflow: hidden;
    }
    .loading-bar-inner {
      height: 100%; width: 40%;
      background: linear-gradient(90deg, var(--blue-500), var(--orange-500));
      animation: slide 1.1s ease-in-out infinite;
    }
    @keyframes slide {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(120%); }
      100% { transform: translateX(250%); }
    }
  `],
})
export class LoadingBarComponent {
  loading = inject(LoadingService);
}
