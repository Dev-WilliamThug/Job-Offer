"""
account/serializers.py

Les serializers sont les "traducteurs" entre Python et JSON.
Analogie : Imagine un douanier à la frontière. Quand des données entrent
(requête HTTP → Python), il vérifie les passeports (validation). Quand elles
sortent (Python → réponse JSON), il les met en forme pour le voyage.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CandidateProfile, RecruiterProfile, UserRole

User = get_user_model()


# ──────────────────────────────────────────────
# JWT personnalisé
# ──────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    On enrichit le token JWT avec des infos utiles côté frontend
    (role, prénom…). Ainsi Angular n'a pas besoin d'un appel API
    supplémentaire pour savoir qui est connecté.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Champs ajoutés au token
        token["email"] = user.email
        token["role"] = user.role
        token["full_name"] = user.full_name
        return token


# ──────────────────────────────────────────────
# Inscription
# ──────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer d'inscription.
    On demande le mot de passe deux fois (confirmation) — règle de base
    pour éviter les fautes de frappe.
    """

    password = serializers.CharField(
        write_only=True,         # jamais retourné dans la réponse
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "role", "password", "password_confirm"]

    def validate_role(self, value):
        """Un utilisateur ne peut pas s'inscrire en tant qu'admin."""
        if value == UserRole.ADMIN:
            raise serializers.ValidationError(
                "Vous ne pouvez pas vous inscrire en tant qu'administrateur."
            )
        return value

    def validate_password(self, attrs):
        """Vérifie que les deux mots de passe correspondent."""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        role = validated_data.get("role", UserRole.CANDIDATE)

        # Création de l'utilisateur
        user = User.objects.create_user(**validated_data)

        # Création automatique du profil selon le rôle
        # Analogie : quand tu ouvres un compte bancaire, la banque crée
        # automatiquement ton livret — tu n'as pas à le demander.
        if role == UserRole.CANDIDATE:
            CandidateProfile.objects.create(user=user)
        elif role == UserRole.RECRUITER:
            RecruiterProfile.objects.create(user=user)

        return user


# ──────────────────────────────────────────────
# Profils
# ──────────────────────────────────────────────

class CandidateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateProfile
        fields = [
            "phone", "bio", "skills", "resume",
            "location", "linkedin_url", "portfolio_url",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class RecruiterProfileSerializer(serializers.ModelSerializer):
    # On affiche le nom de l'entreprise en lecture (pas juste l'ID)
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = RecruiterProfile
        fields = ["phone", "position", "company", "company_name", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


# ──────────────────────────────────────────────
# Utilisateur (lecture + mise à jour)
# ──────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer général pour afficher / mettre à jour un utilisateur.
    Les profils imbriqués sont en lecture seule ici ; ils ont leurs
    propres endpoints dédiés.
    """

    candidate_profile = CandidateProfileSerializer(read_only=True)
    recruiter_profile = RecruiterProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "role",
            "is_active", "created_at", "updated_at",
            "candidate_profile", "recruiter_profile",
        ]
        read_only_fields = ["id", "email", "role", "is_active", "created_at", "updated_at"]


class UserUpdateSerializer(serializers.ModelSerializer):
    """Mise à jour des infos de base (prénom, nom)."""

    class Meta:
        model = User
        fields = ["first_name", "last_name"]


# ──────────────────────────────────────────────
# Changement de mot de passe
# ──────────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    """
    Pas un ModelSerializer car on ne mappe pas directement un modèle :
    on vérifie l'ancien mot de passe puis on en définit un nouveau.
    """

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True, write_only=True, validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password": "Les nouveaux mots de passe ne correspondent pas."}
            )
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user