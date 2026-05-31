"""
accounts/apps.py

La configuration de l'application.
Ici on enregistre les signals pour qu'ils soient actifs au démarrage.
"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"
    verbose_name = "Gestion des comptes"

    def ready(self):
        """
        Django appelle ready() quand l'application est chargée.
        C'est le bon endroit pour importer les signals.
        Sans ça, les signals ne seraient jamais connectés.
        """
        import accounts.signals  # noqa: F401