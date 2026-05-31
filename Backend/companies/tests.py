"""
companies/tests.py

Tests de l'application companies.
On couvre :
- La création d'entreprise (réservée aux recruteurs)
- La consultation publique
- La validation du statut (admin)
- Le suivi d'entreprise (candidats)
- Les permissions (qui peut faire quoi)
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from account.models import UserRole
from .models import Company, CompanyFollower, CompanyStatus

User = get_user_model()


def auth(client, user):
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def make_user(email, role):
    return User.objects.create_user(email=email, password="Pass123!", role=role)


def make_company(recruiter, status=CompanyStatus.ACTIVE, name="TechCorp"):
    return Company.objects.create(
        name=name,
        created_by=recruiter,
        status=status,
        city="Paris",
        sector="Tech",
    )


# ─────────────────────────────────────────────
class CompanyCreateTests(APITestCase):

    def setUp(self):
        self.recruiter  = make_user("rec@test.com", UserRole.RECRUITER)
        self.candidate  = make_user("cand@test.com", UserRole.CANDIDATE)
        self.url = reverse("companies:company_create")

    def test_recruiter_can_create_company(self):
        auth(self.client, self.recruiter)
        data = {"name": "MaCorp", "city": "Douala", "sector": "Finance"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        company = Company.objects.get(name="MaCorp")
        # Statut initial = PENDING
        self.assertEqual(company.status, CompanyStatus.PENDING)
        self.assertEqual(company.created_by, self.recruiter)

    def test_candidate_cannot_create_company(self):
        """Règle : seuls les recruteurs créent des entreprises."""
        auth(self.client, self.candidate)
        data = {"name": "CandidatCorp"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_create_company(self):
        response = self.client.post(self.url, {"name": "AnonCorp"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_duplicate_company_name_is_rejected(self):
        make_company(self.recruiter, name="UniqueName")
        auth(self.client, self.recruiter)
        data = {"name": "UniqueName"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_future_founded_year_is_rejected(self):
        auth(self.client, self.recruiter)
        data = {"name": "FutureCorp", "founded_year": 2099}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
class CompanyListDetailTests(APITestCase):

    def setUp(self):
        self.recruiter = make_user("rec2@test.com", UserRole.RECRUITER)
        self.active    = make_company(self.recruiter, CompanyStatus.ACTIVE, "ActiveCo")
        self.pending   = make_company(self.recruiter, CompanyStatus.PENDING, "PendingCo")

    def test_public_list_returns_only_active_companies(self):
        url = reverse("companies:company_list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.data]
        self.assertIn("ActiveCo", names)
        self.assertNotIn("PendingCo", names)

    def test_public_detail_works_for_active_company(self):
        url = reverse("companies:company_detail", kwargs={"slug": self.active.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_public_detail_returns_404_for_pending_company(self):
        url = reverse("companies:company_detail", kwargs={"slug": self.pending.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────────
class CompanyUpdateDeleteTests(APITestCase):

    def setUp(self):
        self.owner    = make_user("owner@test.com", UserRole.RECRUITER)
        self.other    = make_user("other@test.com", UserRole.RECRUITER)
        self.company  = make_company(self.owner)

    def test_owner_can_update_company(self):
        auth(self.client, self.owner)
        url = reverse("companies:company_update", kwargs={"slug": self.company.slug})
        response = self.client.patch(url, {"city": "Lyon"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_other_recruiter_cannot_update_company(self):
        """Règle R3 : un recruteur ne modifie QUE ses propres entreprises."""
        auth(self.client, self.other)
        url = reverse("companies:company_update", kwargs={"slug": self.company.slug})
        response = self.client.patch(url, {"city": "Lyon"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ─────────────────────────────────────────────
class AdminStatusTests(APITestCase):

    def setUp(self):
        self.admin    = make_user("admin@test.com", UserRole.ADMIN)
        self.recruiter = make_user("rec3@test.com", UserRole.RECRUITER)
        self.company  = make_company(self.recruiter, CompanyStatus.PENDING, "PendingCo2")

    def test_admin_can_activate_company(self):
        auth(self.client, self.admin)
        url = reverse("companies:admin_company_status", kwargs={"pk": self.company.pk})
        response = self.client.patch(url, {"status": "active"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        self.assertEqual(self.company.status, CompanyStatus.ACTIVE)

    def test_recruiter_cannot_change_status(self):
        auth(self.client, self.recruiter)
        url = reverse("companies:admin_company_status", kwargs={"pk": self.company.pk})
        response = self.client.patch(url, {"status": "active"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ─────────────────────────────────────────────
class FollowCompanyTests(APITestCase):

    def setUp(self):
        self.candidate = make_user("cand2@test.com", UserRole.CANDIDATE)
        self.recruiter = make_user("rec4@test.com", UserRole.RECRUITER)
        self.company   = make_company(self.recruiter)

    def test_candidate_can_follow_company(self):
        auth(self.client, self.candidate)
        url = reverse("companies:follow_company", kwargs={"slug": self.company.slug})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            CompanyFollower.objects.filter(user=self.candidate, company=self.company).exists()
        )

    def test_candidate_cannot_follow_twice(self):
        CompanyFollower.objects.create(user=self.candidate, company=self.company)
        auth(self.client, self.candidate)
        url = reverse("companies:follow_company", kwargs={"slug": self.company.slug})
        response = self.client.post(url)
        # On retourne 200 (déjà abonné) sans erreur, pas de doublon
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            CompanyFollower.objects.filter(user=self.candidate, company=self.company).count(), 1
        )

    def test_recruiter_cannot_follow_company(self):
        auth(self.client, self.recruiter)
        url = reverse("companies:follow_company", kwargs={"slug": self.company.slug})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_candidate_can_unfollow(self):
        CompanyFollower.objects.create(user=self.candidate, company=self.company)
        auth(self.client, self.candidate)
        url = reverse("companies:follow_company", kwargs={"slug": self.company.slug})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            CompanyFollower.objects.filter(user=self.candidate, company=self.company).exists()
        )