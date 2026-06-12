import { environment } from '../../../environments/environment';

/**
 * Reconstruit l'URL absolue d'un fichier média (logo, CV).
 * L'API peut renvoyer une URL absolue ou un chemin relatif selon le contexte.
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${environment.mediaUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Initiales pour les avatars de secours. */
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
