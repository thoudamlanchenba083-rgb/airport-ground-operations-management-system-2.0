release: python manage.py migrate && python manage.py collectstatic --noinput
web: gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT
