"""
Seeds minimal Staff and GroundEquipment test data so the RESOURCE prediction
(ai_module.ml.resource_optimizer.optimize_resources) has something real to
compare forecast demand against. Safe to re-run - uses get_or_create keyed
on unique fields (employee_id / equipment_id), so it won't create duplicates.

Usage:
    python manage.py seed_ground_ops
    python manage.py seed_ground_ops --staff-per-type 6 --equipment-per-type 4
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from staff.models import Staff
from ground_equipment.models import EquipmentType, GroundEquipment


class Command(BaseCommand):
    help = "Seed test Staff and GroundEquipment records for AI resource optimization testing."

    def add_arguments(self, parser):
        parser.add_argument(
            '--staff-per-type',
            type=int,
            default=5,
            help='How many Staff records to create per staff_type (default: 5)')
        parser.add_argument(
            '--equipment-per-type',
            type=int,
            default=3,
            help='How many GroundEquipment records to create per EquipmentType (default: 3)')

    def handle(self, *args, **options):
        staff_per_type = options['staff_per_type']
        equipment_per_type = options['equipment_per_type']

        self.stdout.write('Seeding staff...')
        staff_created = self._seed_staff(staff_per_type)
        self.stdout.write(self.style.SUCCESS(
            f'  {staff_created} new Staff records created'))

        self.stdout.write('Seeding equipment types...')
        types_created = self._seed_equipment_types()
        self.stdout.write(self.style.SUCCESS(
            f'  {types_created} new EquipmentType records created'))

        self.stdout.write('Seeding ground equipment...')
        equipment_created = self._seed_equipment(equipment_per_type)
        self.stdout.write(self.style.SUCCESS(
            f'  {equipment_created} new GroundEquipment records created'))

        self.stdout.write(self.style.SUCCESS(
            'Done. Re-run the RESOURCE prediction to see it use this data.'))

    def _seed_staff(self, per_type):
        created_count = 0
        for staff_type, label in Staff.STAFF_TYPES:
            for i in range(1, per_type + 1):
                employee_id = f'{staff_type[:3]}-{i:03d}'
                _, created = Staff.objects.get_or_create(
                    employee_id=employee_id,
                    defaults={
                        'name': f'{label} Staff {i}',
                        'staff_type': staff_type,
                        'phone': f'+1555000{i:04d}',
                        'email': f'{staff_type.lower()}.staff{i}@airport.test',
                        'is_active': True,
                    },
                )
                if created:
                    created_count += 1
        return created_count

    def _seed_equipment_types(self):
        created_count = 0
        for choice_value, choice_label in EquipmentType.EQUIPMENT_CHOICES:
            _, created = EquipmentType.objects.get_or_create(
                name=choice_value,
                defaults={'description': f'{choice_label} - seeded'},
            )
            if created:
                created_count += 1
        return created_count

    def _seed_equipment(self, per_type):
        created_count = 0
        now = timezone.now()

        for etype in EquipmentType.objects.all():
            for i in range(1, per_type + 1):
                equipment_id = f'{etype.name.upper()}-{i:03d}'
                is_old_unit = (i == per_type)

                # Make the last unit of each type look "at risk" so
                # predict_equipment_failure() actually flags it as
                # SOON/IMMEDIATE - useful for confirming the forecast logic
                # fires, not just idles. The trained model weighs age_days
                # (time since the record was created) heavily, so
                # last_maintenance alone isn't enough - a brand new record
                # can't look high-risk regardless of its maintenance date.
                # We backdate created_at further down to compensate.
                last_maintenance = (
                    now -
                    timedelta(
                        days=365)) if is_old_unit else (
                    now -
                    timedelta(
                        days=15))

                equipment, created = GroundEquipment.objects.get_or_create(
                    equipment_id=equipment_id,
                    equipment_type=etype,
                    defaults={
                        'status': 'available',
                        'location': 'Apron A',
                        'last_maintenance': last_maintenance,
                    },
                )
                if created:
                    created_count += 1

                if is_old_unit:
                    # auto_now_add ignores values passed to create()/save(),
                    # so backdate via a queryset update instead - this is
                    # the only way to simulate equipment that's actually
                    # been in service for years, which the model needs to
                    # see before it will flag anything as at-risk.
                    GroundEquipment.objects.filter(pk=equipment.pk).update(
                        created_at=now - timedelta(days=3000),
                        last_maintenance=last_maintenance,
                    )
        return created_count
