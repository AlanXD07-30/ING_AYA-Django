create database ing_aya;
use ing_aya;



SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA ROL (Se queda igual, es una tabla maestro/catálogo)
CREATE TABLE ROL (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) UNIQUE NOT NULL
);

-- 2. TABLA USUARIO (Optimizado con ENUM para el estado)
CREATE TABLE USUARIO (
    id_usuario BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO', 'SUSPENDIDO') DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA USUARIO_ROL
CREATE TABLE USUARIO_ROL (
    id_usuario BIGINT,
    id_rol INT,
    PRIMARY KEY (id_usuario, id_rol),
    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_rol) REFERENCES ROL(id_rol)
);

-- 4. TABLA CLIENTE (Optimizado: dirección cambia de TEXT a VARCHAR)
CREATE TABLE CLIENTE (
    id_cliente BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    identificacion VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(255), -- Optimizado de TEXT a VARCHAR
    fecha_nacimiento DATE,
    id_usuario BIGINT UNIQUE,
    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE
);

-- 5. TABLA EMPLEADO (Optimizado con ENUM para tipo de empleado si son fijos, ej: Asesor, Admin)
CREATE TABLE EMPLEADO (
    id_empleado BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    identificacion VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    tipo_empleado ENUM('ADMINISTRATIVO', 'AGENTE', 'MANTENIMIENTO', 'SECRETARIA') NOT NULL, -- Optimizado a ENUM
    id_usuario BIGINT UNIQUE,
    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE
);

-- 6. TABLA TIPO_INMUEBLE
CREATE TABLE TIPO_INMUEBLE (
    id_tipo INT AUTO_INCREMENT PRIMARY KEY,
    nombre_tipo VARCHAR(50) UNIQUE NOT NULL
);

-- 7. TABLA INMUEBLE (¡Optimizado con ENUMs según tu recomendación!)
CREATE TABLE INMUEBLE (
    id_inmueble BIGINT AUTO_INCREMENT PRIMARY KEY,
    direccion VARCHAR(255) NOT NULL, -- Optimizado de TEXT a VARCHAR
    barrio VARCHAR(100),
    ciudad VARCHAR(100),
    precio DECIMAL(15,2) NOT NULL CHECK (precio >= 0),
    -- ENUM con los estados que sugeriste. Predeterminado: DISPONIBLE
    estado ENUM('DISPONIBLE', 'MANTENIMIENTO', 'VENDIDO', 'ARRENDADO', 'NO DISPONIBLE') DEFAULT 'DISPONIBLE',
    metraje DECIMAL(10,2),
    id_tipo INT,
    id_empleado_encargado BIGINT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Reemplazamos el CHECK aparatoso de Postgres por un ENUM limpio de MySQL
    tipo_operacion ENUM('VENTA', 'ARRIENDO') NOT NULL, 

    FOREIGN KEY (id_tipo) REFERENCES TIPO_INMUEBLE(id_tipo),
    FOREIGN KEY (id_empleado_encargado) REFERENCES EMPLEADO(id_empleado)
);

-- 8. TABLA IMAGEN_INMUEBLE
CREATE TABLE IMAGEN_INMUEBLE (
    id_imagen INT AUTO_INCREMENT PRIMARY KEY,
    url_imagen TEXT NOT NULL, -- Aquí sí se justifica TEXT porque las URLs pueden ser muy largas
    es_principal BOOLEAN DEFAULT FALSE,
    id_inmueble BIGINT,
    
    -- Mantenemos el truco de emulación de índice parcial de la respuesta anterior
    _id_inmueble_principal BIGINT GENERATED ALWAYS AS (CASE WHEN es_principal = TRUE THEN id_inmueble END) VIRTUAL,
    UNIQUE KEY unica_imagen_principal (_id_inmueble_principal),

    FOREIGN KEY (id_inmueble) REFERENCES INMUEBLE(id_inmueble) ON DELETE CASCADE
);

-- 9. TABLA MOVIMIENTO_INMUEBLE (Optimizado con ENUMs)
CREATE TABLE MOVIMIENTO_INMUEBLE (
    id_movimiento BIGINT AUTO_INCREMENT PRIMARY KEY,
    tipo_movimiento ENUM('CREACION', 'CAMBIO_PRECIO', 'CAMBIO_ESTADO', 'MANTENIMIENTO') NOT NULL, -- Optimizado
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    precio_momento DECIMAL(15,2),
    estado_momento ENUM('DISPONIBLE', 'MANTENIMIENTO', 'VENDIDO', 'ARRENDADO', 'NO DISPONIBLE'), -- Optimizado
    descripcion TEXT, -- Aquí se queda TEXT porque puede ser una nota larga
    id_inmueble BIGINT,
    FOREIGN KEY (id_inmueble) REFERENCES INMUEBLE(id_inmueble) ON DELETE CASCADE
);

-- 10. TABLA CITA (Optimizado con ENUM para el estado de la cita)
CREATE TABLE CITA (
    id_cita BIGINT AUTO_INCREMENT PRIMARY KEY,
    fecha_hora TIMESTAMP NOT NULL,
    estado ENUM('PENDIENTE', 'REALIZADA', 'CANCELADA', 'REPROGRAMADA') DEFAULT 'PENDIENTE', -- Optimizado
    descripcion TEXT,
    id_cliente BIGINT,
    id_empleado BIGINT,
    
    CONSTRAINT unique_cita UNIQUE (fecha_hora, id_empleado),
    FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente),
    FOREIGN KEY (id_empleado) REFERENCES EMPLEADO(id_empleado)
);

-- 11. TABLA TRANSACCION (Optimizado con ENUMs para estado y operación)
CREATE TABLE TRANSACCION (
    id_transaccion BIGINT AUTO_INCREMENT PRIMARY KEY,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo_operacion ENUM('VENTA', 'ARRIENDO') NOT NULL, -- Optimizado
    valor_total DECIMAL(15,2) NOT NULL,
    estado ENUM('PROCESANDO', 'COMPLETADA', 'RECHAZADA', 'ANULADA') DEFAULT 'PROCESANDO', -- Optimizado
    id_cliente BIGINT,
    id_inmueble BIGINT,
    id_empleado BIGINT,

    FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente),
    FOREIGN KEY (id_inmueble) REFERENCES INMUEBLE(id_inmueble),
    FOREIGN KEY (id_empleado) REFERENCES EMPLEADO(id_empleado)
);

-- 12. TABLA PAGO (Optimizado con ENUMs para estado y métodos de pago)
CREATE TABLE PAGO (
    id_pago BIGINT AUTO_INCREMENT PRIMARY KEY,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monto DECIMAL(15,2) NOT NULL,
    metodo_pago ENUM('EFECTIVO', 'TRANSFERENCIA', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'CHEQUE') NOT NULL, -- Optimizado
    estado_pago ENUM('PENDIENTE', 'COMPLETADO', 'FALLIDO', 'REEMBOLSADO') DEFAULT 'COMPLETADO', -- Optimizado
    id_transaccion BIGINT,

    FOREIGN KEY (id_transaccion) REFERENCES TRANSACCION(id_transaccion) ON DELETE SET NULL
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- INSERCIONES DE PRUEBA (Adaptadas a los nuevos ENUMs)
-- =============================================================================

INSERT IGNORE INTO ROL (nombre_rol) VALUES ('ADMIN'), ('EMPLEADO'), ('SECRETARIA'), ('CLIENTE');

INSERT INTO TIPO_INMUEBLE (nombre_tipo) VALUES ('Apartamento'), ('Casa'), ('Local');

INSERT INTO USUARIO (email, contrasena, estado) VALUES ('admin@ingaya.com', 'Admin123#', 'ACTIVO');

INSERT INTO USUARIO_ROL (id_usuario, id_rol) VALUES (
    (SELECT id_usuario FROM USUARIO WHERE email = 'admin@ingaya.com'),
    (SELECT id_rol FROM ROL WHERE nombre_rol = 'ADMIN')
);