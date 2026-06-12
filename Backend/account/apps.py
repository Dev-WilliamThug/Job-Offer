"""
account/apps.py

La configuration de l'application.
Ici on enregistre les signals pour qu'ils soient actifs au démarrage.
"""

from django.apps import AppConfig


class accountConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "account"
    verbose_name = "Gestion des comptes"

    def ready(self):
        """
        Django appelle ready() quand l'application est chargée.
        C'est le bon endroit pour importer les signals.
        Sans ça, les signals ne seraient jamais connectés.
        """
        import account.signals  # noqa: F401