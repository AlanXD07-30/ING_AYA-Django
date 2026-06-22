
import os

with open(r'C:\Users\Pepe\Desktop\ING_AYA-Django\MiProyectoDjango\BACK-END\api\views.py', 'a', encoding='utf-8') as f:
    f.write('''

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
        text_content = f"Nombre: {nombre}\\nCorreo: {email}\\nTeléfono: {telefono}\\nMensaje:\\n{mensaje}"
        
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
''')
print('Added ContactoView to views.py')
