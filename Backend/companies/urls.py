"""
companies/urls.py

Plan de navigation de l'application companies.

Convention : on utilise le slug (ex: "google-france") plutôt que l'id
dans les URLs publiques — c'est plus lisible et plus SEO-friendly.
Pour les actions admin qui ciblent un objet précis, on utilise l'id (pk).
"""

from django.urls import path

from .views import (
    AdminCompanyListView,
    AdminCompanyStatusView,
    CompanyCreateView,
    CompanyDeleteView,
    CompanyDetailView,
    CompanyListView,
    CompanyUpdateView,
    FollowCompanyView,
    MyCompaniesView,
    MyFollowedCompaniesView,
)

app_name = "companies"

urlpatterns = [
    # ── Lecture publique ──────────────────────────────
    path("", CompanyListView.as_view(), name="company_list"),

    # ── Actions recruteur ─────────────────────────────
    path("create/", CompanyCreateView.as_view(), name="company_create"),
    path("mine/", MyCompaniesView.as_view(), name="my_companies"),
    path("<slug:slug>/edit/", CompanyUpdateView.as_view(), name="company_update"),
    path("<slug:slug>/", CompanyDetailView.as_view(), name="company_detail"),
    path("<slug:slug>/delete/", CompanyDeleteView.as_view(), name="company_delete"),# ── Lecture publique ──────────────────────────────

    # ── Suivi (candidats) ─────────────────────────────
    path("<slug:slug>/follow/", FollowCompanyView.as_view(), name="follow_company"),
    path("following/", MyFollowedCompaniesView.as_view(), name="my_followed_companies"),

    # ── Administration ────────────────────────────────
    path("admin/", AdminCompanyListView.as_view(), name="admin_company_list"),
    path("admin/<int:pk>/status/", AdminCompanyStatusView.as_view(), name="admin_company_status"),
]