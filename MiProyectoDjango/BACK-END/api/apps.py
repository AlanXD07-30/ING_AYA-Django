from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("ALTER TABLE transaccion MODIFY estado VARCHAR(50);")
                cursor.execute("ALTER TABLE inmueble MODIFY estado VARCHAR(50);")
                cursor.execute("ALTER TABLE movimiento_inmueble MODIFY estado_momento VARCHAR(50);")
        except Exception as e:
            print("DB Alter failed:", e)

        try:
            from . import scheduler
            scheduler.start()
        except ImportError:
            pass
