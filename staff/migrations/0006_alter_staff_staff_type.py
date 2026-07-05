# Generated manually - adds 'BAGGAGE' to Staff.STAFF_TYPES choices so
# baggage-handling staff can be tracked and included in AI staff-shortage
# forecasts (see ai_module/ml/resource_optimizer.py). Choices-only change,
# no actual column/type change, so this is safe to run on existing data.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('staff', '0005_staffassignment'),
    ]

    operations = [
        migrations.AlterField(
            model_name='staff',
            name='staff_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('GROUND', 'Ground Staff'),
                    ('SECURITY', 'Security'),
                    ('MAINTENANCE', 'Maintenance'),
                    ('SUPERVISOR', 'Supervisor'),
                    ('BAGGAGE', 'Baggage Handling'),
                ],
            ),
        ),
    ]
