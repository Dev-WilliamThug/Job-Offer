"""
companies/tests.py
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from account.models import UserRole, CandidateProfile, RecruiterProfile
from .models import Company, CompanyFollower, CompanyStatus

User = get_user_model()


# ── Helpers ────────────────────────────────────────────────────────────────

def auth(client, user):
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def make_recruiter(email):
    """Crée un recruteur avec son RecruiterProfile vide."""
    user = User.objects.create_user(
        email=email, password="Pass123!", role=UserRole.RECRUITER
    )
    RecruiterProfile.objects.get_or_create(user=user)
    return user


def make_candidate(email):
    """Crée un candidat avec son CandidateProfile."""
    user = User.objects.create_user(
        email=email, password="Pass123!", role=UserRole.CANDIDATE
    )
    CandidateProfile.objects.get_or_create(user=user)
    return user


def make_admin(email):
    return User.objects.create_user(
        email=email, password="Pass123!", role=UserRole.ADMIN, is_staff=True
    )


def make_company(recruiter, co_status=CompanyStatus.ACTIVE, name="TechCorp"):
    return Company.objects.create(
        name=name,
        created_by=recruiter,
        status=co_status,
        city="Yaoundé",
        sector="Tech",
    )


# ── Création ───────────────────────────────────────────────────────────────

class CompanyCreateTests(APITestCase):

    def setUp(self):
        self.recruiter = make_recruiter("rec@test.com")
        self.candidate = make_candidate("cand@test.com")
        self.url = reverse("companies:company_create")

    def test_recruiter_can_create_company(self):
        auth(self.client, self.recruiter)
        data = {"name": "MaCorp", "city": "Douala", "sector": "Finance"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        company = Company.objects.get(name="MaCorp")
        self.assertEqual(company.status, CompanyStatus.PENDING)
        self.assertEqual(company.created_by, self.recruiter)

    def test_candidate_cannot_create_company(self):
        auth(self.client, self.candidate)
        response = self.client.post(self.url, {"name": "CandidatCorp"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_create_company(self):
        # Sans authentification → 401 (pas de token fourni)
        response = self.client.post(self.url, {"name": "AnonCorp"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_duplicate_company_name_is_rejected(self):
        make_company(self.recruiter, name="UniqueName")
        auth(self.client, self.recruiter)
        response = self.client.post(self.url, {"name": "UniqueName"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_future_founded_year_is_rejected(self):
        auth(self.client, self.recruiter)
        response = self.client.post(self.url, {"name": "FutureCorp", "founded_year": 2099})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ── Lecture publique ───────────────────────────────────────────────────────

class CompanyListDetailTests(APITestCase):

    def setUp(self):
        self.recruiter = make_recruiter("rec2@test.com")
        self.active    = make_company(self.recruiter, CompanyStatus.ACTIVE,  "ActiveCo")
        self.pending   = make_company(self.recruiter, CompanyStatus.PENDING, "PendingCo")

    def test_public_list_returns_only_active_companies(self):
        url = reverse("companies:company_list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.data]
        self.assertIn("ActiveCo",   names)
        self.assertNotIn("PendingCo", names)

    def test_public_detail_works_for_active_company(self):
        url = reverse("companies:company_detail", kwargs={"slug": self.active.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_public_detail_returns_404_for_pending_company(self):
        url = reverse("companies:company_detail", kwargs={"slug": self.pending.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ── Modification / suppression ─────────────────────────────────────────────

class CompanyUpdateDeleteTests(APITestCase):

    def setUp(self):
        self.owner   = make_recruiter("owner@test.com")
        self.other   = make_recruiter("other@test.com")
        self.company = make_company(self.owner)

    def test_owner_can_update_company(self):
        auth(self.client, self.owner)
        url = reverse("companies:company_update", kwargs={"slug": self.company.slug})
        response = self.client.patch(url, {"city": "Lyon"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_other_recruiter_cannot_update_company(self):
        auth(self.client, self.other)
        url = reverse("companies:company_update", kwargs={"slug": self.company.slug})
        response = self.client.patch(url, {"city": "Lyon"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ── Admin statut ───────────────────────────────────────────────────────────

class AdminStatusTests(APITestCase):

    def setUp(self):
        self.admin     = make_admin("admin@test.com")
        self.recruiter = make_recruiter("rec3@test.com")
        self.company   = make_company(self.recruiter, CompanyStatus.PENDING, "PendingCo2")

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


# ── Suivi entreprise ───────────────────────────────────────────────────────

class FollowCompanyTests(APITestCase):

    def setUp(self):
        self.candidate = make_candidate("cand2@test.com")
        self.recruiter = make_recruiter("rec4@test.com")
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