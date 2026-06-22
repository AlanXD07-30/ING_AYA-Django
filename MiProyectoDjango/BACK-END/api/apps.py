from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        try:
            from . import scheduler
            scheduler.start()
        except ImportError:
            pass
