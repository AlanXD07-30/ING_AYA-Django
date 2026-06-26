// NUEVO COMMIT ACTUALIZADO 2026 
// ==========================================
// TEMA CLARO / OSCURO
// ==========================================
function inicializarTema() {
    const savedTheme = localStorage.getItem('adminTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('themeToggle').innerHTML = savedTheme === 'dark' ? '<i class="bi bi-brightness-high-fill" style="color: #fbbf24;"></i>' : '<i class="bi bi-moon-stars-fill" style="color: #cbd5e1;"></i>';

    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('adminTheme', newTheme);
        document.getElementById('themeToggle').innerHTML = newTheme === 'dark' ? '<i class="bi bi-brightness-high-fill" style="color: #fbbf24;"></i>' : '<i class="bi bi-moon-stars-fill" style="color: #cbd5e1;"></i>';
        
        // Redibujar gráficos para actualizar colores de letras
        if (document.getElementById('panel-graficos-inmuebles').style.display === 'block') {
            dibujarGraficosInmuebles();
        } else if (document.getElementById('panel-graficos-clientes').style.display === 'block') {
            dibujarGraficosClientes();
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    inicializarTema();
    verificarSesion();
    cargarInmuebles();
    
    // Handler para cambio de credenciales obligatorio
    const formCredenciales = document.getElementById("form-cambio-credenciales");
    if (formCredenciales) {
        formCredenciales.addEventListener("submit", async function(e) {
            e.preventDefault();
            const nuevoCorreo = document.getElementById("nuevo-correo").value;
            const nuevaPassword = document.getElementById("nueva-password").value;
            const btn = formCredenciales.querySelector("button");
            
            btn.textContent = "Guardando...";
            btn.disabled = true;
            
            try {
                const token = sessionStorage.getItem("mi_token");
                const response = await fetch("https://ingaya-django-production.up.railway.app/api/perfil-empleado/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Token ${token}`
                    },
                    body: JSON.stringify({
                        correo: nuevoCorreo,
                        password: nuevaPassword
                    })
                });
                
                if (response.ok) {
                    sessionStorage.removeItem("requiere_cambio");
                    document.getElementById("modal-cambio-credenciales").style.display = "none";
                    Swal.fire('¡Éxito!', 'Tus credenciales han sido actualizadas. Por favor, recuérdalas.', 'success');
                } else {
                    const data = await response.json();
                    Swal.fire('Error', data.error || 'No se pudo actualizar', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Problema de conexión con el servidor', 'error');
            } finally {
                btn.textContent = "Guardar y Continuar";
                btn.disabled = false;
            }
        });
    }
});

// Guardamos los datos globales para poder editarlos
let inmueblesGlobal = [];

// ==========================================
// SEGURIDAD Y SESIÓN
// ==========================================
function verificarSesion() {
    const token = sessionStorage.getItem("mi_token");
    if (!token) {
        Swal.fire('Acceso Denegado', 'Debes iniciar sesión para entrar al panel.', 'error').then(() => {
            window.location.href = "../PROCESO INGRESO DE ADMINISTRADOR, EMPELADO, SECRETARIA, USUARIO/login.html";
        });
        return;
    }
    const rol = sessionStorage.getItem("rol");
    const isAdmin = sessionStorage.getItem("is_admin") === "true";

    if (!isAdmin) {
        if (rol === 'Cliente') {
            Swal.fire('Acceso Denegado', 'Los clientes no tienen acceso al panel administrativo.', 'warning').then(() => {
                window.location.href = "../PAGINA PRINCIPAL INMUEBLES ING AYA/Index.html";
            });
            return;
        }

        // Secretaria: Solo Inmuebles, Clientes y Citas. Sin permisos de edición/borrado/creación en Inmuebles y Clientes.
        if (rol && rol.toLowerCase().includes('secretari')) {
            document.getElementById("nav-empleados").parentElement.style.display = 'none';
            document.getElementById("nav-financiera").parentElement.style.display = 'none';
            
            // Ocultar botones de crear, editar y eliminar para Secretaria (excepto en citas)
            const style = document.createElement('style');
            style.innerHTML = `
                #btn-nuevo-inmueble, #btn-nuevo-cliente { display: none !important; }
                #tabla-inmuebles .btn-action.edit, #tabla-inmuebles .btn-action.delete { display: none !important; }
                #tabla-clientes .btn-action.edit, #tabla-clientes .btn-action.delete { display: none !important; }
            `;
            document.head.appendChild(style);
        }
        
        // Agente: Inmuebles, Clientes, Citas.
        if (rol && rol.toLowerCase().includes('agente')) {
            document.getElementById("nav-empleados").parentElement.style.display = 'none';
            document.getElementById("nav-financiera").parentElement.style.display = 'none';
            
            // Ocultar botones de crear, editar y eliminar para Agente en Inmuebles
            const style = document.createElement('style');
            style.innerHTML = `
                #btn-nuevo-inmueble { display: none !important; }
                #tabla-inmuebles .btn-action.edit, #tabla-inmuebles .btn-action.delete { display: none !important; }
            `;
            document.head.appendChild(style);
            
            const panelTitle = document.getElementById("panel-title");
            if (panelTitle) panelTitle.innerText = "Panel de Agente";
        }
    }
    
    // Verificación de cambio de credenciales obligatorio
    if (sessionStorage.getItem("requiere_cambio") === "true") {
        document.getElementById("modal-cambio-credenciales").style.display = "flex";
    }

    const nombre = sessionStorage.getItem("mi_nombre") || "Admin";
    document.getElementById("admin-name").innerText = "Hola, " + nombre;

    let avatarUrl = sessionStorage.getItem("mi_avatar");
    if (!avatarUrl) {
        avatarUrl = `https://ui-avatars.com/api/?name=${nombre.replace(" ", "+")}&background=random`;
    }
    const adminAvatar = document.getElementById("admin-avatar");
    if (adminAvatar) {
        adminAvatar.src = avatarUrl;
        adminAvatar.style.objectFit = "cover";
    }

    document.getElementById("btn-cerrar-sesion").addEventListener("click", function (e) {
        e.preventDefault();
        sessionStorage.clear();
        window.location.href = "../PROCESO INGRESO DE ADMINISTRADOR, EMPELADO, SECRETARIA, USUARIO/login.html";
    });
}

// ==========================================
// CARGAR INMUEBLES EN LA TABLA
// ==========================================
async function cargarInmuebles(silent = false) {
    const tabla = document.getElementById("tabla-inmuebles");
    if(silent) { try { const r = await fetch("https://ingaya-django-production.up.railway.app/api/inmuebles/"); if(r.ok) inmueblesGlobal = await r.json(); }catch(e){} return; }
    
    try {
        const response = await fetch("https://ingaya-django-production.up.railway.app/api/inmuebles/");
        if (!response.ok) throw new Error("Error en el servidor");
        
        const data = await response.json();
        inmueblesGlobal = data; // Guardamos globalmente
        
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No hay inmuebles registrados en la base de datos.</td></tr>';
            return;
        }

        tabla.innerHTML = "";
        
        renderInmueblesFiltered();

    } catch (error) {
        console.error(error);
        tabla.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #ef4444;">Error de conexión con el servidor.</td></tr>';
    }
}

// ==========================================
// ELIMINAR INMUEBLE
// ==========================================
async function eliminarInmueble(id) {
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir esto! El inmueble se eliminará permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#3b82f6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        const token = sessionStorage.getItem("mi_token");
        try {
            const response = await fetch(`https://ingaya-django-production.up.railway.app/api/inmuebles/${id}/`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Token ${token}`
                }
            });

            if (response.ok || response.status === 204) {
                Swal.fire('Eliminado', 'El inmueble ha sido eliminado.', 'success');
                cargarInmuebles();
            } else {
                Swal.fire('Error', 'No tienes permisos o el servidor falló.', 'error');
            }
        } catch(e) {
            Swal.fire('Error', 'No se pudo conectar al servidor.', 'error');
        }
    }
}

// ==========================================
// VER HISTORIAL INMUEBLE
// ==========================================
window.verHistorialInmueble = async function(id) {
    try {
        const response = await fetch(`https://ingaya-django-production.up.railway.app/api/inmuebles/${id}/historial/`);
        if (!response.ok) throw new Error("No se pudo cargar el historial.");
        const movimientos = await response.json();
        
        let htmlContent = "";
        if (movimientos.length === 0) {
            htmlContent = "<p style='text-align:center;'>No hay historial de cambios para este inmueble.</p>";
        } else {
            htmlContent = `
                <div style="max-height: 400px; overflow-y: auto; text-align: left; font-size: 14px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid #ccc;">
                                <th style="padding: 8px;">Fecha</th>
                                <th style="padding: 8px;">Tipo</th>
                                <th style="padding: 8px;">Detalles</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movimientos.map(m => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px;">${new Date(m.fecha).toLocaleString("es-CO")}</td>
                                    <td style="padding: 8px; font-weight: bold; color: #3b82f6;">${m.tipo_movimiento}</td>
                                    <td style="padding: 8px;">${m.descripcion}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        Swal.fire({
            title: `Historial del Inmueble #${id}`,
            html: htmlContent,
            width: '700px',
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#3b82f6'
        });
    } catch (e) {
        Swal.fire('Error', e.message, 'error');
    }
}

// ==========================================
// VER INMUEBLE (OJO)
// ==========================================
window.verInmueble = function(id) {
    const inm = inmueblesGlobal.find(i => (i.id_inmueble || i.id) === id);
    if (!inm) return;

    let imgSrc = "../PAGINA WEB INMOBILIARIA/img/no-image.png";
    if (inm.imagen_principal) {
        imgSrc = inm.imagen_principal.startsWith("http") ? inm.imagen_principal : "https://ingaya-django-production.up.railway.app" + inm.imagen_principal;
    }

    let caracteristicasStr = "Ninguna";
    if (inm.caracteristicas) {
        try {
            const arr = JSON.parse(inm.caracteristicas);
            if (arr.length > 0) caracteristicasStr = arr.join(", ");
        } catch(e) {
            caracteristicasStr = inm.caracteristicas;
        }
    }
    
    // Formatear fecha
    let fechaStr = "N/A";
    if (inm.fecha_registro) {
        const d = new Date(inm.fecha_registro);
        fechaStr = d.toLocaleDateString("es-CO");
    }

    Swal.fire({
        html: `
            <div style="position: relative; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <img src="${imgSrc}" style="width: 100%; height: 350px; object-fit: cover; display: block;" alt="Imagen del Inmueble">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); padding: 30px 20px 20px 20px; text-align: left; color: white;">
                    <h2 style="margin: 0; font-size: 26px; text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">${inm.direccion || 'Sin Dirección'}</h2>
                    <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">${inm.barrio || 'N/A'}, ${inm.ciudad || 'N/A'}</p>
                </div>
            </div>
            
            <div style="text-align: left; font-size: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 15px; background: rgba(0,0,0,0.1); border-radius: 12px;">
                <p style="margin: 0;"><strong>ID:</strong> #${inm.id_inmueble}</p>
                <p style="margin: 0;"><strong>Estado:</strong> ${inm.estado || 'N/A'}</p>
                <p style="margin: 0;"><strong>Tipo:</strong> ${inm.tipo_inmueble || 'N/A'}</p>
                <p style="margin: 0;"><strong>Operación:</strong> <span style="background-color: var(--primary-color, #3b82f6); color: white; padding: 2px 6px; border-radius: 4px;">${inm.tipo_operacion || 'N/A'}</span></p>
                <p style="margin: 0;"><strong>Precio:</strong> <span style="color: #10b981; font-weight: bold;">$ ${inm.precio ? parseInt(inm.precio).toLocaleString("es-CO") : 'N/A'}</span></p>
                <p style="margin: 0;"><strong>Metraje:</strong> ${inm.metraje ? parseFloat(inm.metraje).toFixed(2) + ' m²' : 'N/A'}</p>
                <p style="margin: 0;"><strong>Habitaciones:</strong> ${inm.habitaciones || '0'}</p>
                <p style="margin: 0;"><strong>Baños:</strong> ${inm.banos || '0'}</p>
                <p style="margin: 0;"><strong>Garajes:</strong> ${inm.garajes || '0'}</p>
                <p style="margin: 0;"><strong>Estrato:</strong> ${inm.estrato || 'N/A'}</p>
                <p style="margin: 0;"><strong>Fecha Registro:</strong> ${fechaStr}</p>
                <p style="margin: 0; grid-column: 1 / -1;"><strong>Características:</strong> ${caracteristicasStr}</p>
                <p style="margin: 0; grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;"><strong>Descripción:</strong> <br>${inm.descripcion || 'Sin descripción adicional.'}</p>
            </div>
        `,
        width: 750,
        padding: '1.5em',
        showConfirmButton: true,
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Cerrar',
        customClass: {
            popup: 'swal-premium-popup'
        }
    });
};

// ==========================================
// MODAL: CREAR Y EDITAR
// ==========================================
function abrirModalCrear() {
    document.getElementById("form-inmueble").reset();
    document.getElementById("edit_id").value = "";
    if (document.getElementById("image-preview-container")) document.getElementById("image-preview-container").innerHTML = "";
    document.getElementById("modal-titulo").innerText = "Registrar Nuevo Inmueble";
    document.getElementById("modal-submit-btn").innerText = "Guardar Inmueble";
    document.getElementById("modal-crear").style.display = "flex";
}

function abrirModalEditar(id) {
    const inm = inmueblesGlobal.find(i => (i.id_inmueble || i.id) === id);
    if (!inm) return;

    document.getElementById("form-inmueble").reset();
    document.getElementById("edit_id").value = id;
    document.getElementById("modal-titulo").innerText = "Editar Inmueble #" + id;
    document.getElementById("modal-submit-btn").innerText = "Actualizar Inmueble";

    // Llenar datos
    document.getElementById("tipo_operacion").value = (inm.tipo_operacion || "").toUpperCase() === "VENTA" ? "Venta" : "Arriendo";
    
    let tInm = (inm.tipo_inmueble || "Casa").toUpperCase();
    document.getElementById("tipo_inmueble").value = tInm === "APARTAMENTO" ? "Apartamento" : (tInm === "LOTE" ? "Lote" : "Casa");
    document.getElementById("precio").value = inm.precio ? parseInt(inm.precio) : "";
    document.getElementById("direccion").value = inm.direccion || "";
    document.getElementById("barrio").value = inm.barrio || "";
    document.getElementById("ciudad").value = inm.ciudad || "";
    document.getElementById("metraje").value = inm.metraje || "";
    let est = (inm.estado || "Disponible").toUpperCase();
    if (est === "VENDIDO") document.getElementById("estado").value = "Vendido";
    else if (est === "ARRENDADO") document.getElementById("estado").value = "Arrendado";
    else if (est === "RESERVADO") document.getElementById("estado").value = "Reservado";
    else if (est === "MANTENIMIENTO") document.getElementById("estado").value = "Mantenimiento";
    else if (est === "NO DISPONIBLE") document.getElementById("estado").value = "No Disponible";
    else document.getElementById("estado").value = "Disponible";
    document.getElementById("habitaciones").value = inm.habitaciones || 0;
    document.getElementById("banos").value = inm.banos || 0;
    document.getElementById("garajes").value = inm.garajes || 0;
    document.getElementById("estrato").value = inm.estrato || 3;
    document.getElementById("descripcion").value = inm.descripcion || "";
    
    // Clear checkboxes first
    document.querySelectorAll('#caracteristicas-container input[type="checkbox"]').forEach(cb => cb.checked = false);
    if(inm.caracteristicas) {
        try {
            const arr = JSON.parse(inm.caracteristicas);
            arr.forEach(val => {
                const cb = document.querySelector(`#caracteristicas-container input[value="${val}"]`);
                if(cb) cb.checked = true;
            });
        } catch(e){}
    }

    document.getElementById("modal-crear").style.display = "flex";
}

function cerrarModalCrear() {
    document.getElementById("modal-crear").style.display = "none";
}


// Lógica de previsualización de imágenes
document.getElementById('inmueble-imagenes')?.addEventListener('change', function(e) {
    const container = document.getElementById('image-preview-container');
    container.innerHTML = '';
    const files = Array.from(e.target.files);
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${event.target.result}" alt="Preview">
                <button type="button" class="preview-remove" onclick="removeImage(${index})">&times;</button>
            `;
            container.appendChild(div);
        }
        reader.readAsDataURL(file);
    });
});

function removeImage(index) {
    // Para simplificar, en este prototipo, remover limpia todo el input.
    // Una implementación completa usaría DataTransfer.
    const input = document.getElementById('inmueble-imagenes');
    input.value = '';
    document.getElementById('image-preview-container').innerHTML = '';
}

document.getElementById("form-inmueble").addEventListener("submit", async function(e) {
    e.preventDefault();

    const editId = document.getElementById("edit_id").value;
    const isEdit = editId !== "";

    const tipo_operacion = document.getElementById("tipo_operacion").value;
    const tipo_inmueble = document.getElementById("tipo_inmueble").value;
    const precioVal = document.getElementById("precio").value;
    const direccion = document.getElementById("direccion").value;
    const barrio = document.getElementById("barrio").value;
    const ciudad = document.getElementById("ciudad").value;
    const metraje = document.getElementById("metraje").value;
    const estado = document.getElementById("estado").value;

    const token = sessionStorage.getItem("mi_token");

    const habitaciones = parseInt(document.getElementById("habitaciones").value) || 0;
    const banos = parseInt(document.getElementById("banos").value) || 0;
    const garajes = parseInt(document.getElementById("garajes").value) || 0;
    const estrato = parseInt(document.getElementById("estrato").value) || 3;
    const descripcion = document.getElementById("descripcion").value;
    
    const checkboxes = document.querySelectorAll('#caracteristicas-container input[type="checkbox"]:checked');
    const caracteristicas_arr = Array.from(checkboxes).map(cb => cb.value);

    const data = {
        tipo_operacion: tipo_operacion.toUpperCase(),
        tipo_inmueble: tipo_inmueble,
        direccion: direccion,
        barrio: barrio,
        ciudad: ciudad,
        precio: parseFloat(precioVal),
        metraje: metraje ? parseFloat(metraje) : null,
        estado: estado.toUpperCase(),
        habitaciones: habitaciones,
        banos: banos,
        garajes: garajes,
        estrato: estrato,
        descripcion: descripcion,
        caracteristicas: JSON.stringify(caracteristicas_arr),
        fecha_registro: new Date().toISOString()
    };

    try {
        const url = isEdit ? `https://ingaya-django-production.up.railway.app/api/inmuebles/${editId}/` : "https://ingaya-django-production.up.railway.app/api/inmuebles/";
        const method = isEdit ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok || response.status === 201) {
            const responseData = await response.json();
            const savedId = isEdit ? editId : (responseData.id_inmueble || responseData.id);
            
            // Subir Imágenes si hay
            const imgInput = document.getElementById('inmueble-imagenes');
            if (imgInput && imgInput.files.length > 0 && savedId) {
                const formData = new FormData();
                for (let i = 0; i < imgInput.files.length; i++) {
                    formData.append('imagenes', imgInput.files[i]);
                }
                
                try {
                    const imgRes = await fetch(`https://ingaya-django-production.up.railway.app/api/inmuebles/${savedId}/upload_images/`, {
                        method: 'POST',
                        headers: { "Authorization": `Token ${token}` },
                        body: formData
                    });
                    if (!imgRes.ok) console.error("Error al subir imágenes");
                } catch(e) { console.error(e); }
            }

            cerrarModalCrear();
            document.getElementById('image-preview-container').innerHTML = '';
            if (imgInput) imgInput.value = '';

            Swal.fire('¡Éxito!', isEdit ? 'Inmueble y fotos actualizados correctamente.' : 'Inmueble y fotos guardados correctamente.', 'success');
            cargarInmuebles(); 
        } else {
            Swal.fire('Error', 'No se pudo guardar el inmueble. Verifica permisos.', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Error de conexión.', 'error');
    }
});

// Variables para instancias de Chart.js
let chartOperacion, chartEstado, chartTiempo, chartClientes;

// ==========================================
// NAVEGACIÓN Y MENÚ
// ==========================================
function toggleSubmenu(e, submenuId) {
    e.preventDefault();
    const sub = document.getElementById(submenuId);
    if(sub) {
        sub.style.display = sub.style.display === "none" ? "block" : "none";
    }
}

function mostrarSeccion(idPanel, elementoNav) {
    // Ocultar todos los paneles
    document.querySelectorAll('.panel-section').forEach(p => p.style.display = 'none');
    // Mostrar el solicitado
    document.getElementById(idPanel).style.display = 'block';

    // Manejar clases active
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    elementoNav.classList.add('active');

    // Si es gráficos de inmuebles, dibujarlos
    if (idPanel === 'panel-graficos-inmuebles') {
        dibujarGraficosInmuebles();
    } else if (idPanel === 'panel-graficos-clientes') {
        dibujarGraficosClientes();
    } else if (idPanel === 'panel-clientes') {
        cargarClientes();
    } else if (idPanel === 'panel-administradores') {
        cargarAdministradores();
    } else if (idPanel === 'panel-empleados') {
        cargarEmpleados();
    } else if (idPanel === 'panel-roles') {
        cargarRoles();
    }
}

// ==========================================
// LÓGICA DE GRÁFICOS
// ==========================================
async function dibujarGraficosInmuebles() {
    // Asegurar que tenemos la data
    if (inmueblesGlobal.length === 0) {
        await cargarInmuebles(true); // silent load
    }

    const data = inmueblesGlobal;

    // 1. Venta vs Arriendo
    let countVenta = 0, countArriendo = 0;
    // 2. Estado
    let countDisp = 0, countVend = 0, countArr = 0, countMant = 0;
    // 3. Tiempo (por mes)
    let fechasObj = {};

    data.forEach(inm => {
        const op = (inm.tipo_operacion || "").toUpperCase();
        if (op === "VENTA") countVenta++;
        else if (op === "ARRIENDO") countArriendo++;

        const st = (inm.estado || "DISPONIBLE").toUpperCase();
        if (st === "DISPONIBLE") countDisp++;
        else if (st === "VENDIDO") countVend++;
        else if (st === "ARRENDADO") countArr++;
        else countMant++;

        if (inm.fecha_registro) {
            const date = new Date(inm.fecha_registro);
            const mes = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            fechasObj[mes] = (fechasObj[mes] || 0) + 1;
        }
    });

    
    // Actualizar KPIs
    document.getElementById("kpi-total-inmuebles").innerText = data.length;
    document.getElementById("kpi-vendidos").innerText = countVend;
    
    // Total Clientes asíncrono
    fetch("https://ingaya-django-production.up.railway.app/api/clientes/")
        .then(res => res.json())
        .then(clientes => {
            document.getElementById("kpi-clientes").innerText = clientes.length || 0;
        })
        .catch(() => { document.getElementById("kpi-clientes").innerText = "0"; });

    // Destruir gráficos anteriores si existen
    if (chartOperacion) chartOperacion.destroy();
    if (chartEstado) chartEstado.destroy();
    if (chartTiempo) chartTiempo.destroy();

    // Configuración común
    

    // Chart 1: Semi-Torta (Gauge Style)
    const ctxOp = document.getElementById("chart-operacion").getContext("2d");
    const theme = document.documentElement.getAttribute('data-theme');
    const textColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    const borderColor = theme === 'light' ? '#ffffff' : '#1e293b';

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'DM Sans', sans-serif";

    // Gradientes para Chart 1
    const gradVenta = ctxOp.createLinearGradient(0, 0, 0, 400);
    gradVenta.addColorStop(0, '#10b981');
    gradVenta.addColorStop(1, '#059669');

    const gradArriendo = ctxOp.createLinearGradient(0, 0, 0, 400);
    gradArriendo.addColorStop(0, '#3b82f6');
    gradArriendo.addColorStop(1, '#2563eb');

    chartOperacion = new Chart(ctxOp, {
        type: 'doughnut',
        data: {
            labels: ['Venta', 'Arriendo'],
            datasets: [{
                data: [countVenta, countArriendo],
                backgroundColor: [gradVenta, gradArriendo],
                borderColor: borderColor,
                borderWidth: 4,
                hoverOffset: 15
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            rotation: -90,
            circumference: 180,
            cutout: '75%',
            plugins: { 
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 14 }, padding: 12, cornerRadius: 8 }
            }
        }
    });

    // Chart 2: Barras Horizontales Premium
    const ctxEst = document.getElementById("chart-estado").getContext("2d");
    
    const gradDisp = ctxEst.createLinearGradient(0, 0, 400, 0);
    gradDisp.addColorStop(0, '#3b82f6'); gradDisp.addColorStop(1, '#60a5fa');
    
    const gradVend = ctxEst.createLinearGradient(0, 0, 400, 0);
    gradVend.addColorStop(0, '#10b981'); gradVend.addColorStop(1, '#34d399');

    const gradArr = ctxEst.createLinearGradient(0, 0, 400, 0);
    gradArr.addColorStop(0, '#f59e0b'); gradArr.addColorStop(1, '#fbbf24');

    const gradMant = ctxEst.createLinearGradient(0, 0, 400, 0);
    gradMant.addColorStop(0, '#ef4444'); gradMant.addColorStop(1, '#f87171');

    chartEstado = new Chart(ctxEst, {
        type: 'bar',
        data: {
            labels: ['Disponible', 'Vendido', 'Arrendado', 'Otros'],
            datasets: [{
                label: 'Cantidad',
                data: [countDisp, countVend, countArr, countMant],
                backgroundColor: [gradDisp, gradVend, gradArr, gradMant],
                borderRadius: 8,
                barThickness: 15,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y', // Convertir a barras horizontales
            responsive: true, maintainAspectRatio: false,
            scales: { 
                x: { display: false, grid: { display: false } }, 
                y: { grid: { display: false }, border: { display: false } } 
            },
            plugins: { 
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 8 }
            }
        }
    });

    // Chart 3: Línea de Área con Resplandor
    const meses = Object.keys(fechasObj).sort();
    const valoresMes = meses.map(m => fechasObj[m]);

    const ctxTime = document.getElementById("chart-tiempo").getContext("2d");
    
    const gradLine = ctxTime.createLinearGradient(0, 0, 0, 400);
    gradLine.addColorStop(0, 'rgba(168, 85, 247, 0.5)'); // Púrpura arriba
    gradLine.addColorStop(1, 'rgba(168, 85, 247, 0.0)'); // Transparente abajo

    chartTiempo = new Chart(ctxTime, {
        type: 'line',
        data: {
            labels: meses.length > 0 ? meses : ['Sin datos'],
            datasets: [{
                label: 'Inmuebles Registrados',
                data: meses.length > 0 ? valoresMes : [0],
                borderColor: '#a855f7',
                backgroundColor: gradLine,
                borderWidth: 4,
                tension: 0.5, // Curvas súper suaves
                fill: true,
                pointRadius: 0, // Ocultar puntos normalmente
                pointHoverRadius: 8, // Mostrar punto grande al hacer hover
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#a855f7',
                pointBorderWidth: 3
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: { 
                x: { grid: { display: false }, border: { display: false } }, 
                y: { beginAtZero: true, ticks: { stepSize: 1, display: false }, grid: { color: gridColor, drawBorder: false } } 
            },
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 8, titleColor: '#a855f7' }
            }
        }
    });
}
async function dibujarGraficosClientes() {
    // Destruir anterior si existe
    if (chartClientes) chartClientes.destroy();

    const token = sessionStorage.getItem("mi_token");
    let totalClientes = 0;
    try {
        const response = await fetch("https://ingaya-django-production.up.railway.app/api/clientes/", {
            headers: { "Authorization": `Token ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            totalClientes = data.length || 0;
        }
    } catch(e) { console.error(e); }

    const theme = document.documentElement.getAttribute('data-theme');
    const textColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    Chart.defaults.color = textColor;
    const ctxCli = document.getElementById("chart-clientes-total").getContext("2d");
    chartClientes = new Chart(ctxCli, {
        type: 'bar',
        data: {
            labels: ['Clientes Activos'],
            datasets: [{
                label: 'Total',
                data: [totalClientes],
                backgroundColor: '#f43f5e',
                borderRadius: 6, barThickness: 25, borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { x: { grid: { color: gridColor } }, y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: gridColor } } }
        }
    });
}

// ==========================================
// MÓDULO CLIENTES
// ==========================================
async function cargarClientes() {
    const tabla = document.getElementById("tabla-clientes");
    try {
        const res = await fetch("https://ingaya-django-production.up.railway.app/api/clientes/");
        if (!res.ok) throw new Error("Error");
        const data = await res.json();
        
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No hay clientes registrados.</td></tr>';
            return;
        }

        tabla.innerHTML = "";
        clientesGlobal = data;
        renderClientesFiltered();
    } catch (e) {
        tabla.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar.</td></tr>';
    }
}

function abrirModalCliente() {
    document.getElementById("form-cliente").reset();
    document.getElementById("cli-id").value = "";
    document.getElementById("modal-cliente-titulo").innerText = "Agregar Cliente";
    document.getElementById("modal-cliente").style.display = "flex";
}

function abrirModalEditarCliente(cli) {
    document.getElementById("cli-id").value = cli.id_cliente || cli.id;
    document.getElementById("cli-nombre").value = cli.nombre;
    document.getElementById("cli-identificacion").value = cli.identificacion;
    document.getElementById("cli-telefono").value = cli.telefono || "";
    if (document.getElementById("cli-direccion")) document.getElementById("cli-direccion").value = cli.direccion || "";
    if (document.getElementById("cli-fecha-nac")) document.getElementById("cli-fecha-nac").value = cli.fecha_nacimiento || "";
    document.getElementById("modal-cliente-titulo").innerText = "Editar Cliente #" + (cli.id_cliente || cli.id);
    document.getElementById("modal-cliente").style.display = "flex";
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("form-cliente")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const id = document.getElementById("cli-id").value;
        const data = {
            nombre: document.getElementById("cli-nombre").value,
            identificacion: document.getElementById("cli-identificacion").value,
            telefono: document.getElementById("cli-telefono").value,
            direccion: document.getElementById("cli-direccion")?.value || "",
            fecha_nacimiento: document.getElementById("cli-fecha-nac")?.value || null,
            correo: document.getElementById("cli-correo")?.value,
            contrasena: document.getElementById("cli-contrasena")?.value
        };
        await guardarRegistro("clientes", id, data, cargarClientes, "modal-cliente");
    });
});


// ==========================================
// MÓDULO EMPLEADOS
// ==========================================

// ==========================================
// CARGAR ADMINISTRADORES EN LA TABLA
// ==========================================
async function cargarAdministradores() {
    const tabla = document.getElementById("tabla-administradores");
    try {
        const res = await fetch("https://ingaya-django-production.up.railway.app/api/administradores/");
        if (!res.ok) throw new Error("Error");
        const data = await res.json();
        
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No hay administradores registrados.</td></tr>';
            return;
        }

        tabla.innerHTML = "";
        administradoresGlobal = data;
        renderAdministradoresFiltered();
    } catch (e) {
        tabla.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar administradores.</td></tr>';
    }
}

function renderAdministradoresFiltered() {
    const tabla = document.getElementById("tabla-administradores");
    if (!tabla) return;
    tabla.innerHTML = "";
    
    const filtroNombre = (document.getElementById("filtro-adm-nombre")?.value || "").toLowerCase();

    let filtrados = administradoresGlobal.filter(a => {
        const nom = (a.nombre || "").toLowerCase();
        return nom.includes(filtroNombre);
    });

    if (filtrados.length === 0) {
        tabla.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Ningún administrador coincide.</td></tr>';
        return;
    }

    filtrados.forEach((a, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${a.id_cliente || i+1}</td>
            <td style="font-weight:600; color:var(--text-primary);">${a.nombre || "Sin Nombre"}</td>
            <td>${a.identificacion || "N/A"}</td>
            <td>${a.telefono || "N/A"}</td>
            <td>${a.email || "Sin Correo"}</td>
            <td>${a.direccion || "N/A"}</td>
        `;
        tabla.appendChild(tr);
    });
}

document.getElementById("filtro-adm-nombre")?.addEventListener("input", renderAdministradoresFiltered);

async function cargarEmpleados() {
    const tabla = document.getElementById("tabla-empleados");
    try {
        const res = await fetch("https://ingaya-django-production.up.railway.app/api/empleados/");
        if (!res.ok) throw new Error("Error");
        const data = await res.json();
        
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No hay empleados registrados.</td></tr>';
            return;
        }

        tabla.innerHTML = "";
        empleadosGlobal = data;
        renderEmpleadosFiltered();
    } catch (e) {
        tabla.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar.</td></tr>';
    }
}

function abrirModalEmpleado() {
    document.getElementById("form-empleado").reset();
    document.getElementById("emp-id").value = "";
    document.getElementById("modal-empleado-titulo").innerText = "Agregar Empleado";
    document.getElementById("modal-empleado").style.display = "flex";
}

function abrirModalEditarEmpleado(emp) {
    document.getElementById("emp-id").value = emp.id_empleado || emp.id;
    document.getElementById("emp-nombre").value = emp.nombre;
    document.getElementById("emp-identificacion").value = emp.identificacion;
    document.getElementById("emp-telefono").value = emp.telefono || "";
    document.getElementById("emp-correo").value = emp.correo || "";
    
    document.getElementById("emp-rol").value = emp.tipo_empleado || "";
    
    document.getElementById("modal-empleado-titulo").innerText = "Editar Empleado #" + (emp.id_empleado || emp.id);
    document.getElementById("modal-empleado").style.display = "flex";
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("form-empleado")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const id = document.getElementById("emp-id").value;
        const data = {
            nombre: document.getElementById("emp-nombre").value,
            identificacion: document.getElementById("emp-identificacion").value,
            telefono: document.getElementById("emp-telefono").value,
            correo: document.getElementById("emp-correo").value,
            tipo_empleado: document.getElementById("emp-rol").value
        };
        await guardarRegistro("empleados", id, data, cargarEmpleados, "modal-empleado");
    });
});


// ==========================================
// FUNCIONES AUXILIARES CRUD
// ==========================================
async function eliminarRegistro(endpoint, id, callbackCargar) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir esto!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#475569',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`https://ingaya-django-production.up.railway.app/api/${endpoint}/${id}/`, {
                method: "DELETE"
            });
            if (!response.ok) throw new Error("Error al eliminar");
            Swal.fire('¡Eliminado!', 'El registro ha sido eliminado.', 'success');
            callbackCargar();
        } catch (error) {
            Swal.fire('Error', 'Hubo un problema al eliminar el registro.', 'error');
        }
    }
}

async function guardarRegistro(endpoint, id, data, callbackCargar, modalId) {
    const url = id ? `https://ingaya-django-production.up.railway.app/api/${endpoint}/${id}/` : `https://ingaya-django-production.up.railway.app/api/${endpoint}/`;
    const method = id ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            let errMsg = "Hubo un problema al guardar el registro.";
            if (errData) {
                if (errData.identificacion) {
                    errMsg = "Ya existe un registro con esta identificación.";
                } else if (errData.correo) {
                    errMsg = "Ya existe un usuario con este correo.";
                } else {
                    errMsg = JSON.stringify(errData);
                }
            }
            throw new Error(errMsg);
        }

        Swal.fire('¡Éxito!', `Registro ${id ? 'actualizado' : 'creado'} correctamente.`, 'success');
        if (modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        callbackCargar();
    } catch (error) {
        Swal.fire('Error', error.message || 'Hubo un problema al guardar el registro.', 'error');
    }
}


// FILTRO Y RENDER INMUEBLES
function renderInmueblesFiltered() {
    const contenedor = document.getElementById("tabla-inmuebles");
    if (!contenedor) return;
    contenedor.innerHTML = "";
    
    let fCiudad = (document.getElementById("filtro-inm-ciudad")?.value || "").toLowerCase();
    let fOperacion = document.getElementById("filtro-inm-operacion")?.value || "";
    let fEstado = document.getElementById("filtro-inm-estado")?.value || "";
    let fPrecioMax = document.getElementById("filtro-inm-precio-max")?.value;
    
    let listToFilter = typeof inmueblesGlobal !== 'undefined' ? inmueblesGlobal : [];
    let filtered = listToFilter.filter(inm => {
        let matchCiudad = (inm.ciudad || "").toLowerCase().includes(fCiudad);
        let matchOp = fOperacion === "" || (inm.tipo_operacion || "").toUpperCase() === fOperacion;
        let matchEstado = fEstado === "" || (inm.estado || "").toUpperCase() === fEstado;
        let matchPrecio = true;
        if(fPrecioMax && parseFloat(fPrecioMax) > 0) {
            matchPrecio = parseFloat(inm.precio) <= parseFloat(fPrecioMax);
        }
        return matchCiudad && matchOp && matchEstado && matchPrecio;
    });
    
    if(filtered.length === 0) {
        contenedor.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">No hay coincidencias con los filtros.</div>';
        return;
    }
    
    filtered.forEach(inm => {
        let precioStr = "Consultar";
        if (inm.precio != null) {
            precioStr = "$ " + parseInt(inm.precio).toLocaleString("es-CO");
        }
        
        const operacion = inm.tipo_operacion ? inm.tipo_operacion.toUpperCase() : "N/A";
        const estado = inm.estado ? inm.estado.toUpperCase() : "N/A";
        
        let badgeEstado = "estado-mantenimiento";
        if(estado === "DISPONIBLE") badgeEstado = "estado-disponible";
        if(estado === "VENDIDO") badgeEstado = "estado-vendido";
        if(estado === "ARRENDADO") badgeEstado = "estado-arrendado";
        if(estado === "RESERVADO") badgeEstado = "estado-reservado";
        if(estado === "EN TRAMITE") badgeEstado = "estado-entramite";
        if(estado === "NO DISPONIBLE") badgeEstado = "estado-nodisponible";
        
        let imgSrc = "../PAGINA WEB INMOBILIARIA/img/no-image.png";
        if (inm.imagen_principal) {
            imgSrc = inm.imagen_principal.startsWith("http") ? inm.imagen_principal : "https://ingaya-django-production.up.railway.app" + inm.imagen_principal;
        }

        const idInm = inm.id_inmueble || inm.id;

        const card = document.createElement("div");
        card.className = "card-inmueble";
        card.innerHTML = `
            <div class="card-media">
                <img src="${imgSrc}" alt="Inmueble ${idInm}" loading="lazy">
                <span class="card-badge" style="background: var(--accent);">${operacion}</span>
                <span class="card-badge-status ${badgeEstado}" style="position:absolute; top:14px; right:14px; padding:4px 10px; border-radius:99px; font-size:11px; font-weight:700; color:#fff; text-transform:uppercase;">${estado}</span>
            </div>
            <div class="card-body">
                <div style="font-size: 12px; color: var(--text-muted);">ID: #${idInm}</div>
                <h3 class="card-title">${inm.tipo_inmueble || 'Inmueble'} en ${inm.barrio || 'N/A'}</h3>
                <div class="card-address">📍 ${inm.direccion || 'N/A'}, ${inm.ciudad || 'N/A'}</div>
                <div class="card-meta-row" style="display:flex; gap:10px; margin-top:8px; font-size:13px; color:var(--text-secondary);">
                    <span>📏 ${inm.metraje ? parseFloat(inm.metraje).toFixed(2) + ' m²' : 'N/A'}</span>
                    <span>🛏️ ${inm.habitaciones || 0}</span>
                    <span>🛁 ${inm.banos || 0}</span>
                </div>
                <div class="card-price" style="font-size:18px; font-weight:700; color:var(--text-primary); margin-top:10px;">${precioStr}</div>
            </div>
            <div class="admin-card-actions">
                <button class="btn-action view" title="Ver Info" onclick="verInmueble(${idInm})"><i class="bi bi-eye"></i> Ver</button>
                <button class="btn-action history" title="Historial" onclick="verHistorialInmueble(${idInm})"><i class="bi bi-clock-history"></i> Historial</button>
                <button class="btn-action edit" title="Editar" onclick="abrirModalEditar(${idInm})"><i class="bi bi-pencil-square"></i> Editar</button>
                <button class="btn-action delete" title="Eliminar" onclick="eliminarInmueble(${idInm})"><i class="bi bi-trash"></i> Eliminar</button>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

function renderClientesFiltered() {
    const tabla = document.getElementById("tabla-clientes");
    if (!tabla) return;
    tabla.innerHTML = "";
    
    let fNombre = (document.getElementById("filtro-cli-nombre")?.value || "").toLowerCase();
    let fId = (document.getElementById("filtro-cli-id")?.value || "").toLowerCase();
    let fTel = (document.getElementById("filtro-cli-tel")?.value || "").toLowerCase();
    
    let filtered = clientesGlobal.filter(cli => {
        let matchNom = (cli.nombre || "").toLowerCase().includes(fNombre);
        let matchId = (cli.identificacion || "").toLowerCase().includes(fId);
        let matchTel = (cli.telefono || "").toLowerCase().includes(fTel);
        return matchNom && matchId && matchTel;
    });
    
    if(filtered.length === 0) {
        tabla.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay coincidencias con los filtros.</td></tr>';
        return;
    }
    
    filtered.forEach(cli => {
        const id = cli.id_cliente || cli.id;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${id}</td>
            <td><strong>${cli.nombre}</strong></td>
            <td>${cli.identificacion}</td>
            <td>${cli.telefono || "N/A"}</td>
            <td>${cli.email || cli.correo || "<span style='color: var(--text-muted);'>Sin correo</span>"}</td>
            <td>${cli.direccion || "N/A"}</td>
            <td>${cli.fecha_nacimiento || "N/A"}</td>
            <td>
                <button class="btn-action edit" onclick='abrirModalEditarCliente(${JSON.stringify(cli)})' title="Editar">✏️</button>
                <button class="btn-action delete" onclick="eliminarRegistro('clientes', ${id}, cargarClientes)" title="Eliminar">🗑️</button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

function renderEmpleadosFiltered() {
    const tabla = document.getElementById("tabla-empleados");
    if (!tabla) return;
    tabla.innerHTML = "";
    
    let fNombre = (document.getElementById("filtro-emp-nombre")?.value || "").toLowerCase();
    let fId = (document.getElementById("filtro-emp-id")?.value || "").toLowerCase();
    let fRol = document.getElementById("filtro-emp-rol")?.value || "";
    
    let filtered = empleadosGlobal.filter(emp => {
        let matchNom = (emp.nombre || "").toLowerCase().includes(fNombre);
        let matchId = (emp.identificacion || "").toLowerCase().includes(fId);
        let matchRol = fRol === "" || (emp.tipo_empleado || "") === fRol;
        return matchNom && matchId && matchRol;
    });
    
    if(filtered.length === 0) {
        tabla.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay coincidencias con los filtros.</td></tr>';
        return;
    }
    
    filtered.forEach(emp => {
        const id = emp.id_empleado || emp.id;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>#${id}</td>
            <td><strong>${emp.nombre}</strong></td>
            <td>${emp.identificacion}</td>
            <td>${emp.telefono || "N/A"}</td>
            <td><span class="badge venta">${emp.tipo_empleado || "N/A"}</span></td>
            <td>${emp.id_usuario ? "Vinculado (#" + emp.id_usuario + ")" : "<span style='color:var(--text-muted)'>Sin usuario</span>"}</td>
            <td>
                <button class="btn-action edit" onclick='abrirModalEditarEmpleado(${JSON.stringify(emp)})' title="Editar">✏️</button>
                <button class="btn-action delete" onclick="eliminarRegistro('empleados', ${id}, cargarEmpleados)" title="Eliminar">🗑️</button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

// LÓGICA DE IMPRESIÓN PRO
function abrirModalImpresion(tipo) {
    // IMPORTANTE: En celulares, los popups asíncronos (como el de Swal) bloquean el window.open().
    // Por ende, si estamos en vista móvil, imprimimos de una vez de forma síncrona.
    if (window.innerWidth <= 1000) {
        imprimirReporte(tipo, 'filtrados');
        return;
    }

    Swal.fire({
        title: '🖨️ Opciones de Impresión',
        html: `
            <div style="text-align: left; margin-top: 10px;">
                <p style="margin-bottom: 10px; color: var(--text-color);">¿Qué información deseas incluir en el reporte?</p>
                <select id="swal-print-filter" class="swal2-select" style="width: 100%; font-size: 15px; padding: 10px; border-radius: 8px;">
                    <option value="filtrados">🗂️ Solo los registros que veo actualmente (Aplicar Filtros)</option>
                    <option value="todos">📊 TODOS los registros de la base de datos</option>
                </select>
            </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Generar PDF',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#475569',
        preConfirm: () => {
            return document.getElementById('swal-print-filter').value;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            imprimirReporte(tipo, result.value);
        }
    });
}

function imprimirReporte(tipo, modo = 'filtrados') {
    let titulo = "";
    let data = [];
    let theadHtml = "";
    let tbodyHtml = "";

    function applyFilter(baseData, filterLogic) {
        if (modo === 'todos') return baseData;
        return baseData.filter(filterLogic);
    }

    if (tipo === "inmuebles") {
        titulo = "Reporte de Inmuebles";
        let baseData = typeof inmueblesGlobal !== 'undefined' ? inmueblesGlobal : [];
        let fCiudad = (document.getElementById("filtro-inm-ciudad")?.value || "").toLowerCase();
        let fOperacion = document.getElementById("filtro-inm-operacion")?.value || "";
        let fEstado = document.getElementById("filtro-inm-estado")?.value || "";
        let fPrecioMax = document.getElementById("filtro-inm-precio-max")?.value;
        
        data = applyFilter(baseData, inm => {
            return ((inm.ciudad || "").toLowerCase().includes(fCiudad) &&
                    (fOperacion === "" || (inm.tipo_operacion || "").toUpperCase() === fOperacion) &&
                    (fEstado === "" || (inm.estado || "").toUpperCase() === fEstado) &&
                    (!fPrecioMax || parseFloat(inm.precio) <= parseFloat(fPrecioMax)));
        });

        theadHtml = `<tr><th>ID</th><th>Dirección</th><th>Barrio</th><th>Ciudad</th><th>Metraje</th><th>Operación</th><th>Precio</th><th>Estado</th></tr>`;
        data.forEach(inm => {
            let precio = inm.precio ? "$ " + parseInt(inm.precio).toLocaleString("es-CO") : "N/A";
            tbodyHtml += `<tr>
                <td>${inm.id_inmueble || inm.id || ""}</td>
                <td>${inm.direccion || ""}</td>
                <td>${inm.barrio || ""}</td>
                <td>${inm.ciudad || ""}</td>
                <td>${inm.metraje ? inm.metraje + ' m²' : ""}</td>
                <td>${inm.tipo_operacion || ""}</td>
                <td>${precio}</td>
                <td>${inm.estado || ""}</td>
            </tr>`;
        });
    } else if (tipo === "clientes") {
        titulo = "Directorio de Clientes";
        let baseData = typeof clientesGlobal !== 'undefined' ? clientesGlobal : [];
        let fNombre = (document.getElementById("filtro-cli-nombre")?.value || "").toLowerCase();
        let fId = (document.getElementById("filtro-cli-id")?.value || "").toLowerCase();
        let fTel = (document.getElementById("filtro-cli-tel")?.value || "").toLowerCase();
        
        data = applyFilter(baseData, cli => {
            return ((cli.nombre || "").toLowerCase().includes(fNombre) &&
                    (cli.identificacion || "").toLowerCase().includes(fId) &&
                    (cli.telefono || "").toLowerCase().includes(fTel));
        });

        theadHtml = `<tr><th>ID</th><th>Nombre</th><th>Identificación</th><th>Teléfono</th><th>Correo</th><th>Dirección</th><th>Fecha Nac.</th></tr>`;
        data.forEach(cli => {
            tbodyHtml += `<tr>
                <td>${cli.id_cliente || cli.id || ""}</td>
                <td>${cli.nombre || ""}</td>
                <td>${cli.identificacion || ""}</td>
                <td>${cli.telefono || ""}</td>
                <td>${cli.email || cli.correo || ""}</td>
                <td>${cli.direccion || ""}</td>
                <td>${cli.fecha_nacimiento || ""}</td>
            </tr>`;
        });
    } else if (tipo === "empleados" || tipo === "administradores") {
        titulo = tipo === "administradores" ? "Directorio de Administradores" : "Directorio de Empleados";
        let baseData = typeof empleadosGlobal !== 'undefined' ? empleadosGlobal : [];
        
        if (tipo === "administradores") {
            baseData = baseData.filter(emp => emp.tipo_empleado === "Administrador");
        }

        let fNombre = (document.getElementById("filtro-emp-nombre")?.value || "").toLowerCase();
        let fId = (document.getElementById("filtro-emp-id")?.value || "").toLowerCase();
        let fRol = document.getElementById("filtro-emp-rol")?.value || "";
        
        data = applyFilter(baseData, emp => {
            return ((emp.nombre || "").toLowerCase().includes(fNombre) &&
                    (emp.identificacion || "").toLowerCase().includes(fId) &&
                    (fRol === "" || (emp.tipo_empleado || "") === fRol));
        });

        theadHtml = `<tr><th>ID</th><th>Nombre</th><th>Identificación</th><th>Teléfono</th><th>Rol</th><th>ID Usuario</th></tr>`;
        data.forEach(emp => {
            tbodyHtml += `<tr>
                <td>${emp.id_empleado || emp.id || ""}</td>
                <td>${emp.nombre || ""}</td>
                <td>${emp.identificacion || ""}</td>
                <td>${emp.telefono || ""}</td>
                <td>${emp.tipo_empleado || ""}</td>
                <td>${emp.id_usuario || "Ninguno"}</td>
            </tr>`;
        });
    } else if (tipo === "citas") {
        titulo = "Reporte de Citas";
        let baseData = typeof citasGlobal !== 'undefined' ? citasGlobal : [];
        let filtroFecha = document.getElementById("filtro-cita-fecha")?.value || "";
        let filtroEstado = document.getElementById("filtro-cita-estado")?.value || "";

        data = applyFilter(baseData, c => {
            let matchFecha = !filtroFecha || (c.fecha_hora || "").startsWith(filtroFecha);
            let matchEstado = !filtroEstado || c.estado === filtroEstado;
            return matchFecha && matchEstado;
        });

        theadHtml = `<tr><th>ID Cita</th><th>Fecha y Hora</th><th>Estado</th><th>ID Cliente</th><th>ID Empleado</th></tr>`;
        data.forEach(c => {
            tbodyHtml += `<tr>
                <td>${c.id_cita || ""}</td>
                <td>${(c.fecha_hora || "").replace('T', ' ')}</td>
                <td>${c.estado || ""}</td>
                <td>${c.id_cliente || ""}</td>
                <td>${c.id_empleado || ""}</td>
            </tr>`;
        });
    } else if (tipo === "transacciones") {
        titulo = "Reporte de Transacciones";
        let baseData = typeof transaccionesGlobal !== 'undefined' ? transaccionesGlobal : [];
        
        data = applyFilter(baseData, t => true); // Asumiendo que no hay filtros en UI aún, o aplicar si los hay

        theadHtml = `<tr><th>ID</th><th>Tipo</th><th>Fecha</th><th>Valor</th><th>ID Inmueble</th><th>ID Cliente</th><th>ID Empleado</th></tr>`;
        data.forEach(t => {
            let valor = t.valor ? "$ " + parseInt(t.valor).toLocaleString("es-CO") : "N/A";
            tbodyHtml += `<tr>
                <td>${t.id_transaccion || t.id || ""}</td>
                <td>${t.tipo_operacion || t.tipo_transaccion || ""}</td>
                <td>${(t.fecha_transaccion || t.fecha || "").replace('T', ' ')}</td>
                <td>${valor}</td>
                <td>${t.id_inmueble || ""}</td>
                <td>${t.id_cliente || ""}</td>
                <td>${t.id_empleado || ""}</td>
            </tr>`;
        });
    } else if (tipo === "pagos") {
        titulo = "Reporte de Pagos";
        let baseData = typeof pagosGlobal !== 'undefined' ? pagosGlobal : [];
        
        data = applyFilter(baseData, p => true); 

        theadHtml = `<tr><th>ID Pago</th><th>ID Transacción</th><th>Monto</th><th>Fecha Pago</th><th>Método</th></tr>`;
        data.forEach(p => {
            let monto = p.monto ? "$ " + parseInt(p.monto).toLocaleString("es-CO") : "N/A";
            tbodyHtml += `<tr>
                <td>${p.id_pago || p.id || ""}</td>
                <td>${p.id_transaccion || ""}</td>
                <td>${monto}</td>
                <td>${(p.fecha_pago || "").replace('T', ' ')}</td>
                <td>${p.metodo_pago || ""}</td>
            </tr>`;
        });
    }

    const fechaHoy = new Date().toLocaleString("es-CO");

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${titulo} - ING AYA</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                
                :root {
                    --brand-color: #2563eb;
                    --brand-dark: #1e3a8a;
                    --text-main: #1f2937;
                    --text-muted: #6b7280;
                    --border-color: #e5e7eb;
                }

                body { 
                    font-family: 'Inter', sans-serif; 
                    color: var(--text-main); 
                    padding: 40px; 
                    background-color: #fff;
                }

                /* Background Watermark */
                body::before {
                    content: "ING AYA";
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 150px;
                    font-weight: 900;
                    color: rgba(37, 99, 235, 0.03);
                    z-index: -1;
                    pointer-events: none;
                }

                .header { 
                    display: flex; 
                    justify-content: space-between;
                    align-items: center; 
                    border-bottom: 4px solid var(--brand-dark); 
                    padding-bottom: 20px; 
                    margin-bottom: 30px; 
                }
                
                .header-left h1 { 
                    margin: 0; 
                    color: var(--brand-dark); 
                    font-size: 28px; 
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .header-logo { 
                    font-size: 36px; 
                    font-weight: 900; 
                    color: var(--brand-dark); 
                    letter-spacing: -1px; 
                }
                .header-logo span { color: #ef4444; } /* Rojo AYA */

                .info { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 30px; 
                    font-size: 13px; 
                    color: var(--text-muted); 
                    background: #f8fafc;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid var(--brand-color);
                }

                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    font-size: 12px; 
                    box-shadow: 0 0 0 1px var(--border-color);
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                th { 
                    background-color: var(--brand-dark); 
                    color: #ffffff; 
                    font-weight: 600; 
                    text-align: left; 
                    padding: 14px 12px; 
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 0.5px;
                }
                
                td { 
                    padding: 12px; 
                    border-bottom: 1px solid var(--border-color); 
                }
                
                tr:last-child td {
                    border-bottom: none;
                }

                tr:nth-child(even) { 
                    background-color: #f9fafb; 
                }

                .footer { 
                    margin-top: 50px; 
                    text-align: center; 
                    font-size: 11px; 
                    color: var(--text-muted); 
                    border-top: 2px solid var(--border-color); 
                    padding-top: 20px; 
                }

                .footer p { margin: 5px 0; }

                @media print {
                    body { padding: 0; }
                    body::before { color: rgba(37, 99, 235, 0.04) !important; -webkit-print-color-adjust: exact; }
                    th { background-color: var(--brand-dark) !important; color: white !important; -webkit-print-color-adjust: exact; }
                    tr:nth-child(even) { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
                    .info { background: #f8fafc !important; border-left: 4px solid var(--brand-color) !important; -webkit-print-color-adjust: exact; }
                    @page { margin: 1.5cm; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-left">
                    <h1>${titulo}</h1>
                    <div style="font-size: 14px; color: var(--text-muted); margin-top: 5px;">Sistema de Administración Financiera e Inmobiliaria</div>
                </div>
                <div class="header-logo">ING<span>AYA</span></div>
            </div>
            
            <div class="info">
                <div><strong>📅 Fecha de emisión:</strong> ${fechaHoy}</div>
                <div><strong>📊 Total Registros:</strong> ${data.length}</div>
                <div><strong>📌 Filtro Aplicado:</strong> ${modo === 'todos' ? 'Todos los registros' : 'Registros filtrados'}</div>
            </div>

            <table>
                <thead>${theadHtml}</thead>
                <tbody>${tbodyHtml}</tbody>
            </table>

            <div class="footer">
                <p><strong>ING AYA S.A.S</strong> - NIT: 900.XXX.XXX-X</p>
                <p>Dirección Principal: Bogotá, Colombia | Teléfono: +57 (300) 123-4567</p>
                <p>Documento generado confidencialmente por el Panel de Administración ING AYA. Prohibida su distribución no autorizada.</p>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}


// ASIGNAR EVENT LISTENERS DE FILTROS AL INICIAR
document.addEventListener("DOMContentLoaded", () => {
    // Inmuebles
    document.getElementById("filtro-inm-ciudad")?.addEventListener("input", renderInmueblesFiltered);
    document.getElementById("filtro-inm-operacion")?.addEventListener("change", renderInmueblesFiltered);
    document.getElementById("filtro-inm-estado")?.addEventListener("change", renderInmueblesFiltered);
    document.getElementById("filtro-inm-precio-max")?.addEventListener("input", renderInmueblesFiltered);
    
    // Clientes
    document.getElementById("filtro-cli-nombre")?.addEventListener("input", renderClientesFiltered);
    document.getElementById("filtro-cli-id")?.addEventListener("input", renderClientesFiltered);
    document.getElementById("filtro-cli-tel")?.addEventListener("input", renderClientesFiltered);

    // Empleados
    document.getElementById("filtro-emp-nombre")?.addEventListener("input", renderEmpleadosFiltered);
    document.getElementById("filtro-emp-id")?.addEventListener("input", renderEmpleadosFiltered);
    document.getElementById("filtro-emp-rol")?.addEventListener("change", renderEmpleadosFiltered);
});

function cerrarModalCliente() { document.getElementById("modal-cliente").style.display = "none"; }
function cerrarModalEmpleado() { document.getElementById("modal-empleado").style.display = "none"; }
function cerrarModalRol() { document.getElementById("modal-rol").style.display = "none"; }



// ==========================================
// MÓDULOS FINANCIEROS Y CITAS
// ==========================================

let citasGlobal = [];
let transaccionesGlobal = [];
let pagosGlobal = [];

async function finalizarCita(id_cita) {
    const token = sessionStorage.getItem("mi_token");
    Swal.fire({
        title: '¿Marcar cita como Finalizada?',
        text: "Se le enviará un correo de agradecimiento al cliente.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, finalizar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`https://ingaya-django-production.up.railway.app/api/citas/${id_cita}/finalizar_cita/`, {
                    method: 'POST',
                    headers: { "Authorization": "Token " + token }
                });
                if (response.ok) {
                    Swal.fire('Éxito', 'Cita finalizada.', 'success');
                    cargarCitas();
                } else throw new Error("Error API");
            } catch (e) {
                Swal.fire('Error', 'No se pudo procesar.', 'error');
            }
        }
    });
}

async function citaNoAsistio(id_cita) {
    const token = sessionStorage.getItem("mi_token");
    Swal.fire({
        title: '¿Cliente no asistió?',
        text: "Se registrará como inasistencia y se le notificará al cliente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, marcar no asistió',
        confirmButtonColor: '#ef4444'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`https://ingaya-django-production.up.railway.app/api/citas/${id_cita}/no_asistio/`, {
                    method: 'POST',
                    headers: { "Authorization": "Token " + token }
                });
                if (response.ok) {
                    Swal.fire('Guardado', 'Inasistencia registrada.', 'success');
                    cargarCitas();
                } else throw new Error("Error API");
            } catch (e) {
                Swal.fire('Error', 'No se pudo procesar.', 'error');
            }
        }
    });
}

async function abrirModalAsignarAgente(id_cita) {
    // Buscar lista de empleados (Agentes)
    try {
        const token = sessionStorage.getItem("mi_token");
        const res = await fetch("https://ingaya-django-production.up.railway.app/api/empleados/", { headers: { "Authorization": "Token " + token } });
        if (!res.ok) return;
        const empleados = await res.json();
        const agentes = empleados.filter(e => e.tipo_empleado && e.tipo_empleado.toUpperCase() === 'AGENTE');
        
        let optionsHtml = agentes.map(a => `<option value="${a.id_empleado}">${a.nombre}</option>`).join('');
        
        Swal.fire({
            title: 'Asignar Agente a Cita #' + id_cita,
            html: `
                <div style="text-align: left; margin-bottom: 10px;">
                      <label style="font-weight: bold; font-size: 14px; color: #475569;">Seleccione un Agente Inmobiliario:</label>
                  </div>
                  <select id="swal-agente-id" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; color: #1e293b; font-size: 15px; outline: none; cursor: pointer;">
                      <option value="">-- Elija un agente --</option>
                      ${optionsHtml}
                  </select>
                  <p style="font-size: 12px; color: #64748b; text-align: left; margin-top: 12px;">El agente recibirá un correo de notificación y el cliente también será informado de la asignación.</p>
            `,
            confirmButtonText: 'Confirmar Asignación',
              confirmButtonColor: '#3b82f6',
            showCancelButton: true,
            preConfirm: () => {
                const selected = document.getElementById('swal-agente-id').value;
                if (!selected) {
                    Swal.showValidationMessage('Debe seleccionar un agente');
                    return false;
                }
                return selected;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Usamos PATCH estándar para evitar fallos del servidor remoto (ej. fallo de correos SMTP)
                      const response = await fetch(`https://ingaya-django-production.up.railway.app/api/citas/${id_cita}/asignar_agente/`, {
                        method: 'POST',
                        headers: {
                            "Authorization": "Token " + token,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ 
                            id_empleado: result.value 
                        })
                    });
                    if (response.ok) {
                        Swal.fire('Asignado', 'Agente asignado y cita confirmada exitosamente.', 'success');
                        cargarCitas();
                    } else {
                        const errorData = await response.text();
                        throw new Error(errorData || `Error HTTP ${response.status}`);
                    }
                } catch(e) {
                    Swal.fire('Error', `Error al asignar agente: ${e.message}`, 'error');
                }
            }
        });
        
    } catch(e) { console.error(e); }
}

// ---- CITAS ----
async function cargarCitas(silent = false) {
    if(silent) { try { const r = await fetch("https://ingaya-django-production.up.railway.app/api/citas/"); if(r.ok) citasGlobal = await r.json(); }catch(e){} return; }
    try {
        const response = await fetch("https://ingaya-django-production.up.railway.app/api/citas/");
        if (!response.ok) throw new Error("Error fetching citas");
        citasGlobal = await response.json();
    } catch(e) { console.error(e); citasGlobal = []; }
    renderCitasFiltered();
}

function formatCitaDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    return date.toLocaleString('es-CO', options).replace(',', ' -');
}

function renderCitasFiltered() {
    const tabla = document.getElementById("tabla-citas");
    if (!tabla) return;
    
    const perfil = JSON.parse(sessionStorage.getItem("mi_perfil") || "{}");
    
    const verHistorial = document.getElementById("filtro-cita-historial")?.checked;
    const filtroFecha = document.getElementById("filtro-cita-fecha").value;
    const filtroEstado = document.getElementById("filtro-cita-estado").value;
    
    let filtradas = citasGlobal.filter(c => {
        let matchFecha = (!filtroFecha) || c.fecha_hora.startsWith(filtroFecha);
        
        let cEstado = (c.estado || "").toUpperCase();
        let matchEstado = (!filtroEstado) || (cEstado === filtroEstado);
        
        let activa = cEstado === 'PROGRAMADA' || cEstado === 'CONFIRMADA';
        let historial = cEstado === 'FINALIZADA' || cEstado === 'NO_ASISTIO' || cEstado === 'CANCELADA';
        
        let matchTab = verHistorial ? historial : activa;
        
        let matchRol = true;
        const rolActual = sessionStorage.getItem("rol") || '';
        const esAgente = rolActual.toUpperCase().includes('AGENTE');
        if (esAgente) {
            if (!verHistorial) matchRol = (cEstado === 'CONFIRMADA' || cEstado === 'PROGRAMADA');
        }
        
        return matchFecha && matchEstado && matchTab && matchRol;
    });

    if (filtradas.length === 0) {
        tabla.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay citas para mostrar en esta vista.</td></tr>';
        return;
    }

    tabla.innerHTML = filtradas.map(c => {
        let empleadoHtml = c.id_empleado ? c.empleado_nombre : '<span style="color: #f59e0b; font-weight: bold;">Agente pendiente por confirmar</span>';
        let cEstado = (c.estado || "").toUpperCase();
        
        let accionesHtml = '';
        const rolActual = sessionStorage.getItem("rol") || '';
        const esAgente = rolActual.toUpperCase().includes('AGENTE');
        if (esAgente && cEstado === 'PROGRAMADA') {
            accionesHtml = `
                <button class="btn-success" onclick="confirmarCitaAgente(${c.id_cita})" style="margin-right: 5px;">✅ Confirmar</button>
                <button class="btn-danger" onclick="cancelarCitaAgente(${c.id_cita})">❌ Cancelar</button>
            `;
        } else if (esAgente && cEstado === 'CONFIRMADA') {
            accionesHtml = `
                <span style="color: #10b981; font-weight: bold; margin-right: 10px;">Cita Confirmada</span>
            `;
        } else if (!esAgente && !verHistorial) {
            accionesHtml += `<div style="display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-start; align-items: center; width: 100%;">`;
            if (!c.id_empleado && cEstado === 'PROGRAMADA') {
                accionesHtml += `<button class="btn-primary" onclick="abrirModalAsignarAgente(${c.id_cita})" style="padding: 6px 12px; font-size: 13px; width: 100%; margin-bottom: 5px;">👤 Asignar Agente</button>`;
            }
            accionesHtml += `
                <button class="btn-secondary" onclick="abrirModalEditarCita(${c.id_cita})" style="padding: 6px 12px; font-size: 13px; flex: 1;">✏️ Editar</button>
                <button class="btn-danger" onclick="eliminarRegistro('citas', ${c.id_cita}, cargarCitas)" style="padding: 6px 12px; font-size: 13px; flex: 1;">❌ Eliminar</button>
            `;
            accionesHtml += `</div>`;
        }
        
        let badgeColor = '';
        if (cEstado === 'PROGRAMADA') badgeColor = '#f59e0b';
        else if (cEstado === 'CONFIRMADA') badgeColor = '#3b82f6';
        else if (cEstado === 'FINALIZADA') badgeColor = '#10b981';
        else if (cEstado === 'NO_ASISTIO') badgeColor = '#ef4444';
        else if (cEstado === 'CANCELADA') badgeColor = '#6b7280';
        
        return `
        <tr>
            <td>${c.id_cita}</td>
            <td>${formatCitaDate(c.fecha_hora)}</td>
            <td><span style="background-color: ${badgeColor}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">${cEstado}</span></td>
            <td>${c.cliente_nombre || 'Cliente ID: ' + c.id_cliente}</td>
            <td>${empleadoHtml}</td>
            <td>${accionesHtml}</td>
        </tr>
        `;
    }).join('');
}

function llenarSelectGenerico(selectId, datos, idField, displayField, defaultText) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="">${defaultText}</option>`;
    datos.forEach(item => {
        const id = item[idField] || item.id;
        const display = item[displayField];
        const opt = document.createElement("option");
        opt.value = id;
        opt.innerText = `#${id} - ${display}`;
        select.appendChild(opt);
    });
}

async function asegurarDatosGlobales() {
    if (clientesGlobal.length === 0) try { const r = await fetch("https://ingaya-django-production.up.railway.app/api/clientes/"); if(r.ok) clientesGlobal = await r.json(); } catch(e){}
    if (empleadosGlobal.length === 0) try { const r = await fetch("https://ingaya-django-production.up.railway.app/api/empleados/"); if(r.ok) empleadosGlobal = await r.json(); } catch(e){}
    if (inmueblesGlobal.length === 0) try { const r = await fetch("https://ingaya-django-production.up.railway.app/api/inmuebles/"); if(r.ok) inmueblesGlobal = await r.json(); } catch(e){}
    if (transaccionesGlobal.length === 0) try { const r = await fetch("https://ingaya-django-production.up.railway.app/api/transacciones/"); if(r.ok) transaccionesGlobal = await r.json(); } catch(e){}
}

async function abrirModalCita() {
    await asegurarDatosGlobales();
    document.getElementById("form-cita").reset();
    document.getElementById("cita-id").value = "";
    document.getElementById("modal-cita-titulo").innerText = "Agendar Nueva Cita";
    
    llenarSelectGenerico("cita-cliente", clientesGlobal, "id_cliente", "nombre", "Seleccione un cliente...");
    
    document.getElementById("modal-cita").style.display = "flex";
}

async function abrirModalEditarCita(id) {
    await asegurarDatosGlobales();
    const c = citasGlobal.find(x => x.id_cita == id);
    if (!c) return;
    
    llenarSelectGenerico("cita-cliente", clientesGlobal, "id_cliente", "nombre", "Seleccione un cliente...");

    document.getElementById("cita-id").value = id;
    
    if (c.fecha_hora) {
        const d = new Date(c.fecha_hora);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
        document.getElementById("cita-fecha").value = localISOTime;
    } else {
        document.getElementById("cita-fecha").value = "";
    }
    
    document.getElementById("cita-estado").value = (c.estado || "").toUpperCase();
    document.getElementById("cita-descripcion").value = c.descripcion;
    document.getElementById("cita-cliente").value = c.id_cliente;
    
    document.getElementById("modal-cita-titulo").innerText = "Editar Cita #" + id;
    document.getElementById("modal-cita").style.display = "flex";
}
function cerrarModalCita() { document.getElementById("modal-cita").style.display = "none"; }

document.getElementById("form-cita")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const id = document.getElementById("cita-id").value;
    const data = {
        fecha_hora: document.getElementById("cita-fecha").value,
        estado: document.getElementById("cita-estado").value,
        descripcion: document.getElementById("cita-descripcion").value,
        id_cliente: document.getElementById("cita-cliente").value || null
    };
    
    let url = "https://ingaya-django-production.up.railway.app/api/citas/";
    let method = "POST";
    if (id) {
        url += id + "/";
        method = "PUT";
    }
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Error guardando cita");
        Swal.fire('¡Éxito!', id ? 'Cita actualizada' : 'Cita creada', 'success');
        cerrarModalCita();
        cargarCitas();
    } catch(e) {
        Swal.fire('Error', 'No se pudo guardar la cita', 'error');
    }
});

// ---- TRANSACCIONES ----
async function cargarTransacciones(silent = false) {
    if(silent) { try { const r = await fetch("https://ingaya-django-production.up.railway.app/api/transacciones/"); if(r.ok) transaccionesGlobal = await r.json(); }catch(e){} return; }
    try {
        const response = await fetch("https://ingaya-django-production.up.railway.app/api/transacciones/");
        if (!response.ok) throw new Error("Error fetching transacciones");
        transaccionesGlobal = await response.json();
    } catch(e) { console.error(e); transaccionesGlobal = []; }
    renderTransaccionesFiltered();
}



function formatearPrecio(valor) {
    if (!valor) return "0";
    return parseInt(valor).toLocaleString("es-CO");
}

function renderTransaccionesFiltered() {
    const tabla = document.getElementById("tabla-transacciones");
    if (!tabla) return;
    
    const filtroTipo = document.getElementById("filtro-trans-tipo").value;
    const filtroEstado = document.getElementById("filtro-trans-estado").value;
    
    

    let filtradas = transaccionesGlobal.filter(t => {
        let matchTipo = !filtroTipo || t.tipo_operacion === filtroTipo;
        let matchEstado = !filtroEstado || t.estado === filtroEstado;
        return matchTipo && matchEstado;
    });

    if (filtradas.length === 0) {
        tabla.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay transacciones registradas.</td></tr>';
        return;
    }

    tabla.innerHTML = filtradas.map(t => {
        let realTipo = t.tipo_operacion;
        const inm = inmueblesGlobal.find(i => (i.id_inmueble || i.id) == t.id_inmueble);
        if (inm && inm.tipo_operacion) {
            realTipo = inm.tipo_operacion;
        }
        return `
        <tr>
            <td>${t.id_transaccion}</td>
            <td>${t.fecha.replace('T', ' ')}</td>
            <td>${realTipo}</td>
            <td>$${formatearPrecio(t.valor_total)}</td>
            <td><span class="badge badge-${t.estado.toLowerCase()}">${t.estado}</span></td>
            <td>Cliente ID: ${t.id_cliente}</td>
            <td>Inmueble ID: ${t.id_inmueble}</td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: flex-start; align-items: center;">
                    <button class="btn-primary" style="background-color: #1e3a8a; padding: 6px 12px; border: none; border-radius: 4px; color: white; cursor: pointer; white-space: nowrap;" onclick="verTimelineTransaccion(${t.id_transaccion})">⏳ Ver Timeline</button>
                    <button class="btn-secondary" style="background-color: #4b5563; padding: 6px 12px; border: none; border-radius: 4px; color: white; cursor: pointer;" onclick="abrirModalEditarTransaccion(${t.id_transaccion})">✏️</button>
                    <button class="btn-secondary" style="background-color: #ef4444; padding: 6px 12px; border: none; border-radius: 4px; color: white; cursor: pointer;" onclick="eliminarTransaccion(${t.id_transaccion})">🗑️</button>
                </div>
            </td>
        </tr>
    `}).join('');
    
    cargarVencimientos();
}

function verTimelineTransaccion(id) {
    const t = transaccionesGlobal.find(x => x.id_transaccion == id);
    if (!t) return;
    
    let realTipo = t.tipo_operacion;
    const inm = inmueblesGlobal.find(i => (i.id_inmueble || i.id) == t.id_inmueble);
    if (inm && inm.tipo_operacion) {
        realTipo = inm.tipo_operacion;
    }
    
    let pasoActual = 1;
    let isArriendo = realTipo && realTipo.toUpperCase() === "ARRIENDO";
    
    if (isArriendo) {
        if (t.estado === "CONTRATO_PENDIENTE" || t.estado === "CONTRATO" || t.estado === "CONTRATO_P") pasoActual = 2;
        if (t.estado === "PAGO_PENDIENTE" || t.estado === "PAGO_PEND") pasoActual = 3;
        if (t.estado === "ARRENDADO") pasoActual = 4;
    } else {
        if (t.estado === "PROMESA") pasoActual = 2;
        if (t.estado === "TRAMITE" || t.estado === "EN_TRAMITE") pasoActual = 3;
        if (t.estado === "ESCRITURACION" || t.estado === "ESCRITURAS") pasoActual = 4;
        if (t.estado === "COMPLETADA" || t.estado === "FINALIZADA") pasoActual = 5;
    }

    let timelineHtml = '';
    if (isArriendo) {
        timelineHtml = `
            <div class="timeline-container">
                <div class="timeline-step ${pasoActual >= 1 ? 'active' : ''}">
                    <div class="timeline-icon">1</div>
                    <div class="timeline-text">Verificación Docs</div>
                </div>
                <div class="timeline-line ${pasoActual >= 2 ? 'active' : ''}"></div>
                <div class="timeline-step ${pasoActual >= 2 ? 'active' : ''}">
                    <div class="timeline-icon">2</div>
                    <div class="timeline-text">Firma Contrato</div>
                </div>
                <div class="timeline-line ${pasoActual >= 3 ? 'active' : ''}"></div>
                <div class="timeline-step ${pasoActual >= 3 ? 'active' : ''}">
                    <div class="timeline-icon">3</div>
                    <div class="timeline-text">Pago Inicial</div>
                </div>
                <div class="timeline-line ${pasoActual >= 4 ? 'active' : ''}"></div>
                <div class="timeline-step ${pasoActual >= 4 ? 'active' : ''}">
                    <div class="timeline-icon">4</div>
                    <div class="timeline-text">Arrendado</div>
                </div>
            </div>`;
    } else {
        timelineHtml = `
            <div class="timeline-container">
                <div class="timeline-step ${pasoActual >= 1 ? 'active' : ''}">
                    <div class="timeline-icon">1</div>
                    <div class="timeline-text">Separación</div>
                </div>
                <div class="timeline-line ${pasoActual >= 2 ? 'active' : ''}"></div>
                <div class="timeline-step ${pasoActual >= 2 ? 'active' : ''}">
                    <div class="timeline-icon">2</div>
                    <div class="timeline-text">Firma Promesa</div>
                </div>
                <div class="timeline-line ${pasoActual >= 3 ? 'active' : ''}"></div>
                <div class="timeline-step ${pasoActual >= 3 ? 'active' : ''}">
                    <div class="timeline-icon">3</div>
                    <div class="timeline-text">Trámite Banco</div>
                </div>
                <div class="timeline-line ${pasoActual >= 4 ? 'active' : ''}"></div>
                <div class="timeline-step ${pasoActual >= 4 ? 'active' : ''}">
                    <div class="timeline-icon">4</div>
                    <div class="timeline-text">Escrituración</div>
                </div>
                <div class="timeline-line ${pasoActual >= 5 ? 'active' : ''}"></div>
                <div class="timeline-step ${pasoActual >= 5 ? 'active' : ''}">
                    <div class="timeline-icon">5</div>
                    <div class="timeline-text">Completada</div>
                </div>
            </div>`;
    }

    Swal.fire({
        title: `Progreso de Transacción #${id}`,
        width: '800px',
        html: `
            ${timelineHtml}
            
            <div style="margin-top: 30px; text-align: left; padding: 15px; background: #f8fafc; border-radius: 8px;">
                <h3 style="margin-top:0; color: #1e3a8a;">Información de Progreso</h3>
                <p><strong>Valor Total:</strong> $${formatearPrecio(t.valor_total)}</p>
                <p><strong>Estado Actual:</strong> ${t.estado}</p>
                ${(!isArriendo && pasoActual === 5) ? `<p><strong>Día de Entrega Programado:</strong> <span style="color:#10b981; font-weight:bold;">${calcularDiaEntrega(t.fecha_transaccion)}</span></p>` : ''}
                <p style="color: #64748b; font-size: 13px; margin-top: 10px;">*El cliente ahora puede avanzar el trámite de manera interactiva desde su perfil (subir documentos, firmar, pagar).</p>
            </div>
        `,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#1e3a8a'
    });
}

function calcularDiaEntrega(fechaTx) {
    let base = fechaTx ? new Date(fechaTx) : new Date();
    base.setDate(base.getDate() + 15);
    return base.toLocaleDateString();
}




function renderPagosFiltered() {
    const tabla = document.getElementById("tabla-pagos");
    if (!tabla) return;
    
    const filtroMetodo = document.getElementById("filtro-pago-metodo").value;
    const filtroEstado = document.getElementById("filtro-pago-estado").value;
    
    

    let filtradas = pagosGlobal.filter(p => {
        let matchMetodo = !filtroMetodo || p.metodo_pago === filtroMetodo;
        let matchEstado = !filtroEstado || p.estado_pago === filtroEstado;
        return matchMetodo && matchEstado;
    });

    if (filtradas.length === 0) {
        tabla.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay pagos registrados.</td></tr>';
        return;
    }

    tabla.innerHTML = filtradas.map(p => `
        <tr>
            <td>${p.id_pago}</td>
            <td>${p.fecha_pago.replace('T', ' ')}</td>
            <td>$${formatearPrecio(p.monto)}</td>
            <td>${p.metodo_pago}</td>
            <td><span class="badge badge-${p.estado_pago.toLowerCase()}">${p.estado_pago}</span></td>
            <td>Tx: ${p.id_transaccion}</td>
            <td>
                <button class="btn-secondary" style="background-color: #10b981; color:white; border:none;" onclick="generarReciboPDF(${p.id_pago})">📄 Recibo PDF</button>
                <button class="btn-secondary" onclick="abrirModalEditarPago(${p.id_pago})">✏️</button>
            </td>
        </tr>
    `).join('');
}

function generarReciboPDF(id_pago) {
    const p = pagosGlobal.find(x => x.id_pago == id_pago);
    if (!p) return;

    const fechaHoy = new Date().toLocaleString("es-CO");
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Recibo de Caja #${p.id_pago} - ING AYA</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                body { font-family: 'Inter', sans-serif; color: #1f2937; padding: 40px; background-color: #fff; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; }
                .header-logo { font-size: 36px; font-weight: 900; color: #1e3a8a; letter-spacing: -1px; }
                .header-logo span { color: #ef4444; }
                .factura-box { border: 2px solid #e5e7eb; border-radius: 8px; padding: 30px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #f3f4f6; padding-bottom: 15px;}
                .monto-gigante { font-size: 32px; font-weight: 800; color: #1e3a8a; text-align: center; margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
                .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #6b7280; border-top: 2px solid #e5e7eb; padding-top: 20px; }
                .firma { margin-top: 60px; display: flex; justify-content: space-around; }
                .firma div { border-top: 1px solid #1f2937; width: 250px; text-align: center; padding-top: 10px; font-weight: 600;}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-logo">ING<span>AYA</span></div>
                <div style="text-align: right;">
                    <h1 style="margin: 0; color: #1e3a8a; font-size: 24px;">RECIBO DE CAJA OFICIAL</h1>
                    <div style="font-size: 16px; color: #6b7280; font-weight: bold;">N° ${p.id_pago}</div>
                </div>
            </div>
            
            <div class="factura-box">
                <div class="row">
                    <div><strong>Fecha del Pago:</strong> ${p.fecha_pago.replace('T', ' ')}</div>
                    <div><strong>Fecha de Emisión:</strong> ${fechaHoy}</div>
                </div>
                <div class="row">
                    <div><strong>Recibí de (Cliente):</strong> C.C Asociada a Transacción #${p.id_transaccion}</div>
                    <div><strong>Método de Pago:</strong> ${p.metodo_pago}</div>
                </div>
                <div class="row" style="border: none;">
                    <div style="width: 100%;"><strong>Por concepto de:</strong> ${p.concepto || 'Abono a Transacción'}</div>
                </div>
                
                <div class="monto-gigante">
                    LA SUMA DE: $${formatearPrecio(p.monto)} COP
                </div>
                
                <p style="font-size: 13px; color: #6b7280; text-align: justify;">El presente recibo es constancia de pago aplicable a la transacción referenciada. Este documento no es una factura electrónica de venta, es un soporte contable interno.</p>
                
                <div class="firma">
                    <div>Recibe: ING AYA S.A.S</div>
                    <div>Firma Cliente</div>
                </div>
            </div>

            <div class="footer">
                <p><strong>ING AYA S.A.S</strong> - NIT: 900.XXX.XXX-X</p>
                <p>Dirección Principal: Bogotá, Colombia | Teléfono: +57 (300) 123-4567</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

// RESTORED MODAL FUNCTIONS
async function cargarPagos(silent = false) {
    if(silent) { try { const r = await fetch("https://ingaya-django-production.up.railway.app/api/pagos/"); if(r.ok) pagosGlobal = await r.json(); }catch(e){} return; }
    try {
        const response = await fetch("https://ingaya-django-production.up.railway.app/api/pagos/");
        if (!response.ok) throw new Error("Error fetching pagos");
        pagosGlobal = await response.json();
    } catch(e) { console.error(e); pagosGlobal = []; }
    renderPagosFiltered();
}

async function abrirModalTransaccion() {
    await asegurarDatosGlobales();
    const { value: formValues } = await Swal.fire({
        title: 'Registrar Transacción',
        html: `
            <select id="swal-trans-cliente" class="swal2-input">
                <option value="">Seleccione Cliente...</option>
                ${clientesGlobal.map(c => `<option value="${c.id_cliente}">${c.nombre}</option>`).join('')}
            </select>
            <select id="swal-trans-inmueble" class="swal2-input">
                <option value="">Seleccione Inmueble...</option>
                ${inmueblesGlobal.map(i => `<option value="${i.id_inmueble}">${i.direccion}</option>`).join('')}
            </select>
            <select id="swal-trans-operacion" class="swal2-input">
                <option value="VENTA">Venta</option>
                <option value="ARRIENDO">Arriendo</option>
            </select>
            <input id="swal-trans-valor" class="swal2-input" type="number" placeholder="Valor Total">
            <select id="swal-trans-estado" class="swal2-input">
                <option value="SEPARACION">Separación</option>
                <option value="PROMESA">Promesa</option>
                <option value="TRAMITE">Trámite Banco</option>
                <option value="ESCRITURACION">Escrituración</option>
                <option value="COMPLETADA">Completada</option>
            </select>
            <input id="swal-trans-fecha" class="swal2-input" type="datetime-local" value="${new Date().toISOString().slice(0,16)}">
        `,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            return {
                id_cliente: document.getElementById('swal-trans-cliente').value,
                id_inmueble: document.getElementById('swal-trans-inmueble').value,
                tipo_operacion: document.getElementById('swal-trans-operacion').value,
                valor_total: document.getElementById('swal-trans-valor').value,
                estado: document.getElementById('swal-trans-estado').value,
                fecha: document.getElementById('swal-trans-fecha').value
            }
        }
    });

    if (formValues) {
        try {
            const r = await fetch("https://ingaya-django-production.up.railway.app/api/transacciones/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formValues)
            });
            if(r.ok) {
                Swal.fire('¡Éxito!', 'Transacción registrada', 'success');
                cargarTransacciones();
            } else throw new Error();
        } catch(e) {
            Swal.fire('Error', 'No se pudo guardar', 'error');
        }
    }
}
function cerrarModalTransaccion() {}

async function abrirModalEditarTransaccion(id) {
    await asegurarDatosGlobales();
    const t = transaccionesGlobal.find(x => x.id_transaccion == id);
    if(!t) return;
    
    const { value: formValues } = await Swal.fire({
        title: `Editar Transacción #${id}`,
        html: `
            <select id="swal-trans-estado-e" class="swal2-input">
                <option value="SEPARACION" ${t.estado==='SEPARACION'?'selected':''}>Separación</option>
                <option value="PROMESA" ${t.estado==='PROMESA'?'selected':''}>Promesa</option>
                <option value="TRAMITE" ${t.estado==='TRAMITE'?'selected':''}>Trámite Banco</option>
                <option value="ESCRITURACION" ${t.estado==='ESCRITURACION'?'selected':''}>Escrituración</option>
                <option value="COMPLETADA" ${t.estado==='COMPLETADA'?'selected':''}>Completada</option>
                <option value="ANULADA" ${t.estado==='ANULADA'?'selected':''}>Anulada</option>
            </select>
        `,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            return {
                estado: document.getElementById('swal-trans-estado-e').value
            }
        }
    });

    if (formValues) {
        try {
            const data = {...t, estado: formValues.estado};
            const r = await fetch(`https://ingaya-django-production.up.railway.app/api/transacciones/${id}/`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if(r.ok) {
                Swal.fire('¡Éxito!', 'Transacción actualizada', 'success');
                cargarTransacciones();
            } else throw new Error();
        } catch(e) {
            Swal.fire('Error', 'No se pudo actualizar', 'error');
        }
    }
}

async function abrirModalPago() {
    await asegurarDatosGlobales();
    const { value: formValues } = await Swal.fire({
        title: 'Registrar Pago',
        html: `
            <select id="swal-pago-trans" class="swal2-input">
                <option value="">Seleccione Transacción...</option>
                ${transaccionesGlobal.map(t => `<option value="${t.id_transaccion}">Tx #${t.id_transaccion} - Cliente ${t.id_cliente}</option>`).join('')}
            </select>
            <input id="swal-pago-monto" class="swal2-input" type="number" placeholder="Monto ($)">
            <select id="swal-pago-metodo" class="swal2-input">
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
            </select>
            <select id="swal-pago-estado" class="swal2-input">
                <option value="COMPLETADO">Completado</option>
                <option value="PENDIENTE">Pendiente</option>
            </select>
            <input id="swal-pago-fecha" class="swal2-input" type="datetime-local" value="${new Date().toISOString().slice(0,16)}">
        `,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            return {
                id_transaccion: document.getElementById('swal-pago-trans').value,
                monto: document.getElementById('swal-pago-monto').value,
                metodo_pago: document.getElementById('swal-pago-metodo').value,
                estado_pago: document.getElementById('swal-pago-estado').value,
                fecha_pago: document.getElementById('swal-pago-fecha').value
            }
        }
    });

    if (formValues) {
        try {
            const r = await fetch("https://ingaya-django-production.up.railway.app/api/pagos/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formValues)
            });
            if(r.ok) {
                Swal.fire('¡Éxito!', 'Pago registrado', 'success');
                cargarPagos();
            } else throw new Error();
        } catch(e) {
            Swal.fire('Error', 'No se pudo guardar el pago', 'error');
        }
    }
}
function cerrarModalPago() {}

function abrirModalEditarPago(id) {
    Swal.fire('Editar', `Editar pago ${id}`, 'info');
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("filtro-trans-tipo")?.addEventListener("change", renderTransaccionesFiltered);
    document.getElementById("filtro-trans-estado")?.addEventListener("change", renderTransaccionesFiltered);
    document.getElementById("filtro-pago-metodo")?.addEventListener("change", renderPagosFiltered);
    document.getElementById("filtro-pago-estado")?.addEventListener("change", renderPagosFiltered);
    
    // Filtros de Citas
    document.getElementById("filtro-cita-fecha")?.addEventListener("input", renderCitasFiltered);
    document.getElementById("filtro-cita-estado")?.addEventListener("change", renderCitasFiltered);
    document.getElementById("filtro-cita-historial")?.addEventListener("change", renderCitasFiltered);
    
    // Cargar datos
    if (typeof cargarCitas === 'function') cargarCitas();
    if (typeof cargarTransacciones === 'function') cargarTransacciones();
    if (typeof cargarPagos === 'function') cargarPagos();
});

async function eliminarTransaccion(id) {
    const confirmacion = await Swal.fire({
        title: '¿Estás seguro?',
        text: "¡No podrás revertir esto! La transacción se eliminará permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#3b82f6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion.isConfirmed) {
        const token = sessionStorage.getItem("mi_token");
        try {
            const response = await fetch(`https://ingaya-django-production.up.railway.app/api/transacciones/${id}/`, {
                method: 'DELETE',
                headers: {
                    "Authorization": `Token ${token}`
                }
            });

            if (response.ok || response.status === 204) {
                Swal.fire('Eliminada', 'La transacción ha sido eliminada.', 'success');
                cargarTransacciones();
            } else {
                Swal.fire('Error', 'No se pudo eliminar la transacción.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Ocurrió un error al intentar conectarse al servidor.', 'error');
        }
    }
}


// ==========================================
// CANCELAR CITA (AGENTE)
// ==========================================
async function cancelarCitaAgente(id) {
    const { value: motivo } = await Swal.fire({
        title: 'Cancelar Cita',
        input: 'textarea',
        inputLabel: 'Motivo de la cancelación',
        inputPlaceholder: 'Escribe el motivo aquí...',
        inputAttributes: {
            'aria-label': 'Motivo de la cancelación'
        },
        showCancelButton: true,
        confirmButtonText: 'Confirmar Cancelación',
        cancelButtonText: 'Atrás',
        inputValidator: (value) => {
            if (!value) {
                return '¡Debes escribir un motivo!'
            }
        }
    });

    if (motivo) {
        const token = sessionStorage.getItem('mi_token');
        try {
            const response = await fetch(`https://ingaya-django-production.up.railway.app/api/citas/${id}/cancelar_agente/`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Token ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ motivo: motivo })
            });

            if (response.ok) {
                Swal.fire('Cancelada', 'La cita fue cancelada y se notificó al cliente.', 'success');
                cargarCitas();
            } else {
                const err = await response.text();
                Swal.fire('Error', 'No se pudo cancelar la cita. ' + err, 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Hubo un error de red.', 'error');
        }
    }
}

// ==========================================
// CONFIRMAR CITA (AGENTE)
// ==========================================
async function confirmarCitaAgente(id) {
    const token = sessionStorage.getItem('mi_token');
    try {
        const response = await fetch(`https://ingaya-django-production.up.railway.app/api/citas/${id}/confirmar_agente/`, {
            method: 'POST',
            headers: {
                'Authorization': 'Token ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            Swal.fire('Confirmada', 'La cita fue confirmada.', 'success');
            cargarCitas();
        } else {
            const err = await response.text();
            Swal.fire('Error', 'No se pudo confirmar la cita. ' + err, 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Hubo un error de red.', 'error');
    }
}
