"""
Loads the flight schedule sheet used by the AI Assistant chatbot directly
from a file in the codebase instead of the (removed) browser upload button.

Usage:
    # Drop your .xlsx / .xls / .csv file into ai_module/schedule_data/
    # then run:
    python manage.py import_schedule

    # Or point it at a specific file anywhere on disk:
    python manage.py import_schedule --path "C:\\path\\to\\schedule.xlsx"

Only one schedule is ever "active" - importing a new one replaces the
previous one (same behaviour as the old upload endpoint).
"""
import os
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

from ai_module.excel_import import import_flight_schedule

SCHEDULE_DIR = os.path.join(settings.BASE_DIR, 'ai_module', 'schedule_data')
VALID_EXTENSIONS = ('.xlsx', '.xls', '.csv')


class Command(BaseCommand):
    help = 'Import the flight schedule sheet from a file in the codebase (ai_module/schedule_data/ by default).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--path',
            type=str,
            default=None,
            help='Path to a specific .xlsx/.xls/.csv file. If omitted, the command looks in ai_module/schedule_data/.',
        )

    def handle(self, *args, **options):
        path = options.get('path')

        if path:
            if not os.path.isfile(path):
                raise CommandError(f'File not found: {path}')
            target = path
        else:
            if not os.path.isdir(SCHEDULE_DIR):
                raise CommandError(
                    f'{SCHEDULE_DIR} does not exist. Create it and drop your schedule file inside, '
                    'or pass --path pointing at the file.')
            candidates = sorted(
                (f for f in os.listdir(SCHEDULE_DIR) if f.lower().endswith(VALID_EXTENSIONS)),
                key=lambda f: os.path.getmtime(
                    os.path.join(
                        SCHEDULE_DIR,
                        f)),
                reverse=True,
            )
            if not candidates:
                raise CommandError(
                    f'No .xlsx/.xls/.csv file found in {SCHEDULE_DIR}. '
                    'Drop your schedule sheet in that folder and re-run this command.')
            if len(candidates) > 1:
                self.stdout.write(self.style.WARNING(
                    f'Found {len(candidates)} files in {SCHEDULE_DIR}, using the most recently modified: {candidates[0]}'
                ))
            target = os.path.join(SCHEDULE_DIR, candidates[0])

        filename = os.path.basename(target)
        self.stdout.write(f'Importing schedule from {target} ...')

        with open(target, 'rb') as fh:
            django_file = File(fh, name=filename)
            upload = import_flight_schedule(django_file, filename)

        if upload.status == 'FAILED':
            raise CommandError(
                f"Couldn't read that file: {upload.error_message}")

        self.stdout.write(self.style.SUCCESS(
            f'Imported "{filename}" - {upload.row_count} flight row(s) loaded and set as the active schedule.'
        ))
