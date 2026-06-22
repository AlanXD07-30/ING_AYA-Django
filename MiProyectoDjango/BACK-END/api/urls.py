from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet, AdministradorViewSet, InmuebleViewSet, RegistroView, PerfilView, FavoritosView, EmpleadoViewSet, ActualizarCredencialesEmpleado, ContactoView

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente') # Esta será la ruta web
router.register(r'administradores', AdministradorViewSet, basename='administrador')
router.register(r'inmuebles', InmuebleViewSet)
router.register(r'empleados', EmpleadoViewSet)

from .views import TransaccionViewSet, PagoViewSet, CitaViewSet

router.register(r'transacciones', TransaccionViewSet)
router.register(r'pagos', PagoViewSet)
router.register(r'citas', CitaViewSet)
 # Esta será la ruta web para inmuebles
urlpatterns = [
    path('', include(router.urls)),
    path('registro/', RegistroView.as_view(), name='registro'),
    path('perfil/', PerfilView.as_view(), name='perfil'),
    path('favoritos/', FavoritosView.as_view(), name='favoritos'),
    path('perfil-empleado/', ActualizarCredencialesEmpleado.as_view(), name='perfil-empleado'),
    path('contacto/', ContactoView.as_view(), name='contacto'),
]