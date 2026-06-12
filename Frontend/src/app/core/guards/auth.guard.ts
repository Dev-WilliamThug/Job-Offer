import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * AuthGuard : protège les routes privées.
 * Si l'utilisateur n'est pas connecté → redirection vers /connexion
 * en mémorisant l'URL demandée (returnUrl).
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotificationService);

  if (auth.isLoggedIn()) return true;

  notify.warn('Veuillez vous connecter pour accéder à cette page.');
  return router.createUrlTree(['/connexion'], {
    queryParams: { returnUrl: state.url },
  });
};
