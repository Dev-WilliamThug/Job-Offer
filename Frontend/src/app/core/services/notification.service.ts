import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warn';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

/**
 * Gestion centralisée des notifications "toast".
 * Utilisé notamment par l'intercepteur d'erreurs HTTP pour rendre
 * les erreurs 400/401/403/404/500 visibles dans l'interface.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<Toast[]>([]);
  private counter = 0;

  private push(type: ToastType, message: string, duration = 4500): void {
    const id = ++this.counter;
    this.toasts.update((list) => [...list, { id, type, message }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string): void { this.push('success', message); }
  error(message: string): void { this.push('error', message, 6000); }
  info(message: string): void { this.push('info', message); }
  warn(message: string): void { this.push('warn', message, 5500); }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
