
// ==========================================
// TEMA CLARO / OSCURO
// ==========================================
function inicializarTema() {
    const savedTheme = localStorage.getItem('adminTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.getElementById('themeToggle').innerText = savedTheme === 'dark' ? '☀️' : '🌙';

    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('adminTheme', newTheme);
        document.getElementById('themeToggle').innerText = newTheme === 'dark' ? '☀️' : '🌙';
        
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
});

// Guardamos los datos globales para poder editarlos
let inmueblesGlobal = [];

// ==========================================
// SEGURIDAD Y SESIÓN
// ==========================================
function verificarSesion() {
    const token = localStorage.getItem("mi_token");
    if (!token) {
        Swal.fire('Acceso Denegado', 'Debes iniciar sesión para entrar al panel.', 'error').then(() => {
            window.location.href = "../PROCESO INGRESO DE ADMINISTRADOR, EMPELADO, SECRETARIA, USUARIO/login.html";
        });
        return;
    }
    const nombre = localStorage.getItem("mi_nombre") || "Admin";
    document.getElementById("admin-name").innerText = "Hola, " + nombre;

    document.getElementById("btn-cerrar-sesion").addEventListener("click", function (e) {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "../PROCESO INGRESO DE ADMINISTRADOR, EMPELADO, SECRETARIA, USUARIO/login.html";
    });
}

// ==========================================
// CARGAR INMUEBLES EN LA TABLA
// ==========================================
async function cargarInmuebles(silent = false) {
    const tabla = document.getElementById("tabla-inmuebles");
    if(silent) { try { const r = await fetch("http://127.0.0.1:8000/api/inmuebles/"); if(r.ok) inmueblesGlobal = await r.json(); }catch(e){} return; }
    
    try {
        const response = await fetch("http://127.0.0.1:8000/api/inmuebles/");
        if (!response.ok) throw new Error("Error en el servidor");
        
        const data = await response.json();
        inmueblesGlobal = data; // Guardamos globalmente
        
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No hay inmuebles registrados en la base de datos.</td></tr>';
            return;
        }

        tabla.innerHTML = "";
        
        data.forEach(inm => {
            let precioStr = "Consultar";
            if (inm.precio != null) {
                precioStr = "$ " + parseInt(inm.precio).toLocaleString("es-CO");
            }

            const tipoOp = inm.tipo_operacion || "Desconocido";
            const badgeClass = tipoOp.toLowerCase() === "venta" ? "venta" : "arriendo";
            const idReal = inm.id_inmueble || inm.id;

            const tr = document.createElement("tr");
            
            const foto_html = inm.imagen_principal ? `<img src="${inm.imagen_principal}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">` : `<div style="width: 50px; height: 50px; border-radius: 8px; background: #e2e8f0; display:flex; align-items:center; justify-content:center; color: #94a3b8; font-size: 10px;">Sin foto</div>`;
            
            tr.innerHTML = `
                <td>${foto_html}</td>
                <td>#${idReal}</td>
                <td><strong>${inm.direccion || "Sin dirección"}</strong></td>
                <td><span class="badge ${badgeClass}">${tipoOp}</span></td>
                <td>${inm.ciudad || "No definida"}</td>
                <td>${precioStr}</td>
                <td>${inm.estado || "Activo"}</td>
                <td>
                    <button class="btn-action edit" onclick="abrirModalEditar(${idReal})" title="Editar">✏️</button>
                    <button class="btn-action delete" onclick="eliminarInmueble(${idReal})" title="Eliminar">🗑️</button>
                </td>
            `;
            tabla.appendChild(tr);
        });

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
        const token = localStorage.getItem("mi_token");
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/inmuebles/${id}/`, {
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
    document.getElementById("tipo_operacion").value = inm.tipo_operacion === "VENTA" ? "Venta" : "Arriendo";
    document.getElementById("precio").value = inm.precio ? parseInt(inm.precio) : "";
    document.getElementById("direccion").value = inm.direccion || "";
    document.getElementById("barrio").value = inm.barrio || "";
    document.getElementById("ciudad").value = inm.ciudad || "";
    document.getElementById("metraje").value = inm.metraje || "";
    document.getElementById("estado").value = inm.estado === "VENDIDO" ? "Vendido" : (inm.estado === "ARRENDADO" ? "Arrendado" : "Disponible");

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
    const precioVal = document.getElementById("precio").value;
    const direccion = document.getElementById("direccion").value;
    const barrio = document.getElementById("barrio").value;
    const ciudad = document.getElementById("ciudad").value;
    const metraje = document.getElementById("metraje").value;
    const estado = document.getElementById("estado").value;

    const token = localStorage.getItem("mi_token");

    const data = {
        tipo_operacion: tipo_operacion.toUpperCase(),
        direccion: direccion,
        barrio: barrio,
        ciudad: ciudad,
        precio: parseFloat(precioVal),
        metraje: metraje ? parseFloat(metraje) : null,
        estado: estado.toUpperCase(),
        fecha_registro: new Date().toISOString()
    };

    try {
        const url = isEdit ? `http://127.0.0.1:8000/api/inmuebles/${editId}/` : "http://127.0.0.1:8000/api/inmuebles/";
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
                    const imgRes = await fetch(`http://127.0.0.1:8000/api/inmuebles/${savedId}/upload_images/`, {
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
    fetch("http://127.0.0.1:8000/api/clientes/")
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

    const token = localStorage.getItem("mi_token");
    let totalClientes = 0;
    try {
        const response = await fetch("http://127.0.0.1:8000/api/clientes/", {
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
        const res = await fetch("http://127.0.0.1:8000/api/clientes/");
        if (!res.ok) throw new Error("Error");
        const data = await res.json();
        
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No hay clientes registrados.</td></tr>';
            return;
        }

        tabla.innerHTML = "";
        data.forEach(cli => {
            const id = cli.id_cliente || cli.id;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>#${id}</td>
                <td><strong>${cli.nombre}</strong></td>
                <td>${cli.identificacion}</td>
                <td>${cli.telefono || "N/A"}</td>
                <td>${cli.email || "<span style='color: var(--text-muted);'>Sin correo</span>"}</td>
                <td>
                    <button class="btn-action edit" onclick='abrirModalEditarCliente(${JSON.stringify(cli)})' title="Editar">✏️</button>
                    <button class="btn-action delete" onclick="eliminarRegistro('clientes', ${id}, cargarClientes)" title="Eliminar">🗑️</button>
                </td>
            `;
            tabla.appendChild(tr);
        });
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
    document.getElementById("modal-cliente-titulo").innerText = "Editar Cliente #" + (cli.id_cliente || cli.id);
    document.getElementById("modal-cliente").style.display = "flex";
}

document.getElementById("form-cliente")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const id = document.getElementById("cli-id").value;
    const data = {
        nombre: document.getElementById("cli-nombre").value,
        identificacion: document.getElementById("cli-identificacion").value,
        telefono: document.getElementById("cli-telefono").value
    };
    await guardarRegistro("clientes", id, data, cargarClientes, "modal-cliente");
});


// ==========================================
// MÓDULO EMPLEADOS
// ==========================================
async function cargarEmpleados() {
    const tabla = document.getElementById("tabla-empleados");
    try {
        const res = await fetch("http://127.0.0.1:8000/api/empleados/");
        if (!res.ok) throw new Error("Error");
        const data = await res.json();
        
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No hay empleados registrados.</td></tr>';
            return;
        }

        tabla.innerHTML = "";
        data.forEach(emp => {
            const id = emp.id_empleado || emp.id;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>#${id}</td>
                <td><strong>${emp.nombre}</strong></td>
                <td>${emp.identificacion}</td>
                <td>${emp.telefono || "N/A"}</td>
                <td><span class="badge venta">${emp.tipo_empleado}</span></td>
                <td>
                    <button class="btn-action edit" onclick='abrirModalEditarEmpleado(${JSON.stringify(emp)})' title="Editar">✏️</button>
                    <button class="btn-action delete" onclick="eliminarRegistro('empleados', ${id}, cargarEmpleados)" title="Eliminar">🗑️</button>
                </td>
            `;
            tabla.appendChild(tr);
        });
    } catch (e) {
        tabla.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar.</td></tr>';
    }
}

function abrirModalEmpleado() {
    document.getElementById("form-empleado").reset();
    document.getElementById("emp-id").value = "";
    document.getElementById("modal-empleado-titulo").innerText = "Agregar Empleado";
    llenarSelectRoles();
    document.getElementById("modal-empleado").style.display = "flex";
}

function abrirModalEditarEmpleado(emp) {
    document.getElementById("emp-id").value = emp.id_empleado || emp.id;
    document.getElementById("emp-nombre").value = emp.nombre;
    document.getElementById("emp-identificacion").value = emp.identificacion;
    document.getElementById("emp-telefono").value = emp.telefono || "";
    
    llenarSelectRoles(emp.tipo_empleado);
    
    document.getElementById("modal-empleado-titulo").innerText = "Editar Empleado #" + (emp.id_empleado || emp.id);
    document.getElementById("modal-empleado").style.display = "flex";
}

document.getElementById("form-empleado")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const id = document.getElementById("emp-id").value;
    const data = {
        nombre: document.getElementById("emp-nombre").value,
        identificacion: document.getElementById("emp-identificacion").value,
        telefono: document.getElementById("emp-telefono").value,
        tipo_empleado: document.getElementById("emp-rol").value
    };
    await guardarRegistro("empleados", id, data, cargarEmpleados, "modal-empleado");
});


// ==========================================
// MÓDULO ROLES
// ==========================================
async function cargarRoles() {
    const tabla = document.getElementById("tabla-roles");
    try {
        const res = await fetch("http://127.0.0.1:8000/api/roles/");
        if (!res.ok) throw new Error("Error");
        const data = await res.json();
        
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No hay roles registrados.</td></tr>';
            return;
        }

        tabla.innerHTML = "";
        data.forEach(rol => {
            const id = rol.id_rol || rol.id;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>#${id}</td>
                <td><strong>${rol.nombre_rol}</strong></td>
                <td>
                    <button class="btn-action edit" onclick='abrirModalEditarRol(${JSON.stringify(rol)})' title="Editar">✏️</button>
                    <button class="btn-action delete" onclick="eliminarRegistro('roles', ${id}, cargarRoles)" title="Eliminar">🗑️</button>
                </td>
            `;
            tabla.appendChild(tr);
        });
    } catch (e) {
        tabla.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Error al cargar.</td></tr>';
    }
}

function abrirModalRol() {
    document.getElementById("form-rol").reset();
    document.getElementById("rol-id").value = "";
    document.getElementById("modal-rol-titulo").innerText = "Agregar Rol";
    document.getElementById("modal-rol").style.display = "flex";
}

function abrirModalEditarRol(rol) {
    document.getElementById("rol-id").value = rol.id_rol || rol.id;
    document.getElementById("rol-nombre").value = rol.nombre_rol;
    document.getElementById("modal-rol-titulo").innerText = "Editar Rol #" + (rol.id_rol || rol.id);
    document.getElementById("modal-rol").style.display = "flex";
}

document.getElementById("form-rol")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const id = document.getElementById("rol-id").value;
    const data = { nombre_rol: document.getElementById("rol-nombre").value };
    await guardarRegistro("roles", id, data, cargarRoles, "modal-rol");
});

async function llenarSelectRoles(rolActivo = "") {
    const select = document.getElementById("emp-rol");
    select.innerHTML = '<option value="">Seleccione un rol...</option>';
    try {
        const res = await fetch("http://127.0.0.1:8000/api/roles/");
        if (res.ok) {
            const roles = await res.json();
            roles.forEach(rol => {
                const opt = document.createElement("option");
                opt.value = rol.nombre_rol;
                opt.innerText = rol.nombre_rol;
                if(rol.nombre_rol === rolActivo) opt.selected = true;
                select.appendChild(opt);
            });
        }
    } catch(e) {}
}


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
            const response = await fetch(`http://127.0.0.1:8000/api/${endpoint}/${id}/`, {
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
    const url = id ? `http://127.0.0.1:8000/api/${endpoint}/${id}/` : `http://127.0.0.1:8000/api/${endpoint}/`;
    const method = id ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error("Error al guardar");

        Swal.fire('¡Éxito!', `Registro ${id ? 'actualizado' : 'creado'} correctamente.`, 'success');
        cerrarModal(modalId);
        callbackCargar();
    } catch (error) {
        Swal.fire('Error', 'Hubo un problema al guardar el registro.', 'error');
    }
}
