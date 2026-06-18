import pandas as pd
from werkzeug.security import generate_password_hash
from app import get_db_connection


ARCHIVO_EXCEL = "usuarios_ingaya.xlsx"


def cargar_usuarios_desde_excel():
    try:
        # Leer archivo Excel
        df = pd.read_excel(ARCHIVO_EXCEL)

        # Normalizar nombres de columnas
        df.columns = df.columns.str.strip().str.lower()

        columnas_requeridas = {
            "email", "contrasena", "rol",
            "nombre", "identificacion", "telefono", "tipo_empleado"
        }

        if not columnas_requeridas.issubset(df.columns):
            faltantes = columnas_requeridas - set(df.columns)
            raise ValueError(f"Faltan columnas en el Excel: {faltantes}")

        conn = get_db_connection()
        cur = conn.cursor()

        insertados = 0
        omitidos = 0

        for index, row in df.iterrows():
            try:
                email = str(row["email"]).strip().lower()
                contrasena = str(row["contrasena"]).strip()
                rol = str(row["rol"]).strip().upper()
                nombre = str(row["nombre"]).strip()
                identificacion = str(row["identificacion"]).strip()
                telefono = str(row["telefono"]).strip()
                tipo_empleado = str(row.get("tipo_empleado", "")).strip()

                # Validar rol
                if rol not in ("EMPLEADO", "SECRETARIA"):
                    print(f"⚠ Rol inválido en fila {index + 2}: {rol}")
                    omitidos += 1
                    continue

                # Verificar si el usuario ya existe
                cur.execute(
                    "SELECT id_usuario FROM USUARIO WHERE email = %s",
                    (email,)
                )
                if cur.fetchone():
                    print(f"⚠ Usuario ya existe: {email}")
                    omitidos += 1
                    continue

                # Encriptar contraseña
                contrasena_hash = generate_password_hash(contrasena)

                # Insertar en USUARIO
                cur.execute("""
                    INSERT INTO USUARIO (email, contrasena)
                    VALUES (%s, %s)
                    RETURNING id_usuario
                """, (email, contrasena_hash))

                id_usuario = cur.fetchone()[0]

                # Obtener ID del rol
                cur.execute(
                    "SELECT id_rol FROM ROL WHERE nombre_rol = %s",
                    (rol,)
                )
                rol_row = cur.fetchone()

                if not rol_row:
                    raise ValueError(f"El rol '{rol}' no existe en la base de datos.")

                id_rol = rol_row[0]

                # Insertar en USUARIO_ROL
                cur.execute("""
                    INSERT INTO USUARIO_ROL (id_usuario, id_rol)
                    VALUES (%s, %s)
                """, (id_usuario, id_rol))

                # Insertar en EMPLEADO solo si corresponde
                if rol == "EMPLEADO":
                    cur.execute("""
                        INSERT INTO EMPLEADO
                        (nombre, identificacion, telefono, tipo_empleado, id_usuario)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        nombre,
                        identificacion,
                        telefono,
                        tipo_empleado,
                        id_usuario
                    ))

                insertados += 1

            except Exception as e:
                conn.rollback()
                print(f"❌ Error en la fila {index + 2}: {e}")
                omitidos += 1

        conn.commit()
        cur.close()
        conn.close()

        print("\n✅ Proceso finalizado")
        print(f"✔ Usuarios insertados: {insertados}")
        print(f"⚠ Registros omitidos: {omitidos}")

    except FileNotFoundError:
        print(f"❌ No se encontró el archivo: {ARCHIVO_EXCEL}")
    except Exception as e:
        print(f"❌ Error general: {e}")


if __name__ == "__main__":
    cargar_usuarios_desde_excel()