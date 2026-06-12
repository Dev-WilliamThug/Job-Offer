import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { UserRole } from '../models/models';

/**
 * RoleGuard : restreint une route à un ou plusieurs rôles.
 * À utiliser via `canActivate: [authGuard, roleGuard(['recruiter'])]`.
 * - Non connecté → /connexion
 * - Mauvais rôle → renvoyé vers son propre tableau de bord (403 logique).
 */
export function roleGuard(roles: UserRole[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const notify = inject(NotificationService);

    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/connexion'], {
        queryParams: { returnUrl: state.url },
      });
    }

    const role = auth.role();
    if (role && roles.includes(role)) return true;

    notify.error("Vous n'avez pas l'autorisation d'accéder à cette page.");
    return router.parseUrl(auth.homeRoute());
  };
}
