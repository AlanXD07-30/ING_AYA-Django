import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import Transaccion

for t in Transaccion.objects.all():
    print("TRANSACCION:", t.id_transaccion, t.estado, "CLIENTE:", t.id_cliente_id, "INMUEBLE:", t.id_inmueble_id)
