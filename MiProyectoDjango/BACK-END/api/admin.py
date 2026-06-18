from django.contrib import admin
from .models import Cliente, Inmueble

# Aquí registramos las tablas que queremos ver en el panel
admin.site.register(Cliente)
admin.site.register(Inmueble)

# Register your models here.
