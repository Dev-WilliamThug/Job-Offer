"""
applications/urls.py

Plan des URLs de l'application applications.

On sépare clairement les espaces candidat, recruteur et admin :
- /mine/            → espace personnel candidat
- /job/<id>/        → espace recruteur par offre
- /<pk>/            → opérations sur une candidature précise
- /admin/           → espace administrateur
"""

from django.urls import path

from .views import (
    AdminApplicationDetailView,
    AdminApplicationListView,
    ApplyView,
    ApplicationStatusUpdateView,
    JobApplicationsView,
    MyCandidaciesView,
    MyCandidacyDetailView,
    RecruiterApplicationDetailView,
    WithdrawApplicationView,
)

app_name = "applications"

urlpatterns = [
    # ── Espace candidat ───────────────────────────────────
    path("apply/",                             ApplyView.as_view(),              name="apply"),
    path("mine/",                              MyCandidaciesView.as_view(),       name="my_applications"),
    path("mine/<int:pk>/",                     MyCandidacyDetailView.as_view(),   name="my_application_detail"),
    path("mine/<int:pk>/withdraw/",            WithdrawApplicationView.as_view(), name="withdraw"),

    # ── Espace recruteur ──────────────────────────────────
    path("job/<int:job_id>/",                  JobApplicationsView.as_view(),           name="job_applications"),
    path("<int:pk>/status/",                   ApplicationStatusUpdateView.as_view(),   name="application_status"),
    path("<int:pk>/recruiter/",                RecruiterApplicationDetailView.as_view(), name="recruiter_application_detail"),

    # ── Administration ────────────────────────────────────
    path("admin/",                             AdminApplicationListView.as_view(),   name="admin_application_list"),
    path("admin/<int:pk>/",                    AdminApplicationDetailView.as_view(), name="admin_application_detail"),
]