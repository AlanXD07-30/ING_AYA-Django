import sys
sys.path.append("C:/Users/Pepe/Desktop/ING_AYA/MiProyectoDjango/BACK-END")
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import Cliente
from api.serializers import ClienteSerializer

cliente = Cliente.objects.first()
print(ClienteSerializer(cliente).data)
