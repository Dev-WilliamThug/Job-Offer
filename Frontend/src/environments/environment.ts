/**
 * Environnement de développement.
 * apiUrl  : racine de l'API Django (avec /api).
 * mediaUrl: origine du serveur pour reconstruire les URLs de fichiers (logos, CV).
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  mediaUrl: 'http://localhost:8000',
};
