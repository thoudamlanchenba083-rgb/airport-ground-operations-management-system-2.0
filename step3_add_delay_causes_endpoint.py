path = "turnaround/views.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

marker = "        return Response({\n            'flight': flight_id,\n            'total_tasks': total,\n            'completed': completed,\n            'in_progress': in_progress,\n            'delayed': delayed,\n            'pending': pending,\n            'progress_percent': progress_percent,\n        })"

new_action = marker + """

    @action(detail=False, methods=['get'], url_path='delay-causes')
    def delay_causes(self, request):
        \"\"\"
        GET /api/turnaround/turnaround-tasks/delay-causes/
        Returns a percentage breakdown of delay reasons across tasks that
        were ever marked DELAYED or carry a non-NONE delay_reason.
        Powers the 'Top Delay Causes' chart on the dashboard.
        \"\"\"
        qs = self.get_queryset().exclude(delay_reason='NONE')

        days = request.query_params.get('days')
        if days:
            try:
                since = timezone.now() - timezone.timedelta(days=int(days))
                qs = qs.filter(updated_at__gte=since)
            except ValueError:
                pass

        total = qs.count()
        breakdown = (
            qs.values('delay_reason')
            .annotate(count=models.Count('id'))
            .order_by('-count')
        )

        reason_labels = dict(TurnaroundTask.DELAY_REASON_CHOICES)

        results = [
            {
                'reason': row['delay_reason'],
                'reason_display': reason_labels.get(row['delay_reason'], row['delay_reason']),
                'count': row['count'],
                'percent': round((row['count'] / total) * 100, 1) if total else 0,
            }
            for row in breakdown
        ]

        return Response({
            'total_delayed_tasks': total,
            'breakdown': results,
        })"""

if marker in content and "delay-causes" not in content:
    content = content.replace(marker, new_action, 1)
    print("delay_causes action added.")
else:
    print("Pattern not found or already applied, skipping.")

# Ensure `models` is imported (for models.Count) alongside existing imports
if "from django.db import models" not in content:
    content = content.replace(
        "from django.utils import timezone",
        "from django.utils import timezone\nfrom django.db import models",
        1
    )
    print("Added 'from django.db import models' import.")
else:
    print("'models' import already present.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. turnaround/views.py updated.")
