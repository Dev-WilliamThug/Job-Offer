"""
jobs/tests.py
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from account.models import RecruiterProfile, CandidateProfile, UserRole
from companies.models import Company, CompanyStatus
from .models import JobOffer, JobStatus

User = get_user_model()


# ── Helpers ────────────────────────────────────────────────────────────────

def auth(client, user):
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def make_candidate(email):
    """Crée un candidat avec son CandidateProfile."""
    user = User.objects.create_user(
        email=email, password="Pass123!", role=UserRole.CANDIDATE
    )
    CandidateProfile.objects.get_or_create(user=user)
    return user


def make_company(recruiter, name="TechCorp", co_status=CompanyStatus.ACTIVE):
    return Company.objects.create(
        name=name, created_by=recruiter, status=co_status
    )


def make_recruiter(email, company=None):
    """
    Crée un recruteur ET lie son RecruiterProfile à une entreprise.
    Le paramètre company doit être une instance Company (pas un rôle).
    """
    user = User.objects.create_user(
        email=email, password="Pass123!", role=UserRole.RECRUITER
    )
    profile, _ = RecruiterProfile.objects.get_or_create(user=user)
    if company is not None:
        profile.company = company
        profile.save()
    return user


def make_job(recruiter, company, title="Dev Backend", pub=True, days=30):
    return JobOffer.objects.create(
        title=title,
        description="Description du poste.",
        company=company,
        recruiter=recruiter,
        status=JobStatus.PUBLISHED if pub else JobStatus.DRAFT,
        deadline=timezone.now() + timedelta(days=days),
    )


# ── Tests création ─────────────────────────────────────────────────────────

class JobCreateTests(APITestCase):

    def setUp(self):
        # 1. Créer le recruteur sans entreprise d'abord
        self.recruiter = User.objects.create_user(
            email="rec@test.com", password="Pass123!", role=UserRole.RECRUITER
        )
        # 2. Créer l'entreprise (liée au recruteur)
        self.company = make_company(self.recruiter)
        # 3. Lier le RecruiterProfile à l'entreprise
        profile, _ = RecruiterProfile.objects.get_or_create(user=self.recruiter)
        profile.company = self.company
        profile.save()
        # 4. Candidat
        self.candidate = make_candidate("cand@test.com")
        self.url = reverse("jobs:job_create")

    def _payload(self, **kwargs):
        defaults = {
            "title":         "Développeur Django",
            "description":   "Poste de dev backend.",
            "company":       self.company.id,
            "contract_type": "cdi",
            "deadline":      (timezone.now() + timedelta(days=30)).isoformat(),
        }
        defaults.update(kwargs)
        return defaults

    # R2
    def test_recruiter_can_create_job(self):
        auth(self.client, self.recruiter)
        response = self.client.post(self.url, self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # R2
    def test_candidate_cannot_create_job(self):
        auth(self.client, self.candidate)
        response = self.client.post(self.url, self._payload())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # R2 — anonyme → 401
    def test_anonymous_cannot_create_job(self):
        response = self.client.post(self.url, self._payload())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # R7
    def test_past_deadline_is_rejected(self):
        auth(self.client, self.recruiter)
        past = (timezone.now() - timedelta(days=1)).isoformat()
        response = self.client.post(self.url, self._payload(deadline=past))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # R6
    def test_negative_salary_is_rejected(self):
        auth(self.client, self.recruiter)
        response = self.client.post(self.url, self._payload(salary_min=-500))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_salary_min_greater_than_max_is_rejected(self):
        auth(self.client, self.recruiter)
        response = self.client.post(
            self.url, self._payload(salary_min=500000, salary_max=200000)
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ── Tests lecture publique ─────────────────────────────────────────────────

class JobListDetailTests(APITestCase):

    def setUp(self):
        self.recruiter = User.objects.create_user(
            email="rec2@test.com", password="Pass123!", role=UserRole.RECRUITER
        )
        self.company   = make_company(self.recruiter)
        self.job_pub   = make_job(self.recruiter, self.company, "Offre publique", pub=True)
        self.job_draft = make_job(self.recruiter, self.company, "Brouillon",      pub=False)

    def test_public_list_returns_only_published(self):
        url = reverse("jobs:job_list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [j["title"] for j in response.data]
        self.assertIn("Offre publique", titles)
        self.assertNotIn("Brouillon", titles)

    def test_public_detail_for_published_job(self):
        url = reverse("jobs:job_detail", kwargs={"slug": self.job_pub.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_public_detail_not_found_for_draft(self):
        url = reverse("jobs:job_detail", kwargs={"slug": self.job_draft.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_search_filter_works(self):
        url = reverse("jobs:job_list") + "?search=publique"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


# ── Tests modification / suppression ──────────────────────────────────────

class JobUpdateDeleteTests(APITestCase):

    def setUp(self):
        # owner : recruteur propriétaire de l'offre
        self.owner = User.objects.create_user(
            email="owner@test.com", password="Pass123!", role=UserRole.RECRUITER
        )
        self.company = make_company(self.owner)
        profile, _ = RecruiterProfile.objects.get_or_create(user=self.owner)
        profile.company = self.company
        profile.save()

        # other : un autre recruteur (sans lien avec cette offre)
        self.other = User.objects.create_user(
            email="other@test.com", password="Pass123!", role=UserRole.RECRUITER
        )
        self.job = make_job(self.owner, self.company)

    # R3
    def test_owner_can_update_job(self):
        auth(self.client, self.owner)
        url = reverse("jobs:job_update", kwargs={"slug": self.job.slug})
        response = self.client.patch(url, {"title": "Nouveau titre"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # R3
    def test_other_recruiter_cannot_update_job(self):
        auth(self.client, self.other)
        url = reverse("jobs:job_update", kwargs={"slug": self.job.slug})
        response = self.client.patch(url, {"title": "Intrusion"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_job(self):
        auth(self.client, self.owner)
        url = reverse("jobs:job_delete", kwargs={"slug": self.job.slug})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


# ── Tests statut ───────────────────────────────────────────────────────────

class JobStatusTests(APITestCase):

    def setUp(self):
        self.recruiter = User.objects.create_user(
            email="rec3@test.com", password="Pass123!", role=UserRole.RECRUITER
        )
        self.company = make_company(self.recruiter)
        profile, _ = RecruiterProfile.objects.get_or_create(user=self.recruiter)
        profile.company = self.company
        profile.save()
        self.job = make_job(self.recruiter, self.company, pub=False)  # DRAFT

    def test_recruiter_can_publish_job(self):
        auth(self.client, self.recruiter)
        url = reverse("jobs:job_status", kwargs={"slug": self.job.slug})
        response = self.client.patch(url, {"status": "published"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, JobStatus.PUBLISHED)

    def test_closed_job_cannot_be_republished(self):
        self.job.status = JobStatus.CLOSED
        self.job.save()
        auth(self.client, self.recruiter)
        url = reverse("jobs:job_status", kwargs={"slug": self.job.slug})
        response = self.client.patch(url, {"status": "published"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ── Tests propriété is_expired ─────────────────────────────────────────────

class JobExpiryTests(APITestCase):

    def setUp(self):
        self.recruiter = User.objects.create_user(
            email="rec4@test.com", password="Pass123!", role=UserRole.RECRUITER
        )
        self.company = make_company(self.recruiter)

    def test_future_deadline_not_expired(self):
        job = make_job(self.recruiter, self.company, days=10)
        self.assertFalse(job.is_expired)
        self.assertTrue(job.is_open)

    def test_past_deadline_is_expired(self):
        job = make_job(self.recruiter, self.company, days=-1)
        self.assertTrue(job.is_expired)
        self.assertFalse(job.is_open)