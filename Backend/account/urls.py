"""
account/urls.py

Le fichier d'URLs est le "plan du quartier" : il indique à Django
quelle vue appeler selon l'adresse demandée.

Analogie : C'est comme un interphone d'immeuble.
Tu tapes le numéro d'appartement (l'URL) → ça sonne chez la bonne
personne (la bonne vue).
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminUserDetailView,
    AdminUserListView,
    CandidateProfileView,
    ChangePasswordView,
    CustomTokenObtainPairView,
    MeView,
    RecruiterProfileView,
    RegisterView,
)

app_name = "account"

urlpatterns = [
    # ── Authentification ──────────────────────────────
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ── Utilisateur connecté ──────────────────────────
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),

    # ── Profils ───────────────────────────────────────
    path("profile/candidate/", CandidateProfileView.as_view(), name="candidate_profile"),
    path("profile/recruiter/", RecruiterProfileView.as_view(), name="recruiter_profile"),

    # ── Administration ────────────────────────────────
    path("admin/users/", AdminUserListView.as_view(), name="admin_user_list"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin_user_detail"),
]