from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = "Creates one test user per role (username = role in lowercase, password = 'testpass123') for manual role-based testing."

    def handle(self, *args, **options):
        password = 'testpass123'
        created, skipped = [], []

        for role_value, role_label in User.ROLE_CHOICES:
            username = f"test_{role_value.lower()}"
            if User.objects.filter(username=username).exists():
                skipped.append(username)
                continue

            if role_value == 'ADMIN':
                User.objects.create_superuser(
                    username=username,
                    email=f"{username}@test.local",
                    password=password,
                )
            else:
                User.objects.create_user(
                    username=username,
                    email=f"{username}@test.local",
                    password=password,
                    role=role_value,
                )
            created.append(username)

        self.stdout.write(self.style.SUCCESS(f"Created {len(created)} test user(s):"))
        for u in created:
            self.stdout.write(f"  {u}  (password: {password})")
        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {len(skipped)} already-existing user(s):"))
            for u in skipped:
                self.stdout.write(f"  {u}")
