# mailer.py
import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

# Leer configuración desde variables de entorno
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_NAME = os.getenv("FROM_NAME", "Ing Aya")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
URL_LOGIN = os.getenv("URL_LOGIN", "http://127.0.0.1:5000/login")

# Jinja2 environment (templates/email/)
env = Environment(
    loader=FileSystemLoader("templates/email"),
    autoescape=select_autoescape(['html', 'xml'])
)

def render_template(template_name: str, context: dict) -> str:
    tpl = env.get_template(template_name)
    return tpl.render(**context)

def create_message(to_email: str, subject: str, html_body: str, plain_body: str = "") -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    if plain_body:
        msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    return msg

def send_message(msg: MIMEMultipart, to_email: str) -> bool:
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        logger.info("Correo enviado a %s", to_email)
        return True
    except Exception as e:
        logger.exception("Error enviando correo a %s: %s", to_email, e)
        return False

# Funciones específicas para los 3 casos
def send_user_created(email: str, nombre: str, rol: str, contrasena: str) -> bool:
    subject = "Bienvenido a Ing Aya — Registro exitoso"
    ctx = {
        "nombre": nombre or email,
        "rol": rol,
        "contrasena": contrasena,
        "url_login": URL_LOGIN,
        "soporte_email": FROM_EMAIL
    }
    html = render_template("usuario_creado.html", ctx)
    plain = f"Hola {ctx['nombre']},\nTu cuenta con rol {rol} ha sido creada.\nUsuario: {email}\nContraseña: {contrasena}\nIngresa en: {URL_LOGIN}\nSoporte: {ctx['soporte_email']}"
    msg = create_message(email, subject, html, plain)
    return send_message(msg, email)

def send_user_edited(email: str, nombre: str, rol: str, cambios: str) -> bool:
    subject = "Actualización de tu cuenta - Ing Aya"
    ctx = {
        "nombre": nombre or email,
        "rol": rol,
        "cambios": cambios,
        "url_login": URL_LOGIN,
        "soporte_email": FROM_EMAIL
    }
    html = render_template("usuario_editado.html", ctx)
    plain = f"Hola {ctx['nombre']},\nTu cuenta ha sido actualizada.\nCambios: {cambios}\nIngresa en: {URL_LOGIN}\nSoporte: {ctx['soporte_email']}"
    msg = create_message(email, subject, html, plain)
    return send_message(msg, email)

def send_user_deleted(email: str, nombre: str) -> bool:
    subject = "Cuenta eliminada - Ing Aya"
    ctx = {
        "nombre": nombre or email,
        "soporte_email": FROM_EMAIL
    }
    html = render_template("usuario_eliminado.html", ctx)
    plain = f"Hola {ctx['nombre']},\nTu cuenta asociada a {email} ha sido eliminada.\nSi crees que esto es un error, contacta: {ctx['soporte_email']}"
    msg = create_message(email, subject, html, plain)
    return send_message(msg, email)

