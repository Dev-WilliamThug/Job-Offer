from django.shortcuts import render

# Create your views here.
"""
account/views.py

Les vues sont les "guichets" de notre API.
Analogie : Dans une mairie, chaque guichet gère un type de demande —
état civil, permis de construire, etc. Chaque vue gère un type de requête.

On utilise des APIView pour les cas simples et des GenericAPIView/mixins
pour les cas CRUD standards (moins de code, même résultat).
"""

from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CandidateProfile, RecruiterProfile, UserRole
from .permissions import IsAdminUser, IsCandidate, IsOwnerOrAdmin, IsRecruiter
from .serializers import (
    CandidateProfileSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    RecruiterProfileSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

User = get_user_model()


# ──────────────────────────────────────────────
# Authentification
# ──────────────────────────────────────────────

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Connexion — retourne access + refresh token.
    On surcharge juste pour utiliser notre serializer enrichi (role, email…).
    """
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """
    Inscription d'un nouvel utilisateur.
    AllowAny : pas besoin d'être connecté pour créer un compte.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Compte créé avec succès.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ──────────────────────────────────────────────
# Profil utilisateur connecté
# ──────────────────────────────────────────────

class MeView(APIView):
    """
    GET  /api/account/me/  → renvoie les infos de l'utilisateur connecté
    PUT  /api/account/me/  → met à jour prénom / nom
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """
    POST /api/account/change-password/
    L'utilisateur doit fournir son ancien mot de passe pour en définir un nouveau.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Mot de passe modifié avec succès."})


# ──────────────────────────────────────────────
# Profil candidat
# ──────────────────────────────────────────────

class CandidateProfileView(APIView):
    """
    GET  /api/account/profile/candidate/  → lire son profil
    PUT  /api/account/profile/candidate/  → mettre à jour son profil

    Seul un candidat peut accéder à cette vue (IsCandidate).
    """
    permission_classes = [IsAuthenticated, IsCandidate]

    def _get_profile(self, user):
        """Récupère ou crée le profil candidat (sécurité si création manquée)."""
        profile, _ = CandidateProfile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        profile = self._get_profile(request.user)
        serializer = CandidateProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        profile = self._get_profile(request.user)
        serializer = CandidateProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ──────────────────────────────────────────────
# Profil recruteur
# ──────────────────────────────────────────────

class RecruiterProfileView(APIView):
    """
    GET  /api/account/profile/recruiter/  → lire son profil
    PUT  /api/account/profile/recruiter/  → mettre à jour son profil
    """
    permission_classes = [IsAuthenticated, IsRecruiter]

    def _get_profile(self, user):
        profile, _ = RecruiterProfile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        profile = self._get_profile(request.user)
        serializer = RecruiterProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        profile = self._get_profile(request.user)
        serializer = RecruiterProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ──────────────────────────────────────────────
# Vues Admin
# ──────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    """
    GET /api/account/admin/users/
    Liste tous les utilisateurs — réservé aux admins.
    """
    queryset = User.objects.all().order_by("-created_at")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/account/admin/users/<id>/  → voir un utilisateur
    PATCH /api/account/admin/users/<id>/  → modifier (ex: désactiver)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return UserUpdateSerializer
        return UserSerializer