# -*- coding: utf-8 -*-
from flask import Flask, render_template, request, redirect, session, url_for, flash, make_response, abort
import psycopg2
from werkzeug.utils import secure_filename
import os
from decimal import Decimal
import io
from datetime import datetime


# WeasyPrint (opcional)
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except Exception:
    WEASYPRINT_AVAILABLE = False

# ReportLab (opcional fallback)
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    REPORTLAB_AVAILABLE = True
except Exception:
    REPORTLAB_AVAILABLE = False

app = Flask(__name__)
app.secret_key = "clave_super_secreta"

# Configuración de uploads
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.logger.setLevel('DEBUG')

# Asegurar que la carpeta de uploads exista
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/logout')
def logout():
    return redirect("http://127.0.0.1:5500/PAGINA%20PRINCIPAL%20INMUEBLES%20ING%20AYA/Index.html")

# ---------------- Rutas paneles existentes ----------------
@app.route("/admin")
def admin():
    return render_template("panel administrador.html")

@app.route("/empleado")
def empleado():
    return render_template("panel empleado.html")

@app.route("/secretaria")
def secretaria():
    return render_template("panel secretaria.html")

# ---------------- Conexión PostgreSQL ----------------
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="ingaya",
        user="postgres",
        password="123456789"
    )
    return conn

# ---------------- GESTIÓN DE USUARIOS (ADMIN) ----------------
@app.route("/admin/usuarios", methods=["GET"])
def admin_usuarios():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT u.id_usuario, u.email, u.estado, u.fecha_creacion, array_agg(r.nombre_rol) AS roles
        FROM USUARIO u
        LEFT JOIN USUARIO_ROL ur ON u.id_usuario = ur.id_usuario
        LEFT JOIN ROL r ON ur.id_rol = r.id_rol
        GROUP BY u.id_usuario
        ORDER BY u.id_usuario
    """)
    usuarios = []
    for row in cur.fetchall():
        roles_arr = row[4] if row[4] is not None else []
        if isinstance(roles_arr, (list, tuple)) and len(roles_arr) > 0 and roles_arr[0] is None:
            roles_arr = []
        usuarios.append({
            "id_usuario": row[0],
            "email": row[1],
            "estado": row[2],
            "fecha_creacion": row[3],
            "roles": roles_arr
        })
    cur.close()
    conn.close()
    return render_template("AdminOpciones/Gestion_Usuarios.html", usuarios=usuarios)

# ---------------- AGREGAR USUARIO (ADMIN) ----------------
@app.route("/admin/usuarios/agregar", methods=["POST"])
def agregar_usuario():
    email = request.form.get("email")
    contrasena = request.form.get("contrasena")
    rol = request.form.get("rol")

    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("INSERT INTO USUARIO (email, contrasena) VALUES (%s, %s) RETURNING id_usuario",
                (email, contrasena))
    id_usuario_row = cur.fetchone()
    id_usuario = id_usuario_row[0] if id_usuario_row else None
    if id_usuario is None:
        conn.rollback()
        cur.close()
        conn.close()
        return "Error al crear usuario", 500

    cur.execute("SELECT id_rol FROM ROL WHERE nombre_rol = %s", (rol,))
    role_row = cur.fetchone()
    if role_row is None:
        conn.rollback()
        cur.close()
        conn.close()
        return "Rol no encontrado", 400
    id_rol = role_row[0]

    try:
        cur.execute("INSERT INTO USUARIO_ROL (id_usuario, id_rol) VALUES (%s, %s)", (id_usuario, id_rol))

        employee_roles = ('EMPLEADO', 'SECRETARIA', 'AGENTE_INMOBILIARIO')
        if rol in employee_roles:
            nombre_empleado = request.form.get('nombre_empleado')
            identificacion_empleado = request.form.get('identificacion_empleado')
            telefono_empleado = request.form.get('telefono_empleado')
            tipo_empleado = request.form.get('tipo_empleado')

            if not nombre_empleado or not identificacion_empleado:
                conn.rollback()
                cur.close()
                conn.close()
                return "Faltan datos obligatorios para empleado (nombre/identificación)", 400

            cur.execute(
                "INSERT INTO EMPLEADO (nombre, identificacion, telefono, tipo_empleado, id_usuario) VALUES (%s, %s, %s, %s, %s)",
                (nombre_empleado, identificacion_empleado, telefono_empleado, tipo_empleado, id_usuario)
            )

        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        app.logger.exception("Error al crear usuario")
        return f"Error al crear usuario: {e}", 500

    cur.close()
    conn.close()
    return redirect("/admin/usuarios")

# ---------------- EDITAR USUARIO (ADMIN) ----------------
@app.route("/admin/usuarios/editar/<int:id_usuario>", methods=["GET", "POST"])
def editar_usuario(id_usuario):
    conn = get_db_connection()
    cur = conn.cursor()

    if request.method == "GET":
        cur.execute("SELECT id_usuario, email, estado, fecha_creacion FROM USUARIO WHERE id_usuario = %s", (id_usuario,))
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return redirect("/admin/usuarios")

        usuario = {
            "id_usuario": row[0],
            "email": row[1],
            "estado": row[2],
            "fecha_creacion": row[3]
        }

        cur.execute("SELECT nombre_rol FROM ROL ORDER BY id_rol")
        roles = [r[0] for r in cur.fetchall()]

        cur.execute("SELECT r.nombre_rol FROM ROL r JOIN USUARIO_ROL ur ON r.id_rol = ur.id_rol WHERE ur.id_usuario = %s", (id_usuario,))
        role_row = cur.fetchone()
        current_role = role_row[0] if role_row else None

        cur.close()
        conn.close()
        return render_template("AdminOpciones/editar_usuario.html", usuario=usuario, roles=roles, current_role=current_role)

    email = request.form.get("email")
    contrasena = request.form.get("contrasena")
    rol = request.form.get("rol")

    conn = get_db_connection()
    cur = conn.cursor()

    if contrasena:
        cur.execute("UPDATE USUARIO SET email = %s, contrasena = %s WHERE id_usuario = %s", (email, contrasena, id_usuario))
    else:
        cur.execute("UPDATE USUARIO SET email = %s WHERE id_usuario = %s", (email, id_usuario))

    cur.execute("SELECT id_rol FROM ROL WHERE nombre_rol = %s", (rol,))
    role_row = cur.fetchone()
    if role_row is None:
        conn.rollback()
        cur.close()
        conn.close()
        return "Rol no encontrado", 400
    id_rol = role_row[0]

    cur.execute("DELETE FROM USUARIO_ROL WHERE id_usuario = %s", (id_usuario,))
    cur.execute("INSERT INTO USUARIO_ROL (id_usuario, id_rol) VALUES (%s, %s)", (id_usuario, id_rol))

    conn.commit()
    cur.close()
    conn.close()
    return redirect("/admin/usuarios")

# ---------------- ELIMINAR USUARIO (ADMIN) ----------------
@app.route("/admin/usuarios/eliminar/<int:id_usuario>", methods=["GET", "POST"])
def eliminar_usuario(id_usuario):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id_usuario, email FROM USUARIO WHERE id_usuario = %s", (id_usuario,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return redirect('/admin/usuarios')

    usuario = {"id_usuario": row[0], "email": row[1]}

    if request.method == 'GET':
        cur.close()
        conn.close()
        return render_template('AdminOpciones/confirmar_eliminar.html', usuario=usuario)

    cur.execute("DELETE FROM USUARIO WHERE id_usuario = %s", (id_usuario,))
    conn.commit()
    cur.close()
    conn.close()
    return redirect('/admin/usuarios')

# ---------------- REPORTE DE USUARIOS (ADMIN) ----------------
@app.route("/admin/usuarios/reporte", methods=["GET", "POST"])
def admin_reporte_usuarios():
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Obtener parámetros del formulario
        mode = request.values.get("mode", "all")
        rol = request.values.get("rol", "").upper()
        selected_ids = request.values.get("selected_ids", "")

        query = """
            SELECT u.id_usuario, u.email, u.estado, u.fecha_creacion,
                   array_remove(array_agg(r.nombre_rol), NULL) AS roles
            FROM USUARIO u
            LEFT JOIN USUARIO_ROL ur ON u.id_usuario = ur.id_usuario
            LEFT JOIN ROL r ON ur.id_rol = r.id_rol
        """

        conditions = []
        params = []

        # Filtrar por usuarios seleccionados
        if mode == "selected" and selected_ids:
            ids = [int(i) for i in selected_ids.split(",") if i.strip().isdigit()]
            if ids:
                placeholders = ",".join(["%s"] * len(ids))
                conditions.append(f"u.id_usuario IN ({placeholders})")
                params.extend(ids)

        # Filtrar por rol
        elif mode == "filter" and rol:
            conditions.append("UPPER(r.nombre_rol) = %s")
            params.append(rol)

        # Construir la consulta final
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += """
            GROUP BY u.id_usuario
            ORDER BY u.id_usuario
        """

        cur.execute(query, tuple(params))
        usuarios = cur.fetchall()

    except Exception as e:
        app.logger.exception("Error al obtener usuarios para reporte (admin)")
        flash("Error al generar reporte de usuarios", "danger")
        cur.close()
        conn.close()
        return redirect(url_for('admin_usuarios'))

    cur.close()
    conn.close()

    # Renderizar HTML del reporte
    html_out = render_template(
        "AdminOpciones/reporte_usuarios.html",
        usuarios=usuarios,
        now=datetime.now(),
        mode=mode,
        rol=rol
    )

    # Generar PDF con WeasyPrint
    if WEASYPRINT_AVAILABLE:
        try:
            pdf_io = io.BytesIO()
            HTML(
                string=html_out,
                base_url=request.url_root
            ).write_pdf(
                pdf_io,
                stylesheets=[CSS(string='@page { size: A4; margin: 20mm }')]
            )

            pdf_io.seek(0)
            response = make_response(pdf_io.read())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = (
                'attachment; filename=usuarios_reporte_admin.pdf'
            )
            return response
        except Exception:
            app.logger.exception(
                "WeasyPrint error al generar PDF (admin usuarios)"
            )

    # Fallback con ReportLab
    if REPORTLAB_AVAILABLE:
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            elements = []

            elements.append(Paragraph("Reporte de Usuarios (Administrador)", styles['Title']))
            elements.append(Paragraph(f"Generado: {datetime.now()}", styles['Normal']))
            elements.append(Spacer(1, 12))

            if not usuarios:
                elements.append(Paragraph("No hay usuarios registrados.", styles['Normal']))
            else:
                data = [["ID", "Email", "Estado", "Fecha Creación", "Roles"]]
                for r in usuarios:
                    roles_str = ', '.join(r[4] or [])
                    data.append([
                        str(r[0]),
                        r[1] or "",
                        r[2] or "",
                        str(r[3] or ""),
                        roles_str
                    ])

                table = Table(data, repeatRows=1)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f4f4f4')),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ]))
                elements.append(table)

            doc.build(elements)
            buffer.seek(0)

            response = make_response(buffer.read())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = (
                'attachment; filename=usuarios_reporte_admin.pdf'
            )
            return response

        except Exception:
            app.logger.exception(
                "ReportLab error al generar PDF (admin usuarios)"
            )

    # Si no hay librerías de PDF disponibles, mostrar el HTML
    return html_out

# ---------------- LISTADO USUARIOS PARA EMPLEADO ----------------
@app.route("/empleado/usuarios", methods=["GET"])
def empleado_usuarios():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Obtener usuarios excluyendo aquellos que tengan rol ADMIN
        cur.execute("""
            SELECT u.id_usuario, u.email, u.estado, u.fecha_creacion,
                   array_remove(array_agg(r.nombre_rol), NULL) AS roles
            FROM USUARIO u
            LEFT JOIN USUARIO_ROL ur ON u.id_usuario = ur.id_usuario
            LEFT JOIN ROL r ON ur.id_rol = r.id_rol
            GROUP BY u.id_usuario
            HAVING NOT bool_or(r.nombre_rol = 'ADMIN')
            ORDER BY u.id_usuario
        """)
        usuarios = []
        for row in cur.fetchall():
            roles_arr = row[4] if row[4] is not None else []
            if isinstance(roles_arr, (list, tuple)) and len(roles_arr) > 0 and roles_arr[0] is None:
                roles_arr = []
            usuarios.append({
                "id_usuario": row[0],
                "email": row[1],
                "estado": row[2],
                "fecha_creacion": row[3],
                "roles": roles_arr
            })
        cur.close()
        conn.close()
        return render_template("EmpleadoOpciones/Gestion_Usuarios.html", usuarios=usuarios)
    except Exception as e:
        cur.close(); conn.close()
        app.logger.exception("Error al listar usuarios (empleado)")
        flash("Error al listar usuarios", "danger")
        return redirect(url_for('empleado'))


# ---------------- REPORTE DE USUARIOS (EMPLEADO) ----------------
@app.route("/empleado/usuarios/reporte", methods=["GET", "POST"])
def empleado_reporte_usuarios():
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Parámetros recibidos desde el HTML
        mode = request.values.get("mode", "all")
        selected_ids = request.values.get("selected_ids", "")
        rol = request.values.get("rol", "").strip().upper()

        # Consulta base
        query = """
            SELECT 
                u.id_usuario, 
                u.email, 
                u.estado, 
                u.fecha_creacion,
                array_remove(array_agg(r.nombre_rol), NULL) AS roles
            FROM USUARIO u
            LEFT JOIN USUARIO_ROL ur ON u.id_usuario = ur.id_usuario
            LEFT JOIN ROL r ON ur.id_rol = r.id_rol
        """

        where_clauses = []
        params = []

        # Filtrar por IDs seleccionados
        if mode == "selected" and selected_ids:
            ids = [int(x) for x in selected_ids.split(",") if x.strip().isdigit()]
            if ids:
                where_clauses.append("u.id_usuario = ANY(%s)")
                params.append(ids)

        # Construir WHERE dinámico
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        # Agrupar resultados
        query += """
            GROUP BY u.id_usuario, u.email, u.estado, u.fecha_creacion
        """

        # Condiciones HAVING
        having_clauses = [
            "NOT bool_or(r.nombre_rol = 'ADMIN')"
        ]

        # Filtrar por rol
        if rol:
            having_clauses.append(
                "bool_or(UPPER(r.nombre_rol) = %s)"
            )
            params.append(rol)

        if having_clauses:
            query += " HAVING " + " AND ".join(having_clauses)

        query += " ORDER BY u.id_usuario"

        # Ejecutar consulta
        cur.execute(query, tuple(params))
        usuarios = cur.fetchall()

    except Exception as e:
        app.logger.exception("Error al obtener usuarios para reporte (empleado)")
        flash("Error al generar reporte de usuarios", "danger")
        cur.close()
        conn.close()
        return redirect(url_for('empleado_usuarios'))

    finally:
        cur.close()
        conn.close()

    # Renderizar HTML del reporte
    html_out = render_template(
        "EmpleadoOpciones/reporte_usuarios.html",
        usuarios=usuarios,
        now=datetime.now()
    )

    # Generar PDF con WeasyPrint
    if WEASYPRINT_AVAILABLE:
        try:
            pdf_io = io.BytesIO()
            HTML(
                string=html_out,
                base_url=request.url_root
            ).write_pdf(
                pdf_io,
                stylesheets=[CSS(string='@page { size: A4; margin: 20mm }')]
            )
            pdf_io.seek(0)

            response = make_response(pdf_io.read())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = (
                'attachment; filename=usuarios_reporte_empleado.pdf'
            )
            return response
        except Exception:
            app.logger.exception(
                "WeasyPrint error al generar PDF (empleado usuarios)"
            )

    # Generar PDF con ReportLab
    if REPORTLAB_AVAILABLE:
        try:
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            elements = []

            elements.append(
                Paragraph("Reporte de Usuarios (Empleado)", styles['Title'])
            )
            elements.append(Spacer(1, 12))

            if not usuarios:
                elements.append(
                    Paragraph("No hay usuarios registrados.", styles['Normal'])
                )
            else:
                data = [["ID", "Email", "Estado", "Fecha creación", "Roles"]]

                for r in usuarios:
                    roles_str = ', '.join(r[4] or [])
                    data.append([
                        str(r[0]),
                        r[1] or "",
                        r[2] or "",
                        str(r[3] or ""),
                        roles_str
                    ])

                table = Table(data, repeatRows=1, hAlign='LEFT')
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f4f4f4')),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ]))

                elements.append(table)

            doc.build(elements)
            buffer.seek(0)

            response = make_response(buffer.read())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = (
                'attachment; filename=usuarios_reporte_empleado.pdf'
            )
            return response

        except Exception:
            app.logger.exception(
                "ReportLab error al generar PDF (empleado usuarios)"
            )

    # Si no hay librerías de PDF disponibles, devolver HTML
    return html_out

# ---------------- GESTION INMUEBLES (ADMIN) ----------------
@app.route("/admin/inmuebles")
def gestion_inmuebles():
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            i.id_inmueble, 
            i.direccion, 
            i.barrio, 
            i.ciudad, 
            i.precio, 
            i.metraje, 
            t.nombre_tipo, 
            i.tipo_operacion, 
            i.estado,
            img.url_imagen
        FROM INMUEBLE i
        JOIN TIPO_INMUEBLE t ON i.id_tipo = t.id_tipo
        LEFT JOIN IMAGEN_INMUEBLE img ON i.id_inmueble = img.id_inmueble AND img.es_principal = TRUE
        ORDER BY i.id_inmueble DESC
    """)
    inmuebles = cur.fetchall()
    
    cur.close()
    conn.close()
    return render_template("AdminOpciones/Gestion_Inmuebles.html", inmuebles=inmuebles)

# ---------------- AGREGAR INMUEBLE (ADMIN) ----------------
@app.route("/admin/inmuebles/agregar", methods=["POST"])
def agregar_inmueble():
    direccion = request.form.get('direccion', '').strip()
    barrio = request.form.get('barrio', '').strip()
    ciudad = request.form.get('ciudad', '').strip()
    precio_raw = request.form.get('precio', '').strip()
    metraje_raw = request.form.get('metraje', '').strip()
    id_tipo = request.form.get('id_tipo')
    tipo_operacion = request.form.get('tipo_operacion')
    estado = request.form.get('estado', 'DISPONIBLE')

    if not direccion or not precio_raw:
        flash('Dirección y precio son obligatorios', 'warning')
        return redirect(url_for('gestion_inmuebles'))

    try:
        precio = Decimal(precio_raw)
    except Exception:
        flash('Precio inválido', 'danger')
        return redirect(url_for('gestion_inmuebles'))

    metraje = None
    if metraje_raw:
        try:
            metraje = Decimal(metraje_raw)
        except Exception:
            flash('Metraje inválido', 'danger')
            return redirect(url_for('gestion_inmuebles'))

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO INMUEBLE (direccion, barrio, ciudad, precio, metraje, id_tipo, tipo_operacion, estado)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_inmueble
        """, (direccion, barrio, ciudad, precio, metraje, id_tipo, tipo_operacion, estado))

        row = cur.fetchone()
        if not row:
            raise Exception("No se obtuvo id del inmueble insertado")
        id_nuevo = row[0]

        file = request.files.get('imagen_principal')
        if file and file.filename:
            if allowed_file(file.filename):
                filename = secure_filename(f"inmueble_{id_nuevo}_{file.filename}")
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                file.save(save_path)

                cur.execute("""
                    INSERT INTO IMAGEN_INMUEBLE (url_imagen, es_principal, id_inmueble)
                    VALUES (%s, %s, %s)
                """, (filename, True, id_nuevo))
            else:
                flash('Formato de imagen no permitido', 'warning')

        conn.commit()
        flash('Inmueble creado correctamente', 'success')
    except Exception as e:
        conn.rollback()
        app.logger.exception("Error al registrar inmueble")
        flash(f"Error al registrar inmueble: {str(e)}", 'danger')
    finally:
        cur.close()
        conn.close()

    return redirect(url_for('gestion_inmuebles'))

# ---------------- EDITAR INMUEBLE (ADMIN) ----------------
@app.route("/admin/inmuebles/editar/<int:id_inmueble>", methods=["GET", "POST"])
def editar_inmueble(id_inmueble):
    conn = get_db_connection()
    cur = conn.cursor()

    if request.method == "GET":
        try:
            # Obtener datos del inmueble
            cur.execute("""
                SELECT id_inmueble, direccion, barrio, ciudad, precio, metraje, id_tipo, tipo_operacion, estado
                FROM INMUEBLE
                WHERE id_inmueble = %s
            """, (id_inmueble,))
            row = cur.fetchone()
            if not row:
                cur.close()
                conn.close()
                flash("Inmueble no encontrado", "warning")
                return redirect(url_for('gestion_inmuebles'))

            inmueble = {
                "id_inmueble": row[0],
                "direccion": row[1],
                "barrio": row[2],
                "ciudad": row[3],
                "precio": row[4],
                "metraje": row[5],
                "id_tipo": row[6],
                "tipo_operacion": row[7],
                "estado": row[8]
            }

            # Obtener tipos de inmueble para el select
            cur.execute("SELECT id_tipo, nombre_tipo FROM TIPO_INMUEBLE ORDER BY id_tipo")
            tipos = cur.fetchall()

            # Obtener imagen principal actual (si existe)
            cur.execute("SELECT id_imagen, url_imagen FROM IMAGEN_INMUEBLE WHERE id_inmueble = %s AND es_principal = TRUE", (id_inmueble,))
            img_row = cur.fetchone()
            imagen_principal = {"id_imagen": img_row[0], "url_imagen": img_row[1]} if img_row else None

            cur.close()
            conn.close()
            return render_template("AdminOpciones/editar_inmueble.html", inmueble=inmueble, tipos=tipos, imagen_principal=imagen_principal)
        except Exception as e:
            cur.close()
            conn.close()
            app.logger.exception("Error al obtener inmueble para editar")
            flash(f"Error al obtener inmueble: {str(e)}", "danger")
            return redirect(url_for('gestion_inmuebles'))

    # POST -> actualizar inmueble
    direccion = request.form.get('direccion', '').strip()
    barrio = request.form.get('barrio', '').strip()
    ciudad = request.form.get('ciudad', '').strip()
    precio_raw = request.form.get('precio', '').strip()
    metraje_raw = request.form.get('metraje', '').strip()
    id_tipo = request.form.get('id_tipo')
    tipo_operacion = request.form.get('tipo_operacion')
    estado = request.form.get('estado', 'DISPONIBLE')

    if not direccion or not precio_raw:
        flash('Dirección y precio son obligatorios', 'warning')
        return redirect(url_for('editar_inmueble', id_inmueble=id_inmueble))

    try:
        precio = Decimal(precio_raw)
    except Exception:
        flash('Precio inválido', 'danger')
        return redirect(url_for('editar_inmueble', id_inmueble=id_inmueble))

    metraje = None
    if metraje_raw:
        try:
            metraje = Decimal(metraje_raw)
        except Exception:
            flash('Metraje inválido', 'danger')
            return redirect(url_for('editar_inmueble', id_inmueble=id_inmueble))

    try:
        # Actualizar campos del inmueble
        cur.execute("""
            UPDATE INMUEBLE
            SET direccion = %s, barrio = %s, ciudad = %s, precio = %s, metraje = %s, id_tipo = %s, tipo_operacion = %s, estado = %s
            WHERE id_inmueble = %s
        """, (direccion, barrio, ciudad, precio, metraje, id_tipo, tipo_operacion, estado, id_inmueble))

        # Manejo de imagen nueva (si se sube)
        file = request.files.get('imagen_principal')
        if file and file.filename:
            if allowed_file(file.filename):
                # Buscar imagen principal anterior para eliminar archivo y marcar false
                cur.execute("SELECT id_imagen, url_imagen FROM IMAGEN_INMUEBLE WHERE id_inmueble = %s AND es_principal = TRUE", (id_inmueble,))
                old_img = cur.fetchone()
                if old_img:
                    old_id_img, old_filename = old_img[0], old_img[1]
                    # marcar anteriores como no principales (o eliminar fila si prefieres)
                    cur.execute("UPDATE IMAGEN_INMUEBLE SET es_principal = FALSE WHERE id_inmueble = %s", (id_inmueble,))
                    # intentar borrar archivo físico (si existe)
                    try:
                        old_path = os.path.join(app.config['UPLOAD_FOLDER'], old_filename)
                        if os.path.exists(old_path):
                            os.remove(old_path)
                    except Exception:
                        app.logger.exception("No se pudo eliminar archivo de imagen anterior")

                # Guardar nueva imagen
                filename = secure_filename(f"inmueble_{id_inmueble}_{file.filename}")
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                file.save(save_path)

                # Insertar nueva imagen como principal
                cur.execute("""
                    INSERT INTO IMAGEN_INMUEBLE (url_imagen, es_principal, id_inmueble)
                    VALUES (%s, %s, %s)
                """, (filename, True, id_inmueble))
            else:
                flash('Formato de imagen no permitido', 'warning')

        conn.commit()
        flash('Inmueble actualizado correctamente', 'success')
    except Exception as e:
        conn.rollback()
        app.logger.exception("Error al actualizar inmueble")
        flash(f"Error al actualizar inmueble: {str(e)}", "danger")
    finally:
        cur.close()
        conn.close()

    return redirect(url_for('gestion_inmuebles'))

# ---------------- ELIMINAR INMUEBLE (ADMIN) ----------------
@app.route("/admin/inmuebles/eliminar/<int:id_inmueble>", methods=["GET", "POST"])
def eliminar_inmueble(id_inmueble):
    conn = get_db_connection()
    cur = conn.cursor()

    # GET -> mostrar confirmación
    if request.method == "GET":
        try:
            cur.execute("SELECT id_inmueble, direccion, ciudad, precio FROM INMUEBLE WHERE id_inmueble = %s", (id_inmueble,))
            row = cur.fetchone()
            if not row:
                cur.close()
                conn.close()
                flash("Inmueble no encontrado", "warning")
                return redirect(url_for('gestion_inmuebles'))

            inmueble = {"id_inmueble": row[0], "direccion": row[1], "ciudad": row[2], "precio": row[3]}
            cur.close()
            conn.close()
            return render_template("AdminOpciones/confirmar_eliminar_inmueble.html", inmueble=inmueble)
        except Exception as e:
            cur.close()
            conn.close()
            app.logger.exception("Error al obtener inmueble para eliminar")
            flash(f"Error al obtener inmueble: {str(e)}", "danger")
            return redirect(url_for('gestion_inmuebles'))

    # POST -> eliminar
    try:
        # Obtener nombres de archivos asociados para borrarlos del filesystem
        cur.execute("SELECT url_imagen FROM IMAGEN_INMUEBLE WHERE id_inmueble = %s", (id_inmueble,))
        files = [r[0] for r in cur.fetchall()]

        # Eliminar el inmueble (las imágenes en BD se eliminarán por ON DELETE CASCADE)
        cur.execute("DELETE FROM INMUEBLE WHERE id_inmueble = %s", (id_inmueble,))
        conn.commit()

        # Borrar archivos físicos (si existen)
        for fname in files:
            try:
                path = os.path.join(app.config['UPLOAD_FOLDER'], fname)
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                app.logger.exception("No se pudo eliminar archivo de imagen asociado")

        flash("Inmueble eliminado correctamente", "success")
    except Exception as e:
        conn.rollback()
        app.logger.exception("Error al eliminar inmueble")
        flash(f"Error al eliminar inmueble: {str(e)}", "danger")
    finally:
        cur.close()
        conn.close()

    return redirect(url_for('gestion_inmuebles'))

# ---------------- REPORTE DE INMUEBLES (ADMIN) ----------------
@app.route("/admin/inmuebles/reporte", methods=["GET", "POST"])
def reporte_inmuebles():
    conn = get_db_connection()
    cur = conn.cursor()

    # Detectar modo: puede venir por GET o POST (form o querystring)
    mode = request.values.get('mode', '').lower()  # 'all', 'filter', 'selected' o ''
    selected_ids_raw = request.values.get('selected_ids', '')  # puede venir por POST o GET
    # Leer filtros (funciona tanto en GET como en POST)
    estado = request.values.get('estado') or None
    tipo_operacion = request.values.get('tipo_operacion') or None
    id_tipo = request.values.get('id_tipo') or None
    limit = request.values.get('limit') or None

    # Si el cliente indicó modo 'selected' y envió selected_ids -> usar esos ids
    if mode == 'selected' and selected_ids_raw:
        try:
            ids = [int(x) for x in selected_ids_raw.split(',') if x.strip().isdigit()]
        except Exception:
            flash("IDs inválidos", "danger")
            cur.close(); conn.close()
            return redirect(url_for('gestion_inmuebles'))

        if not ids:
            flash("No se recibieron inmuebles seleccionados", "warning")
            cur.close(); conn.close()
            return redirect(url_for('gestion_inmuebles'))

        placeholders = ','.join(['%s'] * len(ids))
        sql = f"""
            SELECT i.id_inmueble, i.direccion, i.barrio, i.ciudad, i.precio, i.metraje,
                   t.nombre_tipo, i.tipo_operacion, i.estado, img.url_imagen
            FROM INMUEBLE i
            LEFT JOIN TIPO_INMUEBLE t ON i.id_tipo = t.id_tipo
            LEFT JOIN IMAGEN_INMUEBLE img ON i.id_inmueble = img.id_inmueble AND img.es_principal = TRUE
            WHERE i.id_inmueble IN ({placeholders})
            ORDER BY i.id_inmueble DESC
        """
        params = tuple(ids)

    else:
        # Modo 'filter' o 'all' (o vacío): construir WHERE según filtros recibidos
        sql = """
            SELECT i.id_inmueble, i.direccion, i.barrio, i.ciudad, i.precio, i.metraje,
                   t.nombre_tipo, i.tipo_operacion, i.estado, img.url_imagen
            FROM INMUEBLE i
            LEFT JOIN TIPO_INMUEBLE t ON i.id_tipo = t.id_tipo
            LEFT JOIN IMAGEN_INMUEBLE img ON i.id_inmueble = img.id_inmueble AND img.es_principal = TRUE
        """
        where_clauses = []
        params_list = []

        # Solo agregar cláusulas si el usuario realmente envió un filtro (no vacío)
        if estado:
            where_clauses.append("i.estado = %s")
            params_list.append(estado)
        if tipo_operacion:
            where_clauses.append("i.tipo_operacion = %s")
            params_list.append(tipo_operacion)
        if id_tipo:
            # aceptar id_tipo numérico o string
            where_clauses.append("i.id_tipo = %s")
            params_list.append(id_tipo)

        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)

        sql += " ORDER BY i.id_inmueble DESC"

        if limit and str(limit).isdigit():
            sql += " LIMIT %s"
            params_list.append(int(limit))

        params = tuple(params_list)

    # Ejecutar consulta de forma segura
    try:
        cur.execute(sql, params)
        inmuebles = cur.fetchall()
    except Exception as e:
        app.logger.exception("Error al obtener inmuebles para reporte multicriterio")
        flash("Error al generar reporte", "danger")
        cur.close(); conn.close()
        return redirect(url_for('gestion_inmuebles'))

    cur.close()
    conn.close()

    # Renderizar HTML del reporte (plantilla maneja caso vacío)
    html_out = render_template("AdminOpciones/reporte_inmuebles.html", inmuebles=inmuebles, now=datetime.now())

    # Generar PDF con WeasyPrint si está disponible
    if WEASYPRINT_AVAILABLE:
        try:
            pdf_io = io.BytesIO()
            HTML(string=html_out, base_url=request.url_root).write_pdf(pdf_io, stylesheets=[CSS(string='@page { size: A4; margin: 20mm }')])
            pdf_io.seek(0)
            response = make_response(pdf_io.read())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = 'attachment; filename=inmuebles_reporte.pdf'
            return response
        except Exception:
            app.logger.exception("WeasyPrint error al generar PDF")

    # Fallback: ReportLab si está disponible (genera PDF aunque inmuebles esté vacío)
    if REPORTLAB_AVAILABLE:
        try:
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            elements = []
            elements.append(Paragraph("Reporte de Inmuebles", styles['Title']))
            elements.append(Spacer(1, 12))

            if not inmuebles:
                elements.append(Paragraph("No hay inmuebles registrados para los criterios seleccionados.", styles['Normal']))
            else:
                data = [["ID", "Dirección", "Barrio", "Ciudad", "Precio", "m²", "Tipo/Operación", "Estado"]]
                for r in inmuebles:
                    precio_str = f"${r[4]:,.2f}" if r[4] is not None else ""
                    data.append([str(r[0]), r[1] or "", r[2] or "", r[3] or "", precio_str, str(r[5] or ""), (r[6] or "") + " / " + (r[7] or ""), r[8] or ""])
                table = Table(data, repeatRows=1, hAlign='LEFT')
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f4f4f4')),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ]))
                elements.append(table)

            doc.build(elements)
            buffer.seek(0)
            response = make_response(buffer.read())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = 'attachment; filename=inmuebles_reporte.pdf'
            return response
        except Exception:
            app.logger.exception("ReportLab error al generar PDF")

    # Último recurso: devolver HTML imprimible (plantilla ya muestra mensaje si está vacía)
    return html_out

# ----------------- RUTAS PARA EMPLEADO (AGREGADAS) -----------------
# Estas rutas replican la funcionalidad del admin pero usan plantillas en EmpleadoOpciones/
# No se modifican las rutas/admin existentes; solo se añaden las del empleado.

# GESTIÓN (LISTADO) - RUTA PRINCIPAL PARA EMPLEADO
@app.route("/empleado/inmuebles")
def empleado_gestion_inmuebles():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT i.id_inmueble, i.direccion, i.barrio, i.ciudad, i.precio, i.metraje,
                   t.nombre_tipo, i.tipo_operacion, i.estado, img.url_imagen
            FROM INMUEBLE i
            JOIN TIPO_INMUEBLE t ON i.id_tipo = t.id_tipo
            LEFT JOIN IMAGEN_INMUEBLE img ON i.id_inmueble = img.id_inmueble AND img.es_principal = TRUE
            ORDER BY i.id_inmueble DESC
        """)
        inmuebles = cur.fetchall()
        cur.close()
        conn.close()
        # Usar exactamente el nombre que tienes en templates/EmpleadoOpciones/
        return render_template("EmpleadoOpciones/gestion_inmuebles.html", inmuebles=inmuebles)
    except Exception as e:
        cur.close()
        conn.close()
        app.logger.exception("Error al listar inmuebles (empleado)")
        flash("Error al listar inmuebles", "danger")
        return redirect(url_for('empleado'))

# AGREGAR INMUEBLE (EMPLEADO)
@app.route("/empleado/inmuebles/agregar", methods=["POST"])
def empleado_agregar_inmueble():
    direccion = request.form.get('direccion', '').strip()
    barrio = request.form.get('barrio', '').strip()
    ciudad = request.form.get('ciudad', '').strip()
    precio_raw = request.form.get('precio', '').strip()
    metraje_raw = request.form.get('metraje', '').strip()
    id_tipo = request.form.get('id_tipo')
    tipo_operacion = request.form.get('tipo_operacion')
    estado = request.form.get('estado', 'DISPONIBLE')

    if not direccion or not precio_raw:
        flash('Dirección y precio son obligatorios', 'warning')
        return redirect(url_for('empleado_gestion_inmuebles'))

    try:
        precio = Decimal(precio_raw)
    except Exception:
        flash('Precio inválido', 'danger')
        return redirect(url_for('empleado_gestion_inmuebles'))

    metraje = None
    if metraje_raw:
        try:
            metraje = Decimal(metraje_raw)
        except Exception:
            flash('Metraje inválido', 'danger')
            return redirect(url_for('empleado_gestion_inmuebles'))

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO INMUEBLE (direccion, barrio, ciudad, precio, metraje, id_tipo, tipo_operacion, estado)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id_inmueble
        """, (direccion, barrio, ciudad, precio, metraje, id_tipo, tipo_operacion, estado))

        row = cur.fetchone()
        if not row:
            raise Exception("No se obtuvo id del inmueble insertado")
        id_nuevo = row[0]

        file = request.files.get('imagen_principal')
        if file and file.filename:
            if allowed_file(file.filename):
                filename = secure_filename(f"inmueble_{id_nuevo}_{file.filename}")
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                file.save(save_path)

                cur.execute("""
                    INSERT INTO IMAGEN_INMUEBLE (url_imagen, es_principal, id_inmueble)
                    VALUES (%s, %s, %s)
                """, (filename, True, id_nuevo))
            else:
                flash('Formato de imagen no permitido', 'warning')

        conn.commit()
        flash('Inmueble creado correctamente', 'success')
    except Exception as e:
        conn.rollback()
        app.logger.exception("Error al registrar inmueble (empleado)")
        flash(f"Error al registrar inmueble: {str(e)}", 'danger')
    finally:
        cur.close()
        conn.close()

    return redirect(url_for('empleado_gestion_inmuebles'))

# EDITAR INMUEBLE (EMPLEADO)
@app.route("/empleado/inmuebles/editar/<int:id_inmueble>", methods=["GET", "POST"])
def empleado_editar_inmueble(id_inmueble):
    conn = get_db_connection()
    cur = conn.cursor()

    if request.method == "GET":
        try:
            cur.execute("""
                SELECT id_inmueble, direccion, barrio, ciudad, precio, metraje, id_tipo, tipo_operacion, estado
                FROM INMUEBLE
                WHERE id_inmueble = %s
            """, (id_inmueble,))
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                flash("Inmueble no encontrado", "warning")
                return redirect(url_for('empleado_gestion_inmuebles'))

            inmueble = {
                "id_inmueble": row[0],
                "direccion": row[1],
                "barrio": row[2],
                "ciudad": row[3],
                "precio": row[4],
                "metraje": row[5],
                "id_tipo": row[6],
                "tipo_operacion": row[7],
                "estado": row[8]
            }

            cur.execute("SELECT id_tipo, nombre_tipo FROM TIPO_INMUEBLE ORDER BY id_tipo")
            tipos = cur.fetchall()

            cur.execute("SELECT id_imagen, url_imagen FROM IMAGEN_INMUEBLE WHERE id_inmueble = %s AND es_principal = TRUE", (id_inmueble,))
            img_row = cur.fetchone()
            imagen_principal = {"id_imagen": img_row[0], "url_imagen": img_row[1]} if img_row else None

            cur.close(); conn.close()
            return render_template("EmpleadoOpciones/editar_inmueble.html", inmueble=inmueble, tipos=tipos, imagen_principal=imagen_principal)
        except Exception as e:
            cur.close(); conn.close()
            app.logger.exception("Error al obtener inmueble para editar (empleado)")
            flash(f"Error al obtener inmueble: {str(e)}", "danger")
            return redirect(url_for('empleado_gestion_inmuebles'))

    # POST -> actualizar inmueble (misma lógica que admin)
    direccion = request.form.get('direccion', '').strip()
    barrio = request.form.get('barrio', '').strip()
    ciudad = request.form.get('ciudad', '').strip()
    precio_raw = request.form.get('precio', '').strip()
    metraje_raw = request.form.get('metraje', '').strip()
    id_tipo = request.form.get('id_tipo')
    tipo_operacion = request.form.get('tipo_operacion')
    estado = request.form.get('estado', 'DISPONIBLE')

    if not direccion or not precio_raw:
        flash('Dirección y precio son obligatorios', 'warning')
        return redirect(url_for('empleado_editar_inmueble', id_inmueble=id_inmueble))

    try:
        precio = Decimal(precio_raw)
    except Exception:
        flash('Precio inválido', 'danger')
        return redirect(url_for('empleado_editar_inmueble', id_inmueble=id_inmueble))

    metraje = None
    if metraje_raw:
        try:
            metraje = Decimal(metraje_raw)
        except Exception:
            flash('Metraje inválido', 'danger')
            return redirect(url_for('empleado_editar_inmueble', id_inmueble=id_inmueble))

    try:
        cur.execute("""
            UPDATE INMUEBLE
            SET direccion = %s, barrio = %s, ciudad = %s, precio = %s, metraje = %s, id_tipo = %s, tipo_operacion = %s, estado = %s
            WHERE id_inmueble = %s
        """, (direccion, barrio, ciudad, precio, metraje, id_tipo, tipo_operacion, estado, id_inmueble))

        file = request.files.get('imagen_principal')
        if file and file.filename:
            if allowed_file(file.filename):
                cur.execute("SELECT id_imagen, url_imagen FROM IMAGEN_INMUEBLE WHERE id_inmueble = %s AND es_principal = TRUE", (id_inmueble,))
                old_img = cur.fetchone()
                if old_img:
                    old_id_img, old_filename = old_img[0], old_img[1]
                    cur.execute("UPDATE IMAGEN_INMUEBLE SET es_principal = FALSE WHERE id_inmueble = %s", (id_inmueble,))
                    try:
                        old_path = os.path.join(app.config['UPLOAD_FOLDER'], old_filename)
                        if os.path.exists(old_path):
                            os.remove(old_path)
                    except Exception:
                        app.logger.exception("No se pudo eliminar archivo de imagen anterior (empleado)")

                filename = secure_filename(f"inmueble_{id_inmueble}_{file.filename}")
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                file.save(save_path)

                cur.execute("""
                    INSERT INTO IMAGEN_INMUEBLE (url_imagen, es_principal, id_inmueble)
                    VALUES (%s, %s, %s)
                """, (filename, True, id_inmueble))
            else:
                flash('Formato de imagen no permitido', 'warning')

        conn.commit()
        flash('Inmueble actualizado correctamente', 'success')
    except Exception as e:
        conn.rollback()
        app.logger.exception("Error al actualizar inmueble (empleado)")
        flash(f"Error al actualizar inmueble: {str(e)}", "danger")
    finally:
        cur.close(); conn.close()

    return redirect(url_for('empleado_gestion_inmuebles'))

# ELIMINAR INMUEBLE (EMPLEADO)
@app.route("/empleado/inmuebles/eliminar/<int:id_inmueble>", methods=["GET", "POST"])
def empleado_eliminar_inmueble(id_inmueble):
    conn = get_db_connection()
    cur = conn.cursor()

    if request.method == "GET":
        try:
            cur.execute("SELECT id_inmueble, direccion, ciudad, precio FROM INMUEBLE WHERE id_inmueble = %s", (id_inmueble,))
            row = cur.fetchone()
            if not row:
                cur.close()
                conn.close()
                flash("Inmueble no encontrado", "warning")
                return redirect(url_for('empleado_gestion_inmuebles'))

            inmueble = {"id_inmueble": row[0], "direccion": row[1], "ciudad": row[2], "precio": row[3]}
            cur.close(); conn.close()
            return render_template("EmpleadoOpciones/confirmar_eliminar_inmueble.html", inmueble=inmueble)
        except Exception as e:
            cur.close(); conn.close()
            app.logger.exception("Error al obtener inmueble para eliminar (empleado)")
            flash(f"Error al obtener inmueble: {str(e)}", "danger")
            return redirect(url_for('empleado_gestion_inmuebles'))

    try:
        cur.execute("SELECT url_imagen FROM IMAGEN_INMUEBLE WHERE id_inmueble = %s", (id_inmueble,))
        files = [r[0] for r in cur.fetchall()]

        cur.execute("DELETE FROM INMUEBLE WHERE id_inmueble = %s", (id_inmueble,))
        conn.commit()

        for fname in files:
            try:
                path = os.path.join(app.config['UPLOAD_FOLDER'], fname)
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                app.logger.exception("No se pudo eliminar archivo de imagen asociado (empleado)")

        flash("Inmueble eliminado correctamente", "success")
    except Exception as e:
        conn.rollback()
        app.logger.exception("Error al eliminar inmueble (empleado)")
        flash(f"Error al eliminar inmueble: {str(e)}", "danger")
    finally:
        cur.close()
        conn.close()

    return redirect(url_for('empleado_gestion_inmuebles'))

# REPORTE DE INMUEBLES (EMPLEADO)
@app.route("/empleado/inmuebles/reporte", methods=["GET", "POST"])
def empleado_reporte_inmuebles():
    conn = get_db_connection()
    cur = conn.cursor()

    mode = request.values.get('mode', '').lower()
    selected_ids_raw = request.values.get('selected_ids', '')
    estado = request.values.get('estado') or None
    tipo_operacion = request.values.get('tipo_operacion') or None
    id_tipo = request.values.get('id_tipo') or None
    limit = request.values.get('limit') or None

    if mode == 'selected' and selected_ids_raw:
        try:
            ids = [int(x) for x in selected_ids_raw.split(',') if x.strip().isdigit()]
        except Exception:
            flash("IDs inválidos", "danger")
            cur.close(); conn.close()
            return redirect(url_for('empleado_gestion_inmuebles'))

        if not ids:
            flash("No se recibieron inmuebles seleccionados", "warning")
            cur.close(); conn.close()
            return redirect(url_for('empleado_gestion_inmuebles'))

        placeholders = ','.join(['%s'] * len(ids))
        sql = f"""
            SELECT i.id_inmueble, i.direccion, i.barrio, i.ciudad, i.precio, i.metraje,
                   t.nombre_tipo, i.tipo_operacion, i.estado, img.url_imagen
            FROM INMUEBLE i
            LEFT JOIN TIPO_INMUEBLE t ON i.id_tipo = t.id_tipo
            LEFT JOIN IMAGEN_INMUEBLE img ON i.id_inmueble = img.id_inmueble AND img.es_principal = TRUE
            WHERE i.id_inmueble IN ({placeholders})
            ORDER BY i.id_inmueble DESC
        """
        params = tuple(ids)
    else:
        sql = """
            SELECT i.id_inmueble, i.direccion, i.barrio, i.ciudad, i.precio, i.metraje,
                   t.nombre_tipo, i.tipo_operacion, i.estado, img.url_imagen
            FROM INMUEBLE i
            LEFT JOIN TIPO_INMUEBLE t ON i.id_tipo = t.id_tipo
            LEFT JOIN IMAGEN_INMUEBLE img ON i.id_inmueble = img.id_inmueble AND img.es_principal = TRUE
        """
        where_clauses = []
        params_list = []

        if estado:
            where_clauses.append("i.estado = %s")
            params_list.append(estado)
        if tipo_operacion:
            where_clauses.append("i.tipo_operacion = %s")
            params_list.append(tipo_operacion)
        if id_tipo:
            where_clauses.append("i.id_tipo = %s")
            params_list.append(id_tipo)

        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)

        sql += " ORDER BY i.id_inmueble DESC"

        if limit and str(limit).isdigit():
            sql += " LIMIT %s"
            params_list.append(int(limit))

        params = tuple(params_list)

    try:
        cur.execute(sql, params)
        inmuebles = cur.fetchall()
    except Exception as e:
        app.logger.exception("Error al obtener inmuebles para reporte (empleado)")
        flash("Error al generar reporte", "danger")
        cur.close(); conn.close()
        return redirect(url_for('empleado_gestion_inmuebles'))

    cur.close()
    conn.close()

    html_out = render_template("EmpleadoOpciones/reporte_inmuebles.html", inmuebles=inmuebles, now=datetime.now())

    if WEASYPRINT_AVAILABLE:
        try:
            pdf_io = io.BytesIO()
            HTML(string=html_out, base_url=request.url_root).write_pdf(pdf_io, stylesheets=[CSS(string='@page { size: A4; margin: 20mm }')])
            pdf_io.seek(0)
            response = make_response(pdf_io.read())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = 'attachment; filename=inmuebles_reporte_empleado.pdf'
            return response
        except Exception:
            app.logger.exception("WeasyPrint error al generar PDF (empleado)")

    if REPORTLAB_AVAILABLE:
        try:
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            elements = []
            elements.append(Paragraph("Reporte de Inmuebles (Empleado)", styles['Title']))
            elements.append(Spacer(1, 12))

            if not inmuebles:
                elements.append(Paragraph("No hay inmuebles registrados para los criterios seleccionados.", styles['Normal']))
            else:
                data = [["ID", "Dirección", "Barrio", "Ciudad", "Precio", "m²", "Tipo/Operación", "Estado"]]
                for r in inmuebles:
                    precio_str = f"${r[4]:,.2f}" if r[4] is not None else ""
                    data.append([str(r[0]), r[1] or "", r[2] or "", r[3] or "", precio_str, str(r[5] or ""), (r[6] or "") + " / " + (r[7] or ""), r[8] or ""])
                table = Table(data, repeatRows=1, hAlign='LEFT')
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f4f4f4')),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ]))
                elements.append(table)

            doc.build(elements)
            buffer.seek(0)
            response = make_response(buffer.read())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = 'attachment; filename=inmuebles_reporte_empleado.pdf'
            return response
        except Exception:
            app.logger.exception("ReportLab error al generar PDF (empleado)")

    return html_out

# ----------------- RUTAS PARA SECRETARIA (CITAS Y REPORTES) -----------------

@app.route("/secretaria/citas", methods=["GET"])
def secretaria_citas():
    """
    Lista citas para la secretaria.
    Campos esperados en la tabla CITA: id_cita, fecha_hora, descripcion, estado, created_at
    Tabla CLIENTE: id_cliente, nombre, email
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT c.id_cita, c.fecha_hora,
                   COALESCE(cl.nombre, cl.email, '') AS cliente,
                   c.descripcion, c.estado, c.created_at
            FROM CITA c
            LEFT JOIN CLIENTE cl ON c.id_cliente = cl.id_cliente
            ORDER BY c.fecha_hora DESC
        """)
        citas = cur.fetchall()
        return render_template("SecretariaOpciones/Gestion_Citas.html", citas=citas)
    except Exception:
        app.logger.exception("Error al listar citas (secretaria)")
        flash("Error al listar citas", "danger")
        return redirect(url_for('secretaria'))
    finally:
        try: cur.close()
        except: pass
        try: conn.close()
        except: pass


@app.route("/secretaria/citas/agendar", methods=["GET", "POST"])
def secretaria_agendar_cita():
    """
    GET -> formulario para agendar.
    POST -> inserta la cita en la BD.
    Nota: el campo de texto se llama 'descripcion' (coincide con la tabla CITA).
    """
    if request.method == "GET":
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute("SELECT id_cliente, nombre, email FROM CLIENTE ORDER BY nombre")
            clientes = cur.fetchall()
            cur.execute("SELECT id_empleado, nombre FROM EMPLEADO ORDER BY nombre")
            empleados = cur.fetchall()
            return render_template("SecretariaOpciones/Agendar_Cita.html", clientes=clientes, empleados=empleados)
        except Exception:
            app.logger.exception("Error al preparar formulario agendar cita")
            flash("Error al preparar formulario", "danger")
            return redirect(url_for('secretaria_citas'))
        finally:
            try: cur.close()
            except: pass
            try: conn.close()
            except: pass

    # POST -> crear cita
    id_cliente = request.form.get('id_cliente') or None
    fecha_hora = request.form.get('fecha_hora')  # 'YYYY-MM-DDTHH:MM' o similar
    descripcion = request.form.get('descripcion') or ''
    estado = request.form.get('estado') or 'PENDIENTE'
    id_empleado = request.form.get('id_empleado') or None

    if not fecha_hora or not descripcion:
        flash('Fecha/hora y descripción son obligatorios', 'warning')
        return redirect(url_for('secretaria_agendar_cita'))

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO CITA (fecha_hora, descripcion, estado, id_cliente, id_empleado)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id_cita
        """, (fecha_hora, descripcion, estado, id_cliente, id_empleado))
        row = cur.fetchone()
        if row:
            conn.commit()
            flash('Cita agendada correctamente', 'success')
        else:
            conn.rollback()
            flash('No se pudo agendar la cita', 'danger')
    except Exception:
        conn.rollback()
        app.logger.exception("Error al agendar cita (secretaria)")
        flash("Error al agendar cita", 'danger')
    finally:
        try: cur.close()
        except: pass
        try: conn.close()
        except: pass

    return redirect(url_for('secretaria_citas'))


@app.route("/secretaria/citas/reporte", methods=["GET", "POST"])
def secretaria_citas_reporte():
    """
    Genera reporte de citas para secretaria.
    Soporta mode = 'all' | 'filter' | 'selected'
    Filtros: estado, date_from, date_to
    """
    conn = get_db_connection()
    cur = conn.cursor()

    mode = request.values.get('mode', '').lower()
    selected_ids_raw = request.values.get('selected_ids', '')
    estado = request.values.get('estado') or None
    date_from = request.values.get('date_from') or None
    date_to = request.values.get('date_to') or None
    limit = request.values.get('limit') or None

    try:
        if mode == 'selected' and selected_ids_raw:
            ids = [int(x) for x in selected_ids_raw.split(',') if x.strip().isdigit()]
            if not ids:
                flash("No se recibieron citas seleccionadas", "warning")
                return redirect(url_for('secretaria_citas'))
            placeholders = ','.join(['%s'] * len(ids))
            sql = f"""
                SELECT c.id_cita, c.fecha_hora, COALESCE(cl.nombre, cl.email, '') AS cliente,
                       c.descripcion, c.estado
                FROM CITA c
                LEFT JOIN CLIENTE cl ON c.id_cliente = cl.id_cliente
                WHERE c.id_cita IN ({placeholders})
                ORDER BY c.fecha_hora DESC
            """
            params = tuple(ids)
        else:
            sql = """
                SELECT c.id_cita, c.fecha_hora, COALESCE(cl.nombre, cl.email, '') AS cliente,
                       c.descripcion, c.estado
                FROM CITA c
                LEFT JOIN CLIENTE cl ON c.id_cliente = cl.id_cliente
            """
            where_clauses = []
            params_list = []

            if estado and estado.lower() != 'todos':
                where_clauses.append("c.estado = %s")
                params_list.append(estado)

            if date_from:
                where_clauses.append("c.fecha_hora >= %s")
                params_list.append(date_from)

            if date_to:
                where_clauses.append("c.fecha_hora <= %s")
                params_list.append(date_to)

            if where_clauses:
                sql += " WHERE " + " AND ".join(where_clauses)

            sql += " ORDER BY c.fecha_hora DESC"

            if limit and str(limit).isdigit():
                sql += " LIMIT %s"
                params_list.append(int(limit))

            params = tuple(params_list)

        cur.execute(sql, params)
        citas = cur.fetchall()
    except Exception:
        app.logger.exception("Error al obtener citas para reporte (secretaria)")
        flash("Error al generar reporte de citas", "danger")
        return redirect(url_for('secretaria_citas'))
    finally:
        try: cur.close()
        except: pass
        try: conn.close()
        except: pass

    html_out = render_template("SecretariaOpciones/reporte_citas.html", citas=citas, now=datetime.now())

    # Intentar generar PDF con WeasyPrint
    if WEASYPRINT_AVAILABLE:
        try:
            pdf_io = io.BytesIO()
            HTML(string=html_out, base_url=request.url_root).write_pdf(pdf_io, stylesheets=[CSS(string='@page { size: A4; margin: 20mm }')])
            pdf_io.seek(0)
            response = make_response(pdf_io.read())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = 'attachment; filename=citas_reporte_secretaria.pdf'
            return response
        except Exception:
            app.logger.exception("WeasyPrint error al generar PDF (secretaria citas)")

    # Fallback ReportLab (opcional)
    if REPORTLAB_AVAILABLE:
        try:
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            styles = getSampleStyleSheet()
            elements = []
            elements.append(Paragraph("Reporte de Citas (Secretaria)", styles['Title']))
            elements.append(Spacer(1, 12))

            if not citas:
                elements.append(Paragraph("No hay citas registradas.", styles['Normal']))
            else:
                data = [["ID", "Fecha/Hora", "Cliente", "Descripción", "Estado"]]
                for r in citas:
                    data.append([str(r[0]), str(r[1]), r[2] or "", r[3] or "", r[4] or ""])
                table = Table(data, repeatRows=1, hAlign='LEFT')
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f4f4f4')),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ]))
                elements.append(table)

            doc.build(elements)
            buffer.seek(0)
            response = make_response(buffer.read())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = 'attachment; filename=citas_reporte_secretaria.pdf'
            return response
        except Exception:
            app.logger.exception("ReportLab error al generar PDF (secretaria citas)")

    return html_out


# ---------------- EJECUTAR APP ----------------
if __name__ == "__main__":
    app.run(debug=True)
