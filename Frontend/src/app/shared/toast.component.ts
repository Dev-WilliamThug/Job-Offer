import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { NotificationService } from '../core/services/notification.service';

/**
 * Pile de notifications "toast" affichée en haut à droite.
 * Alimentée par NotificationService (succès, erreurs HTTP, etc.).
 */
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (t of notify.toasts(); track t.id) {
        <div class="toast" [ngClass]="'toast-' + t.type">
          <span class="toast-icon">
            @switch (t.type) {
              @case ('success') { ✓ }
              @case ('error')   { ✕ }
              @case ('warn')    { ! }
              @default          { i }
            }
          </span>
          <span class="toast-msg">{{ t.message }}</span>
          <button class="toast-close" (click)="notify.dismiss(t.id)" aria-label="Fermer">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed; top: 18px; right: 18px; z-index: 9999;
      display: flex; flex-direction: column; gap: 12px; max-width: 380px;
    }
    .toast {
      display: flex; align-items: flex-start; gap: 12px;
      background: #fff; border-radius: 14px; padding: 14px 16px;
      box-shadow: var(--shadow-lg); border-left: 4px solid var(--gray-300);
      animation: toastIn .28s cubic-bezier(.2,.8,.2,1) both;
    }
    @keyframes toastIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: none; } }
    .toast-icon {
      flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: .8rem; color: #fff;
    }
    .toast-msg { flex: 1; font-size: .9rem; font-weight: 500; color: var(--gray-700); white-space: pre-line; }
    .toast-close { background: none; border: none; font-size: 1.3rem; line-height: 1; color: var(--gray-400); cursor: pointer; padding: 0 2px; }
    .toast-close:hover { color: var(--gray-700); }
    .toast-success { border-left-color: var(--green-600); } .toast-success .toast-icon { background: var(--green-600); }
    .toast-error   { border-left-color: var(--red-600); }   .toast-error .toast-icon { background: var(--red-600); }
    .toast-warn    { border-left-color: var(--amber-600); } .toast-warn .toast-icon { background: var(--amber-600); }
    .toast-info    { border-left-color: var(--blue-600); }  .toast-info .toast-icon { background: var(--blue-600); }
  `],
})
export class ToastComponent {
  notify = inject(NotificationService);
}
