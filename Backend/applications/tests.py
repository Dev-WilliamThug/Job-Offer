"""
applications/tests.py

Tests de l'application applications.
Cette suite couvre les 8 règles métier du cahier des charges :

R1 : Un candidat ne peut pas postuler deux fois à la même offre.
R2 : Seuls les recruteurs créent des offres          → testé dans jobs/tests.py
R3 : Un recruteur ne modifie QUE ses offres          → testé dans jobs/tests.py
R4 : Un candidat ne voit QUE ses candidatures.
R5 : Une offre expirée n'accepte plus de candidatures.
R6 : Le salaire doit être positif                    → testé dans jobs/tests.py
R7 : La date limite doit être future                 → testé dans jobs/tests.py
R8 : Un recruteur ne peut pas postuler à une offre.
"""

"""
applications/tests.py
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from account.models import UserRole, CandidateProfile, RecruiterProfile
from companies.models import Company, CompanyStatus
from jobs.models import JobOffer, JobStatus
from .models import Application, ApplicationStatus

User = get_user_model()


# ── Helpers ────────────────────────────────────────────────────────────────

def auth(client, user):
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def make_candidate(email):
    user = User.objects.create_user(
        email=email, password="Pass123!", role=UserRole.CANDIDATE
    )
    CandidateProfile.objects.get_or_create(user=user)
    return user


def make_recruiter(email):
    user = User.objects.create_user(
        email=email, password="Pass123!", role=UserRole.RECRUITER
    )
    RecruiterProfile.objects.get_or_create(user=user)
    return user


def make_company(recruiter, name="Corp"):
    return Company.objects.create(
        name=name, created_by=recruiter, status=CompanyStatus.ACTIVE
    )


def make_job(recruiter, company, days=30, pub=True, title="Dev"):
    return JobOffer.objects.create(
        title=title,
        description="Test.",
        company=company,
        recruiter=recruiter,
        status=JobStatus.PUBLISHED if pub else JobStatus.DRAFT,
        deadline=timezone.now() + timedelta(days=days),
    )


def make_application(candidate, job, status_val=ApplicationStatus.PENDING):
    return Application.objects.create(
        candidate=candidate,
        job_offer=job,
        status=status_val,
    )


# ── R8 : Un recruteur ne peut pas postuler ─────────────────────────────────

class Rule8Tests(APITestCase):

    def setUp(self):
        self.recruiter = make_recruiter("rec@test.com")
        self.company   = make_company(self.recruiter)
        self.job       = make_job(self.recruiter, self.company)
        self.url       = reverse("applications:apply")

    def test_recruiter_cannot_apply(self):
        auth(self.client, self.recruiter)
        response = self.client.post(self.url, {"job_offer": self.job.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_apply(self):
        # Pas de token → 401
        response = self.client.post(self.url, {"job_offer": self.job.id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ── R1 : Pas de double candidature ────────────────────────────────────────

class Rule1Tests(APITestCase):

    def setUp(self):
        self.recruiter = make_recruiter("rec2@test.com")
        self.candidate = make_candidate("cand@test.com")
        self.company   = make_company(self.recruiter)
        self.job       = make_job(self.recruiter, self.company)
        self.url       = reverse("applications:apply")

    def test_candidate_can_apply_once(self):
        auth(self.client, self.candidate)
        response = self.client.post(self.url, {"job_offer": self.job.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_candidate_cannot_apply_twice(self):
        """R1 : Deuxième candidature à la même offre → 400."""
        make_application(self.candidate, self.job)
        auth(self.client, self.candidate)
        response = self.client.post(self.url, {"job_offer": self.job.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_candidate_can_apply_to_different_jobs(self):
        """R1 : Offres différentes → pas de problème."""
        job2 = make_job(self.recruiter, self.company, title="Dev 2")
        make_application(self.candidate, self.job)
        auth(self.client, self.candidate)
        response = self.client.post(self.url, {"job_offer": job2.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


# ── R5 : Offre expirée → plus de candidature ──────────────────────────────

class Rule5Tests(APITestCase):

    def setUp(self):
        self.recruiter = make_recruiter("rec3@test.com")
        self.candidate = make_candidate("cand2@test.com")
        self.company   = make_company(self.recruiter)
        self.url       = reverse("applications:apply")

    def test_cannot_apply_to_expired_job(self):
        """R5 : Deadline dépassée → 400."""
        expired_job = make_job(self.recruiter, self.company, days=-1)
        auth(self.client, self.candidate)
        response = self.client.post(self.url, {"job_offer": expired_job.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_apply_to_closed_job(self):
        """R5 : Statut CLOSED → 400."""
        closed_job = make_job(self.recruiter, self.company, pub=False)
        closed_job.status = JobStatus.CLOSED
        closed_job.save()
        auth(self.client, self.candidate)
        response = self.client.post(self.url, {"job_offer": closed_job.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ── R4 : Un candidat voit UNIQUEMENT ses candidatures ─────────────────────

class Rule4Tests(APITestCase):

    def setUp(self):
        self.recruiter  = make_recruiter("rec4@test.com")
        self.candidate1 = make_candidate("c1@test.com")
        self.candidate2 = make_candidate("c2@test.com")
        self.company    = make_company(self.recruiter)
        self.job        = make_job(self.recruiter, self.company)
        self.app1       = make_application(self.candidate1, self.job)
        job2            = make_job(self.recruiter, self.company, title="Autre poste")
        self.app2       = make_application(self.candidate2, job2)

    def test_candidate_sees_only_own_applications(self):
        """R4 : /mine/ ne retourne que les candidatures du candidat connecté."""
        auth(self.client, self.candidate1)
        url = reverse("applications:my_applications")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [a["id"] for a in response.data]
        self.assertIn(self.app1.id, ids)
        self.assertNotIn(self.app2.id, ids)

    def test_candidate_cannot_access_other_application_detail(self):
        """R4 : Candidat ne peut pas accéder à la candidature d'un autre."""
        auth(self.client, self.candidate1)
        url = reverse("applications:my_application_detail", kwargs={"pk": self.app2.pk})
        response = self.client.get(url)
        self.assertIn(
            response.status_code,
            [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        )


# ── Cycle statut recruteur ─────────────────────────────────────────────────

class ApplicationStatusTests(APITestCase):

    def setUp(self):
        self.recruiter = make_recruiter("rec5@test.com")
        self.candidate = make_candidate("c3@test.com")
        self.other_rec = make_recruiter("rec6@test.com")
        self.company   = make_company(self.recruiter)
        self.job       = make_job(self.recruiter, self.company)
        self.app       = make_application(self.candidate, self.job)

    def test_recruiter_can_update_status(self):
        auth(self.client, self.recruiter)
        url = reverse("applications:application_status", kwargs={"pk": self.app.pk})
        response = self.client.patch(url, {"status": "reviewing"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.app.refresh_from_db()
        self.assertEqual(self.app.status, ApplicationStatus.REVIEWING)

    def test_recruiter_can_accept_application(self):
        auth(self.client, self.recruiter)
        url = reverse("applications:application_status", kwargs={"pk": self.app.pk})
        response = self.client.patch(url, {"status": "accepted"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_other_recruiter_cannot_update_status(self):
        auth(self.client, self.other_rec)
        url = reverse("applications:application_status", kwargs={"pk": self.app.pk})
        response = self.client.patch(url, {"status": "accepted"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_recruiter_cannot_set_withdrawn_status(self):
        auth(self.client, self.recruiter)
        url = reverse("applications:application_status", kwargs={"pk": self.app.pk})
        response = self.client.patch(url, {"status": "withdrawn"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ── Retrait de candidature ─────────────────────────────────────────────────

class WithdrawTests(APITestCase):

    def setUp(self):
        self.recruiter = make_recruiter("rec7@test.com")
        self.candidate = make_candidate("c4@test.com")
        self.company   = make_company(self.recruiter)
        self.job       = make_job(self.recruiter, self.company)
        self.app       = make_application(self.candidate, self.job)

    def test_candidate_can_withdraw_pending_application(self):
        auth(self.client, self.candidate)
        url = reverse("applications:withdraw", kwargs={"pk": self.app.pk})
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.app.refresh_from_db()
        self.assertEqual(self.app.status, ApplicationStatus.WITHDRAWN)

    def test_cannot_withdraw_accepted_application(self):
        self.app.status = ApplicationStatus.ACCEPTED
        self.app.save()
        auth(self.client, self.candidate)
        url = reverse("applications:withdraw", kwargs={"pk": self.app.pk})
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)