from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from flights.models import Airline, Aircraft, Flight
from gates.models import Gate, GateAssignment
from turnaround.models import TurnaroundTask


class Command(BaseCommand):
    help = "Seeds demo flights/delays/gate-maintenance so the Heat Map shows medium/high congestion tiles."

    def add_arguments(self, parser):
        parser.add_argument(
            '--maintenance-gate',
            action='store_true',
            help='Also mark a second gate as under maintenance (forces it red).',
        )

    def handle(self, *args, **options):
        now = timezone.now()

        # 1. Demo airline + aircraft (reused if they already exist)
        airline, _ = Airline.objects.get_or_create(
            code='DM', defaults={'name': 'Demo Air'})
        aircraft, _ = Aircraft.objects.get_or_create(
            registration_number='DEMO-AC1',
            defaults={'aircraft_type': 'A320', 'capacity': 180, 'width': 34.00, 'length': 37.60},
        )

        # 2. Pick a gate to make busy (first non-maintenance gate)
        target_gate = Gate.objects.filter(
            is_under_maintenance=False).order_by('gate_number').first()
        if not target_gate:
            self.stdout.write(self.style.ERROR(
                'No gates found — create at least one gate first.'))
            return

        # Clean up any previous demo run so this command is safe to re-run
        Flight.objects.filter(flight_number__startswith='DEMO').delete()

        flights = []
        for i in range(3):
            flight = Flight.objects.create(
                flight_number=f'DEMO10{i+1}',
                flight_type=target_gate.gate_type,
                airline=airline,
                aircraft=aircraft,
                origin='DEMO-ORIGIN',
                destination='DEMO-DEST',
                passenger_count=150,
                departure_time=now - timedelta(hours=2 - i),
                arrival_time=now - timedelta(hours=3 - i),
                status='DEPARTED' if i < 2 else 'BOARDING',
            )
            flights.append(flight)

        # 3. Gate assignments today — two released (history), one currently
        # assigned
        for i, flight in enumerate(flights):
            GateAssignment.objects.create(
                flight=flight,
                gate=target_gate,
                status='released' if i < 2 else 'assigned',
            )
        target_gate.is_available = False
        target_gate.save()

        # 4. A couple of delayed turnaround tasks on today's flights
        TurnaroundTask.objects.create(
            flight=flights[0],
            task_type='FUELING',
            status='DELAYED',
            delay_reason='FUEL',
        )
        TurnaroundTask.objects.create(
            flight=flights[1],
            task_type='CABIN_CLEANING',
            status='DELAYED',
            delay_reason='CLEANING',
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded 3 demo flights on gate {target_gate.gate_number} (2 released + 1 currently assigned), '
                f'with 2 delayed turnaround tasks.'))

        # 5. Optional: force a second gate red via maintenance
        if options['maintenance_gate']:
            other_gate = Gate.objects.exclude(
                id=target_gate.id).order_by('gate_number').first()
            if other_gate:
                other_gate.is_under_maintenance = True
                other_gate.save()
                self.stdout.write(self.style.SUCCESS(
                    f'Marked gate {other_gate.gate_number} as under maintenance.'))
