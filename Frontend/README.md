# JobOffer — Frontend (Angular 18 SPA)

Interface moderne et réactive pour la plateforme de recrutement **JobOffer**, connectée à
l'API Django REST déjà implémentée (`../Backend`). Palette **Bleu · Blanc · Orange**.

---

## ✨ Fonctionnalités

### Public
1. **Accueil** — présentation, nombre d'offres disponibles, CTA Connexion / Inscription
2. **Connexion** — email + mot de passe (JWT)
3. **Inscription** — Candidat ou Recruteur
4. **Liste des offres** — recherche, filtres (contrat, expérience, mode), pagination
5. **Détail d'une offre** — description, salaire, localisation, entreprise, **Postuler**

### Espace Candidat
6. **Dashboard** — nb de candidatures, acceptées, en attente, refusées
7. **Mon profil** — informations, CV, compétences
8. **Mes candidatures** — liste + statut (en attente / acceptée / refusée)
9. **Modifier profil** — Reactive Form (+ upload CV)

### Espace Recruteur
10. **Dashboard** — nb d'offres publiées, candidatures reçues
11. **Mes offres** — tableau de gestion (publier / clôturer / modifier / supprimer)
12. **Créer une offre** — Reactive Form complet
13. **Modifier une offre**
14. **Détails / candidats d'une offre**
15. **Gestion des candidatures** — Accepter / Refuser / Examiner

---

## 🏗️ Architecture

```
src/app/
├── core/
│   ├── models/        # Interfaces TypeScript (models.ts) + libellés FR (labels.ts)
│   ├── services/      # auth, job, company, application, profile, notification, loading
│   ├── guards/        # authGuard + roleGuard(['candidate'|'recruiter'])
│   └── interceptors/  # authInterceptor (JWT + loading) · errorInterceptor (400/401/403/404/500)
├── shared/            # navbar, footer, toast, loading-bar, spinner, job-card
└── pages/             # home · auth · jobs · candidate · recruiter · account · not-found
```

### Conformité au cahier des charges
- ✅ **Angular 18** (≥ 17), **SPA** avec routing (`app.routes.ts`, lazy `loadComponent`)
- ✅ **JWT** : stockage `localStorage`, **HTTP Interceptor** (`Authorization: Bearer`), **AuthGuard** (`canActivate`) sur toutes les routes privées
- ✅ Tous les appels API passent par des **services Angular dédiés** (injection de dépendances)
- ✅ **Reactive Forms** + validation côté client (création/modification, inscription, profil…)
- ✅ **Indicateurs de chargement** : barre de progression globale + spinners par page
- ✅ **Gestion des erreurs HTTP** visible via **toasts** (400/401/403/404/500, refresh auto du token sur 401)

---

## 🚀 Démarrage local

### 1. Backend (API Django)
Depuis `../Backend` :
```bash
# Variable d'environnement requise par config/settings.py
export DATABASE_URL="sqlite:///db.sqlite3"   # ou votre Postgres
python manage.py migrate
python manage.py createsuperuser            # pour valider les entreprises (admin)
python manage.py runserver                  # http://localhost:8000
```

### 2. Frontend (Angular)
```bash
cd Frontend
npm install
npm start            # http://localhost:4200
```
> Le CORS du backend autorise déjà `http://localhost:4200`.

L'URL de l'API est définie dans `src/environments/environment.ts`
(`apiUrl: http://localhost:8000/api`).

---

## 🔑 Parcours de test recommandé

1. **Inscription** d'un **Recruteur** → Connexion
2. **Mon entreprise** → créer la fiche (statut `pending`)
3. ⚠️ **Validation admin** : dans `http://localhost:8000/admin/`, passez l'entreprise en **`active`**
   *(règle métier du backend : une offre ne peut être publiée que pour une entreprise active dont on est membre)*
4. **Créer une offre** → la publier
5. **Inscription** d'un **Candidat** → Connexion → **Postuler** à l'offre
6. Retour Recruteur → **Mes offres → Candidats** → **Accepter / Refuser**
7. Le Candidat voit le statut mis à jour dans **Mes candidatures**

---

## ☁️ Déploiement sur Vercel

Le projet inclut `vercel.json` (build Angular + rewrites SPA vers `index.html`).

1. **Backend** : déployez l'API Django (Render, Railway…) et ajoutez le domaine Vercel
   dans `CORS_ALLOWED_ORIGINS` (settings.py).
2. **Frontend** : renseignez l'URL du backend déployé dans
   `src/environments/environment.prod.ts` (`apiUrl` et `mediaUrl`).
3. Sur **Vercel** → *New Project* → importez ce dépôt :
   - **Root Directory** : `Frontend`
   - Build / Output sont déjà fournis par `vercel.json` :
     - Build : `npm run build`
     - Output : `dist/joboffer-frontend/browser`
4. Déployez. Le routing SPA fonctionne grâce aux *rewrites*.

> CLI : `cd Frontend && vercel --prod`

---

## 🧰 Stack
Angular 18 · Standalone Components · Signals · Reactive Forms · RxJS · CSS pur (design system maison).
