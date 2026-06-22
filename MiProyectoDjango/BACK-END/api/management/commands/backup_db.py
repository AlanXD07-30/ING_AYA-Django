from django.core.management.base import BaseCommand
from django.core.mail import EmailMessage
from django.conf import settings
from django.core.management import call_command
import io
import datetime

class Command(BaseCommand):
    help = 'Crea un backup de la base de datos en JSON y lo envía por correo electrónico'

    def handle(self, *args, **options):
        self.stdout.write("Generando backup de la base de datos en formato JSON...")
        
        # Generar el backup en memoria
        output = io.StringIO()
        try:
            call_command('dumpdata', indent=2, stdout=output, natural_foreign=True, natural_primary=True, exclude=['contenttypes', 'auth.Permission'])
            backup_content = output.getvalue()
        except Exception as e:
            self.stderr.write(f"Error generando el backup: {e}")
            return
            
        # Preparar el correo
        fecha = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"backup_ingaya_{fecha}.json"
        
        self.stdout.write("Enviando correo con el backup...")
        
        email = EmailMessage(
            subject=f'Backup Automático de Base de Datos - {fecha}',
            body='Adjunto se encuentra el backup automático de la base de datos en formato JSON.\n\nEste archivo puede ser utilizado para restaurar los datos usando el comando loaddata de Django en caso de emergencia.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.DEFAULT_FROM_EMAIL], # Enviar al correo principal del sistema
        )
        
        # Adjuntar el archivo JSON generado
        email.attach(filename, backup_content, 'application/json')
        
        try:
            email.send(fail_silently=False)
            self.stdout.write(self.style.SUCCESS(f"Backup {filename} generado y enviado con éxito al correo {settings.DEFAULT_FROM_EMAIL}!"))
        except Exception as e:
            self.stderr.write(f"Error enviando el correo con el backup: {e}")
