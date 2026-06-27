# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.IntegerField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.IntegerField()
    is_active = models.IntegerField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


class Cita(models.Model):
    id_cita = models.BigAutoField(primary_key=True)
    fecha_hora = models.DateTimeField()
    estado = models.CharField(max_length=20, default='PENDIENTE')
    descripcion = models.TextField(blank=True, null=True)
    id_cliente = models.ForeignKey('Cliente', models.CASCADE, db_column='id_cliente', blank=True, null=True)
    id_empleado = models.ForeignKey('Empleado', models.DO_NOTHING, db_column='id_empleado', blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'cita'
        unique_together = (('fecha_hora', 'id_empleado'),)


class Cliente(models.Model):
    id_cliente = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    identificacion = models.CharField(unique=True, max_length=20)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    foto_perfil = models.ImageField(upload_to='perfiles/', blank=True, null=True)
    id_usuario = models.OneToOneField('auth.User', models.DO_NOTHING, db_column='id_usuario', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'cliente'


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.PositiveSmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class Empleado(models.Model):
    id_empleado = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    identificacion = models.CharField(unique=True, max_length=20)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    correo = models.CharField(max_length=150, unique=True, blank=True, null=True)
    tipo_empleado = models.CharField(max_length=50)
    id_usuario = models.OneToOneField('auth.User', models.DO_NOTHING, db_column='id_usuario', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'empleado'


class ImagenInmueble(models.Model):
    id_imagen = models.AutoField(primary_key=True)
    url_imagen = models.TextField()
    es_principal = models.IntegerField(blank=True, null=True)
    id_inmueble = models.ForeignKey('Inmueble', models.DO_NOTHING, db_column='id_inmueble', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'imagen_inmueble'


class Inmueble(models.Model):
    id_inmueble = models.BigAutoField(primary_key=True)
    direccion = models.CharField(max_length=255)
    barrio = models.CharField(max_length=100, blank=True, null=True)
    ciudad = models.CharField(max_length=100, blank=True, null=True)
    precio = models.DecimalField(max_digits=15, decimal_places=2)
    estado = models.CharField(max_length=13, blank=True, null=True)
    metraje = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    tipo_inmueble = models.CharField(max_length=11, choices=[('Casa', 'Casa'), ('Apartamento', 'Apartamento')])
    id_empleado_encargado = models.ForeignKey(Empleado, models.DO_NOTHING, db_column='id_empleado_encargado', blank=True, null=True)
    fecha_registro = models.DateTimeField()
    tipo_operacion = models.CharField(max_length=8)
    habitaciones = models.IntegerField(blank=True, null=True, default=0)
    banos = models.IntegerField(blank=True, null=True, default=0)
    garajes = models.IntegerField(blank=True, null=True, default=0)
    estrato = models.IntegerField(blank=True, null=True, default=0)
    descripcion = models.TextField(blank=True, null=True)
    caracteristicas = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'inmueble'


class MovimientoInmueble(models.Model):
    id_movimiento = models.BigAutoField(primary_key=True)
    tipo_movimiento = models.CharField(max_length=13)
    fecha = models.DateTimeField()
    precio_momento = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    estado_momento = models.CharField(max_length=13, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    id_inmueble = models.ForeignKey(Inmueble, models.DO_NOTHING, db_column='id_inmueble', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'movimiento_inmueble'


class Pago(models.Model):
    id_pago = models.BigAutoField(primary_key=True)
    fecha_pago = models.DateTimeField()
    monto = models.DecimalField(max_digits=15, decimal_places=2)
    metodo_pago = models.CharField(max_length=15)
    estado_pago = models.CharField(max_length=11, blank=True, null=True)
    id_transaccion = models.ForeignKey('Transaccion', models.DO_NOTHING, db_column='id_transaccion', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'pago'


class Transaccion(models.Model):
    id_transaccion = models.BigAutoField(primary_key=True)
    fecha = models.DateTimeField()
    tipo_operacion = models.CharField(max_length=8)
    valor_total = models.DecimalField(max_digits=15, decimal_places=2)
    estado = models.CharField(max_length=10, blank=True, null=True)
    id_cliente = models.ForeignKey(Cliente, models.CASCADE, db_column='id_cliente', blank=True, null=True)
    id_inmueble = models.ForeignKey(Inmueble, models.DO_NOTHING, db_column='id_inmueble', blank=True, null=True)
    id_empleado = models.ForeignKey(Empleado, models.DO_NOTHING, db_column='id_empleado', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transaccion'


class InmuebleFavorito(models.Model):
    id_favorito = models.BigAutoField(primary_key=True)
    id_cliente = models.ForeignKey(Cliente, models.CASCADE, db_column='id_cliente')
    id_inmueble = models.ForeignKey(Inmueble, models.CASCADE, db_column='id_inmueble')
    fecha_agregado = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'inmueble_favorito'
        unique_together = (('id_cliente', 'id_inmueble'),)
