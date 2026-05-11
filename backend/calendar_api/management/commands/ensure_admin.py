import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Crée ou met à jour le compte administrateur initial à partir des variables ADMIN_*."

    def handle(self, *args, **options):
        username = os.getenv("ADMIN_USERNAME", "").strip()
        email = os.getenv("ADMIN_EMAIL", "").strip()
        password = os.getenv("ADMIN_PASSWORD", "")

        if not username or not email or not password:
            self.stdout.write(
                self.style.WARNING(
                    "Variables ADMIN_* incomplètes; création du compte admin ignorée."
                )
            )
            return

        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )

        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        message = "Compte administrateur créé." if created else "Compte administrateur mis à jour."
        self.stdout.write(self.style.SUCCESS(message))
