"""
applications/views.py

Analogie : Ces vues sont les guichets d'un service RH.
- Guichet candidat  : déposer, consulter, retirer sa candidature
- Guichet recruteur : voir les dossiers reçus, changer leur statut
- Guichet admin     : vue globale sur toutes les candidatures

La séparation est nette : candidat et recruteur n'ont jamais accès
aux mêmes endpoints pour les mêmes candidatures.
"""

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from account.permissions import IsAdminUser, IsCandidate, IsRecruiter
from jobs.models import JobOffer
from .models import Application, ApplicationStatus
from .permissions import IsApplicationOwner, IsJobRecruiterOrAdmin
from .serializers import (
    AdminApplicationSerializer,
    ApplicationCandidateSerializer,
    ApplicationCreateSerializer,
    ApplicationRecruiterSerializer,
    ApplicationStatusSerializer,
    ApplicationWithdrawSerializer,
)


# ──────────────────────────────────────────────────────────
# Espace candidat
# ──────────────────────────────────────────────────────────

class ApplyView(APIView):
    """
    POST /api/applications/apply/
    Crée une candidature.

    R8 : Seuls les candidats peuvent postuler (IsCandidate).
    R1 : Pas de double candidature (vérifié dans le serializer).
    R5 : L'offre doit être ouverte (vérifié dans le serializer).
    """
    permission_classes = [IsCandidate]

    def post(self, request):
        serializer = ApplicationCreateSerializer(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        return Response(
            {
                "message": "Votre candidature a été soumise avec succès.",
                "application": ApplicationCandidateSerializer(application).data,
            },
            status=status.HTTP_201_CREATED,
        )


class MyCandidaciesView(generics.ListAPIView):
    """
    GET /api/applications/mine/
    R4 : Retourne UNIQUEMENT les candidatures du candidat connecté.

    Filtre optionnel : ?status=pending|reviewing|accepted|rejected|withdrawn
    """
    serializer_class   = ApplicationCandidateSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        qs = Application.objects.filter(
            candidate=self.request.user
        ).select_related("job_offer", "job_offer__company")

        if s := self.request.query_params.get("status"):
            qs = qs.filter(status=s)

        return qs.order_by("-applied_at")


class MyCandidacyDetailView(generics.RetrieveAPIView):
    """
    GET /api/applications/mine/<pk>/
    Détail d'une candidature du candidat connecté.
    R4 : IsApplicationOwner garantit qu'il ne voit que les siennes.
    """
    serializer_class   = ApplicationCandidateSerializer
    permission_classes = [IsApplicationOwner]

    def get_queryset(self):
        return Application.objects.filter(
            candidate=self.request.user
        ).select_related("job_offer", "job_offer__company")


class WithdrawApplicationView(APIView):
    """
    PATCH /api/applications/mine/<pk>/withdraw/
    Le candidat retire sa candidature (passe au statut WITHDRAWN).

    Seul possible si la candidature est encore PENDING ou REVIEWING.
    """
    permission_classes = [IsCandidate, IsApplicationOwner]

    def patch(self, request, pk):
        application = get_object_or_404(Application, pk=pk)
        self.check_object_permissions(request, application)

        serializer = ApplicationWithdrawSerializer(
            application, data={}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "message": "Votre candidature a été retirée.",
                "application": ApplicationCandidateSerializer(application).data,
            }
        )


# ──────────────────────────────────────────────────────────
# Espace recruteur
# ──────────────────────────────────────────────────────────

class JobApplicationsView(generics.ListAPIView):
    """
    GET /api/applications/job/<job_id>/
    Liste toutes les candidatures reçues sur une offre donnée.

    Seul le recruteur propriétaire de l'offre peut y accéder.
    Filtre optionnel : ?status=pending|reviewing|accepted|rejected
    """
    serializer_class   = ApplicationRecruiterSerializer
    permission_classes = [IsRecruiter]

    def get_queryset(self):
        job_id = self.kwargs["job_id"]
        # Vérifie que l'offre appartient bien au recruteur connecté
        job = get_object_or_404(
            JobOffer,
            pk=job_id,
            recruiter=self.request.user
        )
        qs = Application.objects.filter(
            job_offer=job
        ).select_related("candidate", "candidate__candidate_profile")

        if s := self.request.query_params.get("status"):
            qs = qs.filter(status=s)

        return qs.order_by("-applied_at")


class ApplicationStatusUpdateView(APIView):
    """
    PATCH /api/applications/<pk>/status/
    Le recruteur change le statut d'une candidature et peut ajouter une note.

    Transitions autorisées :
    PENDING → REVIEWING → ACCEPTED | REJECTED
    WITHDRAWN → (aucun changement possible)

    IsJobRecruiterOrAdmin garantit que seul le recruteur de l'offre
    (ou un admin) peut agir sur cette candidature.
    """
    permission_classes = [IsJobRecruiterOrAdmin]

    def patch(self, request, pk):
        application = get_object_or_404(Application, pk=pk)
        self.check_object_permissions(request, application)

        serializer = ApplicationStatusSerializer(
            application, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "message": f"Statut mis à jour : {application.get_status_display()}",
                "application": ApplicationRecruiterSerializer(application).data,
            }
        )


class RecruiterApplicationDetailView(generics.RetrieveAPIView):
    """
    GET /api/applications/<pk>/recruiter/
    Détail d'une candidature vue par le recruteur (avec note interne).
    """
    serializer_class   = ApplicationRecruiterSerializer
    permission_classes = [IsJobRecruiterOrAdmin]
    queryset           = Application.objects.all().select_related(
        "candidate", "candidate__candidate_profile", "job_offer"
    )


# ──────────────────────────────────────────────────────────
# Administration
# ──────────────────────────────────────────────────────────

class AdminApplicationListView(generics.ListAPIView):
    """
    GET /api/applications/admin/
    Liste toutes les candidatures — admin seulement.
    Filtres : ?status= ?job= ?candidate=
    """
    serializer_class   = AdminApplicationSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = Application.objects.all().select_related(
            "candidate", "job_offer", "job_offer__company"
        )
        params = self.request.query_params
        if s := params.get("status"):
            qs = qs.filter(status=s)
        if j := params.get("job"):
            qs = qs.filter(job_offer__id=j)
        if c := params.get("candidate"):
            qs = qs.filter(candidate__email__icontains=c)
        return qs


class AdminApplicationDetailView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/applications/admin/<pk>/
    Détail et modification d'une candidature — admin seulement.
    """
    serializer_class   = AdminApplicationSerializer
    permission_classes = [IsAdminUser]
    queryset           = Application.objects.all()