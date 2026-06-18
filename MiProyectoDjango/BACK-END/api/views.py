import os
from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics, viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Cliente, Inmueble, InmuebleFavorito, Empleado, Rol, ImagenInmueble
from .serializers import RegistroSerializer, ClienteSerializer, InmuebleSerializer, InmuebleFavoritoSerializer, EmpleadoSerializer, RolSerializer
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.core.files.storage import FileSystemStorage
import threading

from django.contrib.auth.models import User
from django.db import transaction

class ClienteViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer

    def get_queryset(self):
        return Cliente.objects.exclude(id_usuario__is_superuser=True).exclude(id_usuario__is_staff=True)

    def perform_create(self, serializer):
        correo = self.request.data.get('correo')
        contrasena = self.request.data.get('contrasena')
        with transaction.atomic():
            cliente = serializer.save()
            if correo and contrasena:
                user, created = User.objects.get_or_create(username=correo, defaults={'email': correo})
                user.set_password(contrasena)
                user.save()
                cliente.id_usuario = user
                cliente.save()
                
    def perform_destroy(self, instance):
        with transaction.atomic():
            user = instance.id_usuario
            instance.delete()
            if user and not user.is_superuser:
                user.delete()

class AdministradorViewSet(viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    
    def get_queryset(self):
        # Retornar clientes que SI son administradores
        return Cliente.objects.filter(id_usuario__is_superuser=True)

class InmuebleViewSet(viewsets.ModelViewSet):
    queryset = Inmueble.objects.all()
    serializer_class = InmuebleSerializer

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        inmueble = self.get_object()
        imagenes = request.FILES.getlist('imagenes')
        if not imagenes:
            return Response({"error": "No se enviaron imágenes"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Make sure media/inmuebles folder exists
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'inmuebles')
        os.makedirs(upload_dir, exist_ok=True)
        
        fs = FileSystemStorage(location=upload_dir, base_url=settings.MEDIA_URL + 'inmuebles/')
        urls = []
        for index, img in enumerate(imagenes):
            filename = fs.save(img.name, img)
            url = fs.url(filename)
            # Create the ImagenInmueble entry
            try:
                ImagenInmueble.objects.create(
                    id_inmueble=inmueble,
                    url_imagen=url,
                    es_principal=1 if index == 0 else 0
                )
                urls.append(url)
            except Exception as e:
                with open('error_log.txt', 'a') as log_f:
                    log_f.write(str(e) + '\n')
                urls.append(url)
        return Response({"message": f"{len(urls)} Imágenes subidas con éxito", "urls": urls}, status=status.HTTP_201_CREATED)
# Create your views here.

class RegistroView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegistroSerializer
    permission_classes = [AllowAny] # Permite que alguien no logueado pueda registrarse

class PerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            cliente = request.user.cliente
            serializer = ClienteSerializer(cliente, context={'request': request})
            return Response(serializer.data)
        except Cliente.DoesNotExist:
            user = request.user
            # Check if it's an Empleado
            from .models import Empleado
            empleado = Empleado.objects.filter(id_usuario=user).first()
            if empleado:
                return Response({
                    "nombre": empleado.nombre,
                    "identificacion": empleado.identificacion,
                    "email": user.email,
                    "telefono": empleado.telefono,
                    "rol": empleado.tipo_empleado,
                    "es_empleado": True
                })
            
            # Si no es ni cliente ni empleado (ej. superadmin nativo)
            return Response({
                "nombre": user.username,
                "email": user.email,
                "es_admin_sin_perfil": True
            })

    def post(self, request):
        try:
            cliente = request.user.cliente
            if 'foto_perfil' in request.FILES:
                cliente.foto_perfil = request.FILES['foto_perfil']
                cliente.save()
                serializer = ClienteSerializer(cliente, context={'request': request})
                return Response({"message": "Foto actualizada", "data": serializer.data}, status=status.HTTP_200_OK)
            return Response({"error": "No se envió ninguna foto"}, status=status.HTTP_400_BAD_REQUEST)
        except Cliente.DoesNotExist:
            return Response({"error": "Debes ser un cliente registrado para subir una foto."}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        try:
            cliente = request.user.cliente
            data = request.data

            # Actualizar datos personales
            if 'nombre' in data:
                cliente.nombre = data['nombre']
            if 'telefono' in data:
                cliente.telefono = data['telefono']
            if 'direccion' in data:
                cliente.direccion = data['direccion']
            if 'fecha_nacimiento' in data and data['fecha_nacimiento']:
                cliente.fecha_nacimiento = data['fecha_nacimiento']

            # Actualizar contraseña si se proporcionó old_password y new_password
            if 'old_password' in data and 'new_password' in data:
                user = request.user
                if not user.check_password(data['old_password']):
                    return Response({"error": "La contraseña actual es incorrecta."}, status=status.HTTP_400_BAD_REQUEST)
                user.set_password(data['new_password'])
                user.save()
                
                # Disparar correo de cambio de clave en un hilo separado
                def enviar_correo_cambio_clave(email_destino, nombre_usuario):
                    try:
                        asunto = "Alerta de Seguridad - Contraseña Modificada"
                        remitente = f"IngAya <{settings.EMAIL_HOST_USER}>"
                        destinatario = [email_destino]
                        contexto = {'nombre': nombre_usuario}
                        html_content = render_to_string('emails/cambio_clave.html', contexto)
                        text_content = render_to_string('emails/cambio_clave.txt', contexto)
                        msg = EmailMultiAlternatives(asunto, text_content, remitente, destinatario)
                        msg.attach_alternative(html_content, "text/html")
                        msg.send()
                    except Exception as e:
                        print(f"Error al enviar correo de cambio de clave: {e}")

                hilo_correo = threading.Thread(target=enviar_correo_cambio_clave, args=(user.email, cliente.nombre))
                hilo_correo.start()

            cliente.save()
            serializer = ClienteSerializer(cliente, context={'request': request})
            return Response({"message": "Datos actualizados correctamente", "data": serializer.data}, status=status.HTTP_200_OK)

        except Cliente.DoesNotExist:
            return Response({"error": "Debes ser un cliente registrado para actualizar datos."}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        try:
            cliente = request.user.cliente
            if cliente.foto_perfil:
                cliente.foto_perfil.delete(save=True)
            return Response({"message": "Foto eliminada"}, status=status.HTTP_200_OK)
        except Cliente.DoesNotExist:
            return Response({"error": "Debes ser un cliente registrado."}, status=status.HTTP_400_BAD_REQUEST)

class FavoritosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            cliente = request.user.cliente
            favoritos = InmuebleFavorito.objects.filter(id_cliente=cliente)
            serializer = InmuebleFavoritoSerializer(favoritos, many=True)
            return Response(serializer.data)
        except Cliente.DoesNotExist:
            return Response({"error": "No eres un cliente."}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        try:
            cliente = request.user.cliente
            inmueble_id = request.data.get('id_inmueble')
            if not inmueble_id:
                return Response({"error": "id_inmueble es requerido"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Evitar duplicados
            if InmuebleFavorito.objects.filter(id_cliente=cliente, id_inmueble_id=inmueble_id).exists():
                return Response({"message": "Ya está en favoritos"}, status=status.HTTP_200_OK)
            
            InmuebleFavorito.objects.create(id_cliente=cliente, id_inmueble_id=inmueble_id)
            return Response({"message": "Agregado a favoritos"}, status=status.HTTP_201_CREATED)
        except Cliente.DoesNotExist:
            return Response({"error": "No eres un cliente."}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        try:
            cliente = request.user.cliente
            inmueble_id = request.data.get('id_inmueble')
            if not inmueble_id:
                return Response({"error": "id_inmueble es requerido"}, status=status.HTTP_400_BAD_REQUEST)
            
            InmuebleFavorito.objects.filter(id_cliente=cliente, id_inmueble_id=inmueble_id).delete()
            return Response({"message": "Eliminado de favoritos"}, status=status.HTTP_200_OK)
        except Cliente.DoesNotExist:
            return Response({"error": "No eres un cliente."}, status=status.HTTP_400_BAD_REQUEST)
class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            empleado = serializer.save()
            ident = empleado.identificacion
            if ident:
                user, created = User.objects.get_or_create(username=ident, defaults={'email': ident+'@empleado.com'})
                user.set_password(ident)
                user.save()
                empleado.id_usuario = user
                empleado.save()
                
    def perform_destroy(self, instance):
        with transaction.atomic():
            user = instance.id_usuario
            instance.delete()
            if user and not user.is_superuser:
                user.delete()
    # permission_classes = [IsAuthenticated] # Para desarrollo podemos dejarlo publico o con token

class RolViewSet(viewsets.ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer
    # permission_classes = [IsAuthenticated]


from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

from django.contrib.auth import authenticate

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        username_or_id = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username_or_id, password=password)

        if not user:
            empleado = Empleado.objects.filter(identificacion=username_or_id).first()
            if empleado and empleado.id_usuario:
                user = authenticate(username=empleado.id_usuario.username, password=password)
            
            if not user:
                cliente = Cliente.objects.filter(identificacion=username_or_id).first()
                if cliente and cliente.id_usuario:
                    user = authenticate(username=cliente.id_usuario.username, password=password)
                    
        if not user:
            return Response({'error': 'Credenciales inválidas'}, status=400)

        token, created = Token.objects.get_or_create(user=user)
        
        rol = None
        if user.is_superuser or user.is_staff:
            rol = 'Administrador'
        else:
            empleado = Empleado.objects.filter(id_usuario=user).first()
            if empleado:
                rol = empleado.tipo_empleado
            else:
                cliente = Cliente.objects.filter(id_usuario=user).first()
                if cliente:
                    rol = 'Cliente'
                    
        # Si no tiene ningún rol asignado (usuario fantasma), rechazar
        if not rol:
            return Response({'error': 'Cuenta desactivada o sin permisos.'}, status=403)

        return Response({
            'token': token.key,
            'is_admin': user.is_staff or user.is_superuser,
            'rol': rol
        })

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
