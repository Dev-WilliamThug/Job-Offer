import { Component, Input } from '@angular/core';

/**
 * Indicateur de chargement local (centré) à afficher pendant un appel API
 * propre à une page : <app-spinner message="Chargement des offres…" />
 */
@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `
    <div class="spinner-wrap">
      <div class="spinner spinner-blue" style="width:38px;height:38px;border-width:4px"></div>
      @if (message) { <p class="spinner-text">{{ message }}</p> }
    </div>
  `,
  styles: [`
    .spinner-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 56px 20px; }
    .spinner-text { color: var(--text-muted); font-weight: 500; margin: 0; }
  `],
})
export class SpinnerComponent {
  @Input() message = '';
}
