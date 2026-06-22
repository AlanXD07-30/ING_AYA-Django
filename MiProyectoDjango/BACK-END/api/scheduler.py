from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore, register_events
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import datetime
import threading
import sys

def cancel_expired_appointments():
    from .models import Cita
    
    # 20 minutes ago
    now = timezone.now()
    limite_creacion = now - datetime.timedelta(minutes=20)
    
    # Buscar citas que se crearon hace más de 20 min, no tienen agente, y siguen PROGRAMADAS
    citas_a_cancelar = Cita.objects.filter(
        estado='PROGRAMADA',
        id_empleado__isnull=True,
        fecha_creacion__lte=limite_creacion
    )
    
    for cita in citas_a_cancelar:
        cita.estado = 'CANCELADA'
        cita.descripcion = str(cita.descripcion or "") + " (Cancelada automáticamente por falta de asignación tras 20 minutos)"
        cita.save()
        
        def send_cancel_email(cliente_email, nombre, fecha):
            subject = "Aviso de Cancelación de Cita - IngAya"
            context = {'cliente_nombre': nombre, 'fecha_hora': fecha}
            html_content = render_to_string('emails/cita_cancelada_automatica.html', context)
            text_content = render_to_string('emails/cita_cancelada_automatica.txt', context)
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [cliente_email])
            msg.attach_alternative(html_content, "text/html")
            msg.send()

        if cita.id_cliente and cita.id_cliente.correo:
            t = threading.Thread(target=send_cancel_email, args=(
                cita.id_cliente.correo,
                cita.id_cliente.nombre,
                timezone.localtime(cita.fecha_hora).strftime('%Y-%m-%d %I:%M %p')
            ))
            t.start()


def start():
    # Evitar arrancar el scheduler en comandos como migrate
    if 'runserver' not in sys.argv and 'gunicorn' not in sys.argv and not any('wsgi' in arg for arg in sys.argv):
        return

    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(), "default")
    
    # Revisar cada 1 minuto
    scheduler.add_job(
        cancel_expired_appointments,
        'interval',
        minutes=1,
        name='cancel_expired_appointments_job',
        jobstore='default',
        replace_existing=True
    )
    
    register_events(scheduler)
    scheduler.start()
    print("Scheduler started...", flush=True)
