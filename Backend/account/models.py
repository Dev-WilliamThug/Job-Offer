from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
 
 
class UserRole(models.TextChoices):
    """
    Les rôles disponibles dans le système.
    TextChoices = une liste fermée de valeurs autorisées (comme un menu déroulant).
    """
    CANDIDATE = "candidate", "Candidat"
    RECRUITER = "recruiter", "Recruteur"
    ADMIN = "admin", "Administrateur"
 
 
class CustomUserManager(BaseUserManager):
    """
    Le manager est le "chef de cuisine" : il sait comment fabriquer un utilisateur.
    Django en a besoin dès que tu personnalises le modèle User.
    """
 
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # hash le mot de passe
        user.save(using=self._db)
        return user
 
    def create_superuser(self, email, password=None, **extra_fields):
        """Crée un super-utilisateur (admin Django)."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMIN)
        return self.create_user(email, password, **extra_fields)
 
 
class User(AbstractBaseUser, PermissionsMixin):
    """
    Utilisateur personnalisé.
    On utilise l'EMAIL comme identifiant principal au lieu du username par défaut.
    """
 
    email = models.EmailField(unique=True, verbose_name="Adresse email")
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
 
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CANDIDATE,
        verbose_name="Rôle"
    )
 
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # accès admin Django
 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    objects = CustomUserManager()
 
    USERNAME_FIELD = "email"       # on se connecte avec l'email
    REQUIRED_FIELDS = []           # rien d'autre requis à la création
 
    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
 
    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
 
 
    @property
    def is_candidate(self):
        return self.role == UserRole.CANDIDATE
 
    @property
    def is_recruiter(self):
        return self.role == UserRole.RECRUITER
 
    @property
    def is_admin_user(self):
        return self.role == UserRole.ADMIN
 
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email
 
 
class CandidateProfile(models.Model):
    """
    Profil étendu d'un candidat.
    Relation OneToOne = chaque candidat a AU PLUS UN profil (et vice-versa).
    """
 
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="candidate_profile"
    )
 
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    bio = models.TextField(blank=True, verbose_name="Présentation")
    skills = models.TextField(blank=True, verbose_name="Compétences")  # ex: "Python, Django, React"
    resume = models.FileField(
        upload_to="resumes/",
        null=True,
        blank=True,
        verbose_name="CV (fichier)"
    )
    location = models.CharField(max_length=200, blank=True, verbose_name="Localisation")
    linkedin_url = models.URLField(blank=True, verbose_name="Profil LinkedIn")
    portfolio_url = models.URLField(blank=True, verbose_name="Portfolio / Site web")
 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    class Meta:
        verbose_name = "Profil candidat"
        verbose_name_plural = "Profils candidats"
 
    def __str__(self):
        return f"Profil de {self.user.full_name}"
 
 
class RecruiterProfile(models.Model):
    """
    Profil étendu d'un recruteur.
 
    Un recruteur est lié à UNE entreprise (gérée dans l'app companies/).
    On stocke ici uniquement ce qui est propre à la personne-recruteur,
    pas à l'entreprise elle-même.
    """
 
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="recruiter_profile"
    )
 
    phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    position = models.CharField(max_length=150, blank=True, verbose_name="Poste dans l'entreprise")
 
    # ForeignKey vers Company (app companies/) — null=True car le profil peut
    # exister avant que l'entreprise soit créée/associée.
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recruiters",
        verbose_name="Entreprise"
    )
 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    class Meta:
        verbose_name = "Profil recruteur"
        verbose_name_plural = "Profils recruteurs"
 
    def __str__(self):
        company_name = self.company.name if self.company else "Sans entreprise"
        return f"{self.user.full_name} — {company_name}"