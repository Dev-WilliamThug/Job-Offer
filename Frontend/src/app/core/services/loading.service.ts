import { Injectable, signal, computed } from '@angular/core';

/**
 * Compteur global de requêtes HTTP en cours.
 * L'intercepteur incrémente/décrémente ce compteur ; la barre de
 * progression globale (top loading bar) s'affiche tant qu'il est > 0.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly count = signal(0);
  readonly isLoading = computed(() => this.count() > 0);

  start(): void { this.count.update((n) => n + 1); }
  stop(): void { this.count.update((n) => Math.max(0, n - 1)); }
}
