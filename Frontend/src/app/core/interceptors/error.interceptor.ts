import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Intercepteur d'erreurs HTTP.
 * Rend visibles dans l'interface (toasts) les erreurs 400/401/403/404/500.
 *
 * Cas particulier 401 : on tente UN rafraîchissement du token, puis on
 * rejoue la requête. Si le refresh échoue → déconnexion + redirection.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  const isRefreshCall = req.url.includes('/token/refresh/');
  const isLoginCall = /\/(login|register)\/?$/.test(req.url);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // ── 401 : token expiré → tentative de refresh ──────────────
      if (err.status === 401 && !isRefreshCall && !isLoginCall && auth.refreshToken) {
        return auth.refresh().pipe(
          switchMap(({ access }) => {
            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${access}` } });
            return next(retried);
          }),
          catchError((refreshErr) => {
            auth.logout();
            notify.error('Votre session a expiré. Veuillez vous reconnecter.');
            router.navigate(['/connexion']);
            return throwError(() => refreshErr);
          }),
        );
      }

      // ── Autres erreurs : message lisible selon le code ─────────
      notify.error(buildMessage(err));

      if (err.status === 401) {
        auth.logout();
        router.navigate(['/connexion']);
      }

      return throwError(() => err);
    }),
  );
};

/** Construit un message d'erreur lisible à partir d'une réponse DRF. */
function buildMessage(err: HttpErrorResponse): string {
  if (err.status === 0) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion ou que l\'API est démarrée.';
  }

  const extracted = extractDetail(err.error);

  switch (err.status) {
    case 400: return extracted || 'Requête invalide. Vérifiez les informations saisies.';
    case 401: return extracted || 'Authentification requise.';
    case 403: return extracted || "Accès refusé : vous n'avez pas les droits nécessaires.";
    case 404: return extracted || 'Ressource introuvable.';
    case 409: return extracted || 'Conflit avec une donnée existante.';
    case 500: return 'Erreur interne du serveur (500). Réessayez plus tard.';
    case 502:
    case 503:
    case 504: return 'Le serveur est momentanément indisponible. Réessayez plus tard.';
    default: return extracted || `Une erreur est survenue (code ${err.status}).`;
  }
}

/** Parcourt récursivement le corps d'erreur DRF pour en extraire un texte. */
function extractDetail(body: unknown): string {
  if (!body) return '';
  if (typeof body === 'string') return body;

  if (typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (typeof obj['detail'] === 'string') return obj['detail'];

    const messages: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const prefix = key === 'non_field_errors' ? '' : `${humanize(key)} : `;
      if (Array.isArray(value)) {
        messages.push(prefix + value.map((v) => String(v)).join(' '));
      } else if (typeof value === 'string') {
        messages.push(prefix + value);
      }
    }
    if (messages.length) return messages.slice(0, 3).join('\n');
  }
  return '';
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
