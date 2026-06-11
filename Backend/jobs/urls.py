"""
jobs/urls.py

Plan des URLs de l'application jobs.

Convention cohérente avec companies/ :
- Slug dans les URLs publiques (/api/jobs/<slug>/)
- /mine/        → offres du recruteur connecté
- /admin/       → espace administrateur
- /company/<company_slug>/  → offres filtrées par entreprise
"""

from django.urls import path

from .views import (
    AdminJobOfferDetailView,
    AdminJobOfferListView,
    CompanyJobOffersView,
    JobOfferCreateView,
    JobOfferDeleteView,
    JobOfferDetailView,
    JobOfferListView,
    JobOfferUpdateView,
    JobStatusUpdateView,
    MyJobOffersView,
)

app_name = "jobs"

urlpatterns = [
    # ── Lecture publique ──────────────────────────────────
    path("",                                 JobOfferListView.as_view(),     name="job_list"),

    # ── Actions recruteur (routes fixes avant <slug>) ─────
    path("create/",                          JobOfferCreateView.as_view(),   name="job_create"),
    path("mine/",                            MyJobOffersView.as_view(),      name="my_jobs"),
    path("company/<slug:company_slug>/",     CompanyJobOffersView.as_view(), name="company_jobs"),

    # ── Administration ────────────────────────────────────
    path("admin/",                           AdminJobOfferListView.as_view(),   name="admin_job_list"),
    path("admin/<int:pk>/",                  AdminJobOfferDetailView.as_view(), name="admin_job_detail"),

    # ── Détail / modification par slug ────────────────────
    path("<slug:slug>/edit/",                JobOfferUpdateView.as_view(),   name="job_update"),
    path("<slug:slug>/delete/",              JobOfferDeleteView.as_view(),   name="job_delete"),
    path("<slug:slug>/status/",              JobStatusUpdateView.as_view(),  name="job_status"),
    path("<slug:slug>/",                     JobOfferDetailView.as_view(),   name="job_detail"),
]