import os
import sys
import threading

from django.apps import AppConfig

# All the .pkl files predictor.py's _load() reads, listed here so we can
# warm every one of them into its in-memory cache before any real request
# arrives. Keep in sync with the filenames used in ai_module/ml/predictor.py.
MODEL_FILES = [
    'delay_regressor.pkl',
    'delay_classifier.pkl',
    'delay_features.pkl',
    'maintenance_regressor.pkl',
    'maintenance_classifier.pkl',
    'maintenance_features.pkl',
    'rush_regressor.pkl',
    'rush_features.pkl',
    'weather_regressor.pkl',
    'weather_classifier.pkl',
    'weather_features.pkl',
    'staff_ground_crew_regressor.pkl',
    'staff_security_regressor.pkl',
    'staff_baggage_regressor.pkl',
    'staff_features.pkl',
    'gate_regressor.pkl',
    'gate_features.pkl',
    'equipment_regressor.pkl',
    'equipment_classifier.pkl',
    'equipment_features.pkl',
]


class AiModuleConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_module'

    def ready(self):
        # Only do this for the actual dev server, not for management
        # commands like migrate/makemigrations/shell - those don't serve
        # requests, so warming ~130MB of models would just slow them down
        # for no benefit.
        if 'runserver' not in sys.argv:
            return
        # runserver's autoreloader re-execs itself and only sets RUN_MAIN
        # in the child process that actually serves requests - skip the
        # parent watcher process so this doesn't run twice.
        if os.environ.get('RUN_MAIN') != 'true':
            return
        threading.Thread(target=self._warm_models, daemon=True).start()

    @staticmethod
    def _warm_models():
        # Import here, not at module load time, so this file stays cheap to
        # import for management commands that hit the early "return" above.
        from .ml.predictor import _load

        for filename in MODEL_FILES:
            try:
                _load(filename)
            except Exception:
                # If a model is missing/corrupt, let the real request path
                # surface that error normally instead of crashing startup.
                pass
