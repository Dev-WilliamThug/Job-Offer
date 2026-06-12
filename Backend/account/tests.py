"""
account/tests.py

Les tests sont le "banc d'essai" avant de mettre en production.
Analogie : Avant de lancer une voiture sur la route, on la teste
sur un circuit fermé. Les tests font pareil avec le code.

On couvre les cas nominaux (ça marche) ET les cas d'erreur (ça échoue
correctement).
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CandidateProfile, RecruiterProfile, UserRole

User = get_user_model()


def get_tokens_for_user(user):
    """Helper : génère un token JWT pour un utilisateur de test."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


class RegisterTests(APITestCase):
    """Tests de l'inscription."""

    def setUp(self):
        self.url = reverse("account:register")

    def test_register_candidate_success(self):
        data = {
            "email": "candidat@test.com",
            "first_name": "Jean",
            "last_name": "Dupont",
            "role": UserRole.CANDIDATE,
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="candidat@test.com").exists())
        # Le profil candidat doit être créé automatiquement
        user = User.objects.get(email="candidat@test.com")
        self.assertTrue(CandidateProfile.objects.filter(user=user).exists())

    def test_register_recruiter_creates_recruiter_profile(self):
        data = {
            "email": "recruteur@test.com",
            "first_name": "Marie",
            "last_name": "Martin",
            "role": UserRole.RECRUITER,
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="recruteur@test.com")
        self.assertTrue(RecruiterProfile.objects.filter(user=user).exists())

    def test_register_with_mismatched_passwords_fails(self):
        data = {
            "email": "test@test.com",
            "role": UserRole.CANDIDATE,
            "password": "StrongPass123!",
            "password_confirm": "WrongPass456!",
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_as_admin_is_forbidden(self):
        """Règle : on ne peut pas s'inscrire en tant qu'admin via l'API."""
        data = {
            "email": "admin@test.com",
            "role": UserRole.ADMIN,
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email_fails(self):
        User.objects.create_user(email="exist@test.com", password="Pass123!")
        data = {
            "email": "exist@test.com",
            "role": UserRole.CANDIDATE,
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase):
    """Tests de la connexion JWT."""

    def setUp(self):
        self.url = reverse("account:login")
        self.user = User.objects.create_user(
            email="user@test.com", password="StrongPass123!", role=UserRole.CANDIDATE
        )

    def test_login_success_returns_tokens(self):
        response = self.client.post(self.url, {"email": "user@test.com", "password": "StrongPass123!"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_wrong_password_fails(self):
        response = self.client.post(self.url, {"email": "user@test.com", "password": "WrongPass!"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MeViewTests(APITestCase):
    """Tests de l'endpoint /me/."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="me@test.com",
            password="Pass123!",
            first_name="Alice",
            role=UserRole.CANDIDATE,
        )
        token = get_tokens_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.url = reverse("account:me")

    def test_get_me_returns_user_data(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "me@test.com")

    def test_unauthenticated_request_is_rejected(self):
        self.client.credentials()  # supprime le token
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PermissionTests(APITestCase):
    """Tests des permissions métier."""

    def setUp(self):
        self.candidate = User.objects.create_user(
            email="cand@test.com", password="Pass123!", role=UserRole.CANDIDATE
        )
        self.recruiter = User.objects.create_user(
            email="rec@test.com", password="Pass123!", role=UserRole.RECRUITER
        )

    def _auth(self, user):
        token = get_tokens_for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_candidate_cannot_access_recruiter_profile_endpoint(self):
        self._auth(self.candidate)
        url = reverse("account:recruiter_profile")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_recruiter_cannot_access_candidate_profile_endpoint(self):
        self._auth(self.recruiter)
        url = reverse("account:candidate_profile")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)