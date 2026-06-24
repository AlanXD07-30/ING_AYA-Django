import os
from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics, viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Cliente, Inmueble, InmuebleFavorito, Empleado, ImagenInmueble, MovimientoInmueble
from .serializers import RegistroSerializer, ClienteSerializer, InmuebleSerializer, InmuebleFavoritoSerializer, EmpleadoSerializer, MovimientoInmuebleSerializer
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

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        inmueble = self.get_object()
        movimientos = MovimientoInmueble.objects.filter(id_inmueble=inmueble).order_by('-fecha')
        serializer = MovimientoInmuebleSerializer(movimientos, many=True)
        return Response(serializer.data)

    def perform_update(self, serializer):
        from django.utils import timezone
        old_instance = self.get_object()
        old_precio = old_instance.precio
        old_estado = old_instance.estado
        
        new_instance = serializer.save()
        
        # Check for price change
        if old_precio != new_instance.precio:
            MovimientoInmueble.objects.create(
                tipo_movimiento='Cambio Precio',
                fecha=timezone.now(),
                precio_momento=new_instance.precio,
                estado_momento=None,
                descripcion=f"El precio cambió de {old_precio} a {new_instance.precio}",
                id_inmueble=new_instance
            )
            
        # Check for state change
        old_estado_upper = (old_estado or "").upper()
        new_estado_upper = (new_instance.estado or "").upper()
        if old_estado_upper != new_estado_upper:
            MovimientoInmueble.objects.create(
                tipo_movimiento='Cambio Estado',
                fecha=timezone.now(),
                precio_momento=new_instance.precio,
                estado_momento=None,
                descripcion=f"El estado cambió de '{old_estado}' a '{new_instance.estado}'",
                id_inmueble=new_instance
            )

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        inmueble = self.get_object()
        imagenes = request.FILES.getlist('imagenes')
        if not imagenes:
            return Response({"error": "No se enviaron imágenes"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Delete old images to replace them
        ImagenInmueble.objects.filter(id_inmueble=inmueble).delete()
        
        from django.core.files.storage import default_storage
        import time
        import uuid
        
        urls = []
        for index, img in enumerate(imagenes):
            # Usamos default_storage para que guarde en Cloudinary (si esta configurado) o en Local
            unique_name = f"inmuebles/{int(time.time())}_{uuid.uuid4().hex[:6]}_{img.name}"
            filename = default_storage.save(unique_name, img)
            url = default_storage.url(filename)
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
            correo = empleado.correo
            if ident:
                email_asignar = correo if correo else f"{ident}@empleado.com"
                user, created = User.objects.get_or_create(username=ident, defaults={'email': email_asignar})
                user.set_password(ident)
                user.save()
                empleado.id_usuario = user
                empleado.save()
                
                if correo:
                    def enviar_correo_empleado(email_destino, nombre_usuario, cargo, ident_temporal):
                        try:
                            asunto = f"Bienvenido a IngAya - {cargo}"
                            remitente = f"IngAya <{settings.EMAIL_HOST_USER}>"
                            destinatario = [email_destino]

                            contexto = {
                                'nombre': nombre_usuario,
                                'cargo': cargo,
                                'correo': email_destino,
                                'identificacion': ident_temporal
                            }
                            html_content = render_to_string('emails/bienvenida_empleado.html', contexto)
                            text_content = render_to_string('emails/bienvenida_empleado.txt', contexto)

                            msg = EmailMultiAlternatives(asunto, text_content, remitente, destinatario)
                            msg.attach_alternative(html_content, "text/html")
                            msg.send()
                        except Exception as e:
                            print(f"Error al enviar correo a empleado: {e}")

                    hilo_correo = threading.Thread(target=enviar_correo_empleado, args=(correo, empleado.nombre, empleado.tipo_empleado, ident))
                    hilo_correo.start()
                
    def perform_destroy(self, instance):
        correo = instance.correo
        nombre = instance.nombre
        cargo = instance.tipo_empleado
        
        if correo:
            def enviar_correo_despedida(email_destino, nombre_usuario, cargo):
                try:
                    asunto = f"Gracias por tu tiempo en IngAya - {cargo}"
                    remitente = f"IngAya <{settings.EMAIL_HOST_USER}>"
                    destinatario = [email_destino]

                    contexto = {
                        'nombre': nombre_usuario,
                        'cargo': cargo,
                    }
                    html_content = render_to_string('emails/despedida_empleado.html', contexto)
                    text_content = render_to_string('emails/despedida_empleado.txt', contexto)

                    msg = EmailMultiAlternatives(asunto, text_content, remitente, destinatario)
                    msg.attach_alternative(html_content, "text/html")
                    msg.send()
                except Exception as e:
                    print(f"Error al enviar correo de despedida a empleado: {e}")

            hilo_correo = threading.Thread(target=enviar_correo_despedida, args=(correo, nombre, cargo))
            hilo_correo.start()
            
        with transaction.atomic():
            user = instance.id_usuario
            instance.delete()
            if user and not user.is_superuser:
                user.delete()
    # permission_classes = [IsAuthenticated] # Para desarrollo podemos dejarlo publico o con token




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
            if not empleado:
                empleado = Empleado.objects.filter(correo=username_or_id).first()
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

        requiere_cambio = False
        if rol and rol != 'Cliente' and rol != 'Administrador':
            if empleado and user.check_password(empleado.identificacion):
                requiere_cambio = True

        return Response({
            'token': token.key,
            'is_admin': user.is_staff or user.is_superuser,
            'rol': rol,
            'requiere_cambio': requiere_cambio
        })

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

class ActualizarCredencialesEmpleado(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        empleado = Empleado.objects.filter(id_usuario=user).first()
        
        if not empleado:
            return Response({'error': 'No es un empleado'}, status=403)
            
        nuevo_correo = request.data.get('correo')
        nueva_password = request.data.get('password')
        
        if not nuevo_correo or not nueva_password:
            return Response({'error': 'Faltan datos'}, status=400)
            
        with transaction.atomic():
            user.email = nuevo_correo
            user.set_password(nueva_password)
            user.save()
            
            empleado.correo = nuevo_correo
            empleado.save()
            
        return Response({'success': True, 'message': 'Credenciales actualizadas correctamente'})

from .models import Transaccion, Pago, Cita
from .serializers import TransaccionSerializer, PagoSerializer, CitaSerializer

class TransaccionViewSet(viewsets.ModelViewSet):
    queryset = Transaccion.objects.all()
    serializer_class = TransaccionSerializer

    def perform_create(self, serializer):
        from django.utils import timezone
        from django.db import transaction
        from rest_framework.exceptions import ValidationError
        import traceback
        from .models import MovimientoInmueble, Cita
        
        try:
            with transaction.atomic():
                transaccion = serializer.save()
                
                if transaccion.id_inmueble:
                    inmueble = transaccion.id_inmueble
                    
                    # Cancelar citas de otros clientes para este inmueble
                    try:
                        citas_pendientes = Cita.objects.filter(
                            descripcion__icontains=f"inmueble ID: {inmueble.id_inmueble}"
                        ).exclude(estado='CANCELADA')
                        for c in citas_pendientes:
                            c.estado = 'CANCELADA'
                            c.save()
                    except Exception as e:
                        print("Error cancelando citas:", e)
                    
                    if inmueble.tipo_operacion == 'Arriendo':
                        transaccion.estado = 'REVISION'
                        transaccion.save()
                        
                        inmueble.estado = 'En Revisión'
                        inmueble.save()
                        
                        MovimientoInmueble.objects.create(
                            tipo_movimiento='Cambio Estado',
                            fecha=timezone.now(),
                            precio_momento=inmueble.precio,
                            estado_momento=None,
                            descripcion=f"El inmueble está En Revisión (Transacción #{transaccion.id_transaccion})",
                            id_inmueble=inmueble
                        )
                    else:
                        inmueble.estado = 'Reservado'
                        inmueble.save()
                        
                        MovimientoInmueble.objects.create(
                            tipo_movimiento='Cambio Estado',
                            fecha=timezone.now(),
                            precio_momento=inmueble.precio,
                            estado_momento=None,
                            descripcion=f"El inmueble fue Reservado (Transacción #{transaccion.id_transaccion})",
                            id_inmueble=inmueble
                        )
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            print(error_msg)
            print(traceback.format_exc())
            raise ValidationError({"detail": error_msg})

    @action(detail=True, methods=['post'])
    def firmar_promesa(self, request, pk=None):
        from django.utils import timezone
        from .models import MovimientoInmueble
        transaccion = self.get_object()
        acepta = request.data.get('acepta', False)
        inmueble = transaccion.id_inmueble
        
        if acepta:
            transaccion.estado = 'PROMESA'
            transaccion.save()
            if inmueble:
                inmueble.estado = 'En tramite'
                inmueble.save()
                MovimientoInmueble.objects.create(
                    tipo_movimiento='Cambio Estado',
                    fecha=timezone.now(),
                    precio_momento=inmueble.precio,
                    estado_momento=None,
                    descripcion=f"El cliente aceptó la promesa (Transacción #{transaccion.id_transaccion}). Pasa a En trámite.",
                    id_inmueble=inmueble
                )
            return Response({"status": "Promesa aceptada y en trámite."})
        else:
            transaccion.estado = 'ANULADA'
            transaccion.save()
            if inmueble:
                inmueble.estado = 'Disponible'
                inmueble.save()
                MovimientoInmueble.objects.create(
                    tipo_movimiento='Cambio Estado',
                    fecha=timezone.now(),
                    precio_momento=inmueble.precio,
                    estado_momento=None,
                    descripcion=f"El cliente rechazó la promesa (Transacción #{transaccion.id_transaccion}). Vuelve a Disponible.",
                    id_inmueble=inmueble
                )
            return Response({"status": "Promesa rechazada. Transacción anulada."})

    @action(detail=True, methods=['post'])
    def firmar_contrato_arriendo(self, request, pk=None):
        from django.utils import timezone
        from .models import MovimientoInmueble
        transaccion = self.get_object()
        acepta = request.data.get('acepta', False)
        inmueble = transaccion.id_inmueble
        
        if acepta:
            transaccion.estado = 'CONTRATO'
            transaccion.save()
            if inmueble:
                inmueble.estado = 'Arrendado'
                inmueble.save()
                MovimientoInmueble.objects.create(
                    tipo_movimiento='Cambio Estado',
                    fecha=timezone.now(),
                    precio_momento=inmueble.precio,
                    estado_momento=None,
                    descripcion=f"El cliente aceptó el contrato (Transacción #{transaccion.id_transaccion}). Pasa a Arrendado.",
                    id_inmueble=inmueble
                )
            return Response({"status": "Contrato aceptado y arrendado."})
        else:
            transaccion.estado = 'ANULADA'
            transaccion.save()
            if inmueble:
                inmueble.estado = 'Disponible'
                inmueble.save()
                MovimientoInmueble.objects.create(
                    tipo_movimiento='Cambio Estado',
                    fecha=timezone.now(),
                    precio_momento=inmueble.precio,
                    estado_momento=None,
                    descripcion=f"El cliente rechazó el contrato (Transacción #{transaccion.id_transaccion}). Vuelve a Disponible.",
                    id_inmueble=inmueble
                )
            return Response({"status": "Contrato rechazado. Transacción anulada."})

    @action(detail=True, methods=['post'])
    def cancelar_tramite(self, request, pk=None):
        try:
            from django.utils import timezone
            from .models import MovimientoInmueble
            transaccion = self.get_object()
            inmueble = transaccion.id_inmueble
            
            transaccion.estado = 'ANULADA'
            transaccion.save()
            
            if inmueble:
                inmueble.estado = 'Disponible'
                inmueble.save()
                MovimientoInmueble.objects.create(
                    tipo_movimiento='Cambio Estado',
                    fecha=timezone.now(),
                    precio_momento=inmueble.precio,
                    estado_momento=None,
                    descripcion=f"El cliente canceló el trámite (Transacción #{transaccion.id_transaccion}). Vuelve a Disponible.",
                    id_inmueble=inmueble
                )
            return Response({"status": "Trámite cancelado."})
        except Exception as e:
            import traceback
            print("Error en cancelar_tramite:", e)
            return Response({"error": "Excepción al cancelar", "detalles": str(e), "traceback": traceback.format_exc()}, status=500)

    def perform_destroy(self, instance):
        from django.utils import timezone
        from .models import MovimientoInmueble
        
        if instance.id_inmueble:
            inmueble = instance.id_inmueble
            inmueble.estado = 'Disponible'
            inmueble.save()
            
            MovimientoInmueble.objects.create(
                tipo_movimiento='Cambio Estado',
                fecha=timezone.now(),
                precio_momento=inmueble.precio,
                estado_momento=None,
                descripcion=f"Transacción #{instance.id_transaccion} eliminada. Inmueble liberado.",
                id_inmueble=inmueble
            )
            
        instance.delete()

class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer

class CitaViewSet(viewsets.ModelViewSet):
    queryset = Cita.objects.all()
    serializer_class = CitaSerializer

    def get_queryset(self):
        qs = Cita.objects.all().order_by('-fecha_hora')
        user = self.request.user
        if user.is_authenticated:
            if hasattr(user, 'empleado'):
                if user.empleado.tipo_empleado.lower() == 'agente':
                    qs = qs.filter(id_empleado=user.empleado)
            elif hasattr(user, 'cliente'):
                qs = qs.filter(id_cliente=user.cliente)
        return qs

    @action(detail=True, methods=['post'])
    def cancelar_agente(self, request, pk=None):
        try:
            from django.core.mail import EmailMultiAlternatives
            from django.utils import timezone
            import threading
            
            cita = self.get_object()
            motivo = request.data.get('motivo', 'Motivo no especificado')
            
            cita.estado = 'PROGRAMADA'
            cita.id_empleado = None
            cita.save()
            
            def send_cancel_email(cliente_email, cliente_nombre, agente_nombre, fecha, motivo):
                subject = "Cita Cancelada por el Agente - IngAya"
                html_content = f"""
                <div style='font-family: Arial, sans-serif; padding: 20px;'>
                    <h2 style='color: #ef4444;'>Cita Cancelada</h2>
                    <p>Hola <strong>{cliente_nombre}</strong>,</p>
                    <p>Lamentamos informarte que tu cita programada para el <strong>{fecha}</strong> ha sido cancelada por nuestro agente <strong>{agente_nombre}</strong>.</p>
                    <p><strong>Motivo de la cancelación:</strong></p>
                    <blockquote style='border-left: 4px solid #ef4444; padding-left: 10px; color: #555;'>{motivo}</blockquote>
                    <p>Por favor, ponte en contacto con nosotros o programa una nueva cita a través de nuestra plataforma.</p>
                    <p>Saludos cordiales,<br>Equipo IngAya</p>
                </div>
                """
                text_content = f"Hola {cliente_nombre}, tu cita para el {fecha} ha sido cancelada por el agente {agente_nombre}. Motivo: {motivo}."
                msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [cliente_email])
                msg.attach_alternative(html_content, "text/html")
                msg.send()

            cliente_email = cita.id_cliente.id_usuario.email if cita.id_cliente and cita.id_cliente.id_usuario else None
            if cliente_email:
                fecha_str = timezone.localtime(cita.fecha_hora).strftime('%Y-%m-%d %I:%M %p')
                agente_nombre = cita.id_empleado.nombre if cita.id_empleado else "nuestro agente"
                cliente_nombre = cita.id_cliente.nombre
                
                t = threading.Thread(target=send_cancel_email, args=(
                    cliente_email, cliente_nombre, agente_nombre, fecha_str, motivo
                ))
                t.start()
                
            return Response({"status": "Cita cancelada y cliente notificado"})
        except Exception as e:
            import traceback
            return Response({"error": "Excepción al cancelar", "detalles": str(e), "traceback": traceback.format_exc()}, status=500)

    @action(detail=True, methods=['post'])
    def confirmar_agente(self, request, pk=None):
        try:
            cita = self.get_object()
            cita.estado = 'CONFIRMADA'
            cita.save()
            return Response({"status": "Cita confirmada"})
        except Exception as e:
            if "1265" in str(e) or "Data truncated" in str(e) or "DataError" in str(e.__class__.__name__):
                try:
                    from django.db import connection
                    with connection.cursor() as cursor:
                        cursor.execute("ALTER TABLE cita MODIFY estado VARCHAR(20)")
                    cita.save()
                    return Response({"status": "Cita confirmada"})
                except Exception as alter_e:
                    import traceback
                    return Response({"error": "No se pudo alterar la columna estado", "detalles": str(alter_e), "traceback": traceback.format_exc()}, status=500)
            
            import traceback
            return Response({"error": "Excepción al confirmar", "detalles": str(e), "traceback": traceback.format_exc()}, status=500)

    @action(detail=True, methods=['post'])
    def asignar_agente(self, request, pk=None):
        try:
            from django.core.mail import EmailMultiAlternatives
            from django.template.loader import render_to_string
            from django.utils import timezone
            import threading
            from .models import Empleado
            
            cita = self.get_object()
            id_agente = request.data.get('id_empleado')
            if not id_agente:
                return Response({"error": "Debe proporcionar id_empleado"}, status=400)
                
            try:
                agente = Empleado.objects.get(pk=id_agente)
                cita.id_empleado = agente
                # Mantener el estado como estaba (PROGRAMADA)
                cita.save()
                
                def send_assigned_email(agente_email, agente_nombre, cliente_nombre, fecha, desc):
                    subject = "Nueva Cita Asignada - IngAya"
                    context = {
                        'agente_nombre': agente_nombre,
                        'cliente_nombre': cliente_nombre,
                        'fecha_hora': fecha,
                        'descripcion': desc
                    }
                    html_content = render_to_string('emails/cita_asignada_agente.html', context)
                    text_content = render_to_string('emails/cita_asignada_agente.txt', context)
                    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [agente_email])
                    msg.attach_alternative(html_content, "text/html")
                    msg.send()

                def send_assigned_email_client(cliente_email, agente_nombre, cliente_nombre, fecha, desc):
                    subject = "Su cita ha sido confirmada - IngAya"
                    context = {
                        'agente_nombre': agente_nombre,
                        'cliente_nombre': cliente_nombre,
                        'fecha_hora': fecha,
                        'descripcion': desc
                    }
                    html_content = render_to_string('emails/cita_confirmada_cliente.html', context)
                    text_content = render_to_string('emails/cita_confirmada_cliente.txt', context)
                    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [cliente_email])
                    msg.attach_alternative(html_content, "text/html")
                    msg.send()

                fecha_str = timezone.localtime(cita.fecha_hora).strftime('%Y-%m-%d %I:%M %p')

                if agente.correo:
                    t1 = threading.Thread(target=send_assigned_email, args=(
                        agente.correo,
                        agente.nombre,
                        cita.id_cliente.nombre if cita.id_cliente else "Desconocido",
                        fecha_str,
                        cita.descripcion
                    ))
                    t1.start()

                cliente_email = cita.id_cliente.id_usuario.email if cita.id_cliente and cita.id_cliente.id_usuario else None
                if cliente_email:
                    t2 = threading.Thread(target=send_assigned_email_client, args=(
                        cliente_email,
                        agente.nombre,
                        cita.id_cliente.nombre,
                        fecha_str,
                        cita.descripcion
                    ))
                    t2.start()
                    
                return Response({"status": "Agente asignado y notificado"})
            except Empleado.DoesNotExist:
                return Response({"error": "Agente no encontrado"}, status=404)
        except Exception as e:
            import traceback
            return Response({"error": "Excepción en servidor", "detalles": str(e), "traceback": traceback.format_exc()}, status=500)

    @action(detail=True, methods=['post'])
    def finalizar_cita(self, request, pk=None):
        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        from django.utils import timezone
        import threading
        
        cita = self.get_object()
        cita.estado = 'FINALIZADA'
        cita.save()
        
        def send_final_email(cliente_email, cliente_nombre, agente_nombre, fecha):
            subject = "Gracias por tu Visita - IngAya"
            context = {
                'cliente_nombre': cliente_nombre,
                'agente_nombre': agente_nombre,
                'fecha_hora': fecha
            }
            html_content = render_to_string('emails/cita_finalizada.html', context)
            text_content = render_to_string('emails/cita_finalizada.txt', context)
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [cliente_email])
            msg.attach_alternative(html_content, "text/html")
            msg.send()

        cliente_email = cita.id_cliente.id_usuario.email if cita.id_cliente and cita.id_cliente.id_usuario else None
        if cliente_email:
            t = threading.Thread(target=send_final_email, args=(
                cliente_email,
                cita.id_cliente.nombre,
                cita.id_empleado.nombre if cita.id_empleado else "nuestro agente",
                timezone.localtime(cita.fecha_hora).strftime('%Y-%m-%d %I:%M %p')
            ))
            t.start()
            
        return Response({"status": "Cita finalizada y cliente notificado"})

    @action(detail=True, methods=['post'])
    def no_asistio(self, request, pk=None):
        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string
        from django.utils import timezone
        import threading
        
        cita = self.get_object()
        cita.estado = 'NO_ASISTIO'
        cita.save()
        
        def send_noshow_email(cliente_email, cliente_nombre, agente_nombre, fecha):
            subject = "Inasistencia a tu Cita - IngAya"
            context = {
                'cliente_nombre': cliente_nombre,
                'agente_nombre': agente_nombre,
                'fecha_hora': fecha
            }
            html_content = render_to_string('emails/cita_no_asistio.html', context)
            text_content = render_to_string('emails/cita_no_asistio.txt', context)
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [cliente_email])
            msg.attach_alternative(html_content, "text/html")
            msg.send()

        cliente_email = cita.id_cliente.id_usuario.email if cita.id_cliente and cita.id_cliente.id_usuario else None
        if cliente_email:
            t = threading.Thread(target=send_noshow_email, args=(
                cliente_email,
                cita.id_cliente.nombre,
                cita.id_empleado.nombre if cita.id_empleado else "nuestro agente",
                timezone.localtime(cita.fecha_hora).strftime('%Y-%m-%d %I:%M %p')
            ))
            t.start()
            
        return Response({"status": "Incomparecencia registrada y cliente notificado"})

    @action(detail=False, methods=['get'])
    def fechas_ocupadas(self, request):
        from django.db.models import Count
        from django.db.models.functions import TruncDate
        
        ocupadas = Cita.objects.exclude(estado='CANCELADA').annotate(
            fecha=TruncDate('fecha_hora')
        ).values('fecha').annotate(
            clientes_distintos=Count('id_cliente', distinct=True)
        ).filter(clientes_distintos__gte=5)
        
        fechas = [obj['fecha'].strftime('%Y-%m-%d') for obj in ocupadas if obj['fecha']]
        return Response(fechas)
        
    @action(detail=False, methods=['get'])
    def horas_ocupadas(self, request):
        from django.utils import timezone
        import datetime
        
        fecha_str = request.query_params.get('fecha')
        if not fecha_str:
            return Response([])
            
        try:
            fecha_obj = datetime.datetime.strptime(fecha_str, '%Y-%m-%d')
            start_date = timezone.make_aware(fecha_obj)
            end_date = start_date + datetime.timedelta(days=1)
            
            citas = Cita.objects.filter(fecha_hora__gte=start_date, fecha_hora__lt=end_date).exclude(estado='CANCELADA')
            horas = [timezone.localtime(cita.fecha_hora).strftime('%H:%M') for cita in citas if cita.fecha_hora]
            
            return Response(horas)
        except Exception as e:
            print("Error en horas_ocupadas:", e)
            return Response([])


def enviar_correo_contacto(nombre, email, telefono, mensaje):
    try:
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        asunto = f"Nuevo mensaje de contacto de {nombre}"
        remitente = settings.DEFAULT_FROM_EMAIL
        destinatario = [settings.DEFAULT_FROM_EMAIL]
        
        html_content = f"""
        <h2>Nuevo mensaje desde la página web</h2>
        <p><strong>Nombre:</strong> {nombre}</p>
        <p><strong>Correo:</strong> {email}</p>
        <p><strong>Teléfono:</strong> {telefono}</p>
        <p><strong>Mensaje:</strong><br>{mensaje}</p>
        """
        text_content = f"Nombre: {nombre}\nCorreo: {email}\nTeléfono: {telefono}\nMensaje:\n{mensaje}"
        
        msg = EmailMultiAlternatives(asunto, text_content, remitente, destinatario)
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
    except Exception as e:
        print(f"Error enviando correo de contacto: {e}")

class ContactoView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        import threading
        nombre = request.data.get('nombre')
        email = request.data.get('email')
        telefono = request.data.get('telefono', 'No proporcionado')
        mensaje = request.data.get('mensaje')
        
        if not nombre or not email or not mensaje:
            return Response({'error': 'Faltan datos requeridos'}, status=status.HTTP_400_BAD_REQUEST)
            
        hilo = threading.Thread(target=enviar_correo_contacto, args=(nombre, email, telefono, mensaje))
        hilo.start()
        
        return Response({'mensaje': 'Contacto enviado correctamente'}, status=status.HTTP_200_OK)
