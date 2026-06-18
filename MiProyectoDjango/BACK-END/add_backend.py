import os

# 1. Update serializers.py
serializers_path = r"C:\Users\Pepe\Desktop\ING_AYA\MiProyectoDjango\BACK-END\api\serializers.py"
with open(serializers_path, 'r', encoding='utf-8') as f:
    serializers_content = f.read()

new_serializers = """
from .models import Transaccion, Pago, Cita

class TransaccionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaccion
        fields = '__all__'

class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = '__all__'

class CitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = '__all__'
"""
if "class TransaccionSerializer" not in serializers_content:
    with open(serializers_path, 'a', encoding='utf-8') as f:
        f.write(new_serializers)


# 2. Update views.py
views_path = r"C:\Users\Pepe\Desktop\ING_AYA\MiProyectoDjango\BACK-END\api\views.py"
with open(views_path, 'r', encoding='utf-8') as f:
    views_content = f.read()

new_views = """
from .models import Transaccion, Pago, Cita
from .serializers import TransaccionSerializer, PagoSerializer, CitaSerializer

class TransaccionViewSet(viewsets.ModelViewSet):
    queryset = Transaccion.objects.all()
    serializer_class = TransaccionSerializer

class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer

class CitaViewSet(viewsets.ModelViewSet):
    queryset = Cita.objects.all()
    serializer_class = CitaSerializer
"""
if "class TransaccionViewSet" not in views_content:
    with open(views_path, 'a', encoding='utf-8') as f:
        f.write(new_views)

# 3. Update urls.py
urls_path = r"C:\Users\Pepe\Desktop\ING_AYA\MiProyectoDjango\BACK-END\api\urls.py"
with open(urls_path, 'r', encoding='utf-8') as f:
    urls_content = f.read()

urls_repl = """
from .views import TransaccionViewSet, PagoViewSet, CitaViewSet

router.register(r'transacciones', TransaccionViewSet)
router.register(r'pagos', PagoViewSet)
router.register(r'citas', CitaViewSet)
"""

if "router.register(r'transacciones'" not in urls_content:
    urls_content = urls_content.replace(
        "router.register(r'roles', RolViewSet)",
        "router.register(r'roles', RolViewSet)\n" + urls_repl
    )
    with open(urls_path, 'w', encoding='utf-8') as f:
        f.write(urls_content)

print("Backend API routes and models registered.")
