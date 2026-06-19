import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "api_inmobiliaria.settings")
django.setup()

from api.models import Transaccion

for t in Transaccion.objects.all():
    print(t.id_transaccion, t.estado, t.id_cliente_id, t.id_inmueble_id)
