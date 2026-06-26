from rest_framework import serializers
from .models import Cliente, Inmueble, InmuebleFavorito, Empleado
from django.contrib.auth.models import User
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import threading

class ClienteSerializer(serializers.ModelSerializer):
    email = serializers.CharField(source='id_usuario.email', read_only=True)
    
    class Meta:
        model = Cliente
        fields = '__all__'

class InmuebleSerializer(serializers.ModelSerializer):
    imagen_principal = serializers.SerializerMethodField()

    class Meta:
        model = Inmueble
        fields = '__all__'

    def get_imagen_principal(self, obj):
        try:
            from .models import ImagenInmueble
            img = ImagenInmueble.objects.filter(id_inmueble=obj, es_principal=1).first()
            if not img:
                img = ImagenInmueble.objects.filter(id_inmueble=obj).first()
            if img:
                url_str = str(img.url_imagen)
                if url_str.startswith('http'):
                    return url_str
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(url_str)
                return 'https://ingaya-django-production.up.railway.app' + url_str
        except Exception:
            pass
        return None

class InmuebleFavoritoSerializer(serializers.ModelSerializer):
    inmueble_detalle = InmuebleSerializer(source='id_inmueble', read_only=True)
    
    class Meta:
        model = InmuebleFavorito
        fields = '__all__'

from .models import MovimientoInmueble

class MovimientoInmuebleSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoInmueble
        fields = '__all__'

class RegistroSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(write_only=True)
    identificacion = serializers.CharField(write_only=True)
    telefono = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    direccion = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    fecha_nacimiento = serializers.DateField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'nombre', 'identificacion', 'telefono', 'direccion', 'fecha_nacimiento']
        extra_kwargs = {'password': {'write_only': True}} 

    def validate(self, data):
        email = data.get('email')
        identificacion = data.get('identificacion')

        if User.objects.filter(email=email).exists() or User.objects.filter(username=email).exists():
            raise serializers.ValidationError({"email": "Ya existe un usuario con este correo electrónico."})

        from .models import Cliente
        if Cliente.objects.filter(identificacion=identificacion).exists():
            raise serializers.ValidationError({"identificacion": "Esta identificación ya está registrada."})

        return data

    def create(self, validated_data):
        nombre = validated_data.pop('nombre', '')
        identificacion = validated_data.pop('identificacion', '')
        telefono = validated_data.pop('telefono', None)
        direccion = validated_data.pop('direccion', None)
        fecha_nacimiento = validated_data.pop('fecha_nacimiento', None)

        # 1. Creamos al usuario súper seguro en Django
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # 2. Creamos su perfil de Cliente conectado a este usuario
        from .models import Cliente 
        Cliente.objects.create(
            nombre=nombre, 
            identificacion=identificacion,
            telefono=telefono,
            direccion=direccion,
            fecha_nacimiento=fecha_nacimiento,
            id_usuario=user
        )
        
        # 3. Disparamos el correo de bienvenida en un hilo separado para no bloquear el registro
        def enviar_correo_bienvenida(email_destino, nombre_usuario):
            try:
                asunto = "¡Bienvenido a IngAya! Tu hogar de confianza"
                remitente = f"IngAya <{settings.EMAIL_HOST_USER}>"
                destinatario = [email_destino]

                # Renderizar HTML y texto plano
                contexto = {'nombre': nombre_usuario}
                html_content = render_to_string('emails/bienvenida.html', contexto)
                text_content = render_to_string('emails/bienvenida.txt', contexto)

                msg = EmailMultiAlternatives(asunto, text_content, remitente, destinatario)
                msg.attach_alternative(html_content, "text/html")
                msg.send()
            except Exception as e:
                print(f"Error al enviar correo: {e}")

        hilo_correo = threading.Thread(target=enviar_correo_bienvenida, args=(user.email, nombre))
        hilo_correo.start()

        return user
class EmpleadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empleado
        fields = '__all__'


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
    cliente_nombre = serializers.CharField(source='id_cliente.nombre', read_only=True)
    empleado_nombre = serializers.CharField(source='id_empleado.nombre', read_only=True)

    class Meta:
        model = Cita
        fields = '__all__'
