import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LoadingService } from '../services/loading.service';
import { finalize } from 'rxjs';

/**
 * Intercepteur d'authentification + chargement.
 * - Ajoute l'en-tête `Authorization: Bearer <token>` sur chaque requête API.
 * - Alimente le compteur global de chargement (barre de progression).
 *
 * On ne touche pas au Content-Type pour les FormData (upload de fichiers) :
 * Angular pose alors automatiquement le bon multipart/form-data boundary.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const loading = inject(LoadingService);

  const token = auth.accessToken;
  let request = req;

  // On n'ajoute le token qu'aux endpoints qui en ont besoin (pas login/register/refresh).
  const isAuthEndpoint = /\/(login|register|token\/refresh)\/?$/.test(req.url);
  if (token && !isAuthEndpoint) {
    request = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  loading.start();
  return next(request).pipe(finalize(() => loading.stop()));
};
