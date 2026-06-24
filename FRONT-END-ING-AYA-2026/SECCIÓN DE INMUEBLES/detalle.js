// ============================================================
// detalle.js  —  Carga dinámica de un inmueble
// ============================================================

(() => {
    "use strict";
  
    // ============================================================
    // TOGGLE MODO OSCURO / CLARO
    // ============================================================
    const html      = document.documentElement;
    const toggleBtn = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
  
    const savedTheme = localStorage.getItem("ingaya-theme") || "dark";
    applyTheme(savedTheme);
  
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem("ingaya-theme", next);
      });
    }
  
    function applyTheme(theme) {
      html.setAttribute("data-theme", theme);
      if (themeIcon) themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
    }

    // ============================================================
    // LÓGICA DE OBTENCIÓN DE DATOS
    // ============================================================
    const loadingState = document.getElementById("loading-state");
    const errorState = document.getElementById("error-state");
    const propertyContent = document.getElementById("property-content");
    const errorMsg = document.getElementById("error-message");

    function formatoPrecio(valor) {
        if (valor == null || valor === "") return "Consultar";
        const num = Number(valor);
        if (Number.isNaN(num)) return String(valor);
        return num.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
    }

    function escapeHtml(str) {
        if (str == null) return "";
        return String(str)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
    }

    async function cargarDetalle() {
        // Extraer el ID de la URL
        const params = new URLSearchParams(window.location.search);
        let id = params.get("id");

        if (!id) {
            id = localStorage.getItem("ingaya_selected_inmueble_id");
        }

        if (!id) {
            mostrarError("No se especificó ningún inmueble en la URL.");
            return;
        }

        try {
            // Llamada a la API
            const response = await fetch(`https://ingaya-django-production.up.railway.app/api/inmuebles/${id}/`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("El inmueble solicitado no existe o fue eliminado.");
                }
                throw new Error("Error al conectar con el servidor.");
            }

            const data = await response.json();
            
            const estadoStr = (data.estado || "").toUpperCase();
            if (estadoStr === "MANTENIMIENTO" || estadoStr === "NO DISPONIBLE") {
                throw new Error("El inmueble solicitado no está disponible por el momento.");
            }

            renderizarInmueble(data);

        } catch (error) {
            mostrarError(error.message);
        }
    }

    function mostrarError(mensaje) {
        loadingState.style.display = "none";
        propertyContent.style.display = "none";
        errorState.style.display = "block";
        errorMsg.textContent = mensaje;
    }

    function renderizarInmueble(inmueble) {
        // Ocultar carga y mostrar contenido
        loadingState.style.display = "none";
        propertyContent.style.display = "block";

        // Extraer datos principales
        const tipoOp = inmueble.tipo_operacion || "OPERACIÓN";
        const estado = inmueble.estado || "DISPONIBLE";
        const direccion = inmueble.direccion || "Dirección no disponible";
        const barrio = inmueble.barrio || "Barrio no especificado";
        const ciudad = inmueble.ciudad || "Ciudad no especificada";
        const precio = formatoPrecio(inmueble.precio);
        const metraje = inmueble.metraje ? `${inmueble.metraje} m²` : "No especificado";
        const id = inmueble.id_inmueble || inmueble.id || "--";
        
        // Extraer imágenes
        let imagenes = [];
        if (inmueble.imagen_principal) {
            imagenes.push(inmueble.imagen_principal);
        }
        if (Array.isArray(inmueble.imagenes)) {
            inmueble.imagenes.forEach(img => {
                const url = typeof img === "string" ? img : (img.url_imagen || img.url);
                if (url && !imagenes.includes(url)) {
                    imagenes.push(url);
                }
            });
        }
        // Si no hay imágenes, usar default
        if (imagenes.length === 0) {
            imagenes.push("../PAGINA WEB INMOBILIARIA/img/no-image.png"); // o ruta por defecto
        }

        // Llenar DOM
        if(document.getElementById("det-tipo-operacion")) document.getElementById("det-tipo-operacion").textContent = tipoOp.toUpperCase();
        if(document.getElementById("det-tipo-op-text")) document.getElementById("det-tipo-op-text").textContent = tipoOp.toLowerCase();
        if(document.getElementById("det-estado")) document.getElementById("det-estado").textContent = estado.toUpperCase();
        
        // Color badge estado
        const badgeEstado = document.getElementById("det-estado");
        if (estado.toUpperCase() === "VENDIDO" || estado.toUpperCase() === "ARRENDADO") {
            badgeEstado.style.backgroundColor = "#3b82f6"; // Azul
        } else if (estado.toUpperCase() === "RESERVADO") {
            badgeEstado.style.backgroundColor = "#f59e0b"; // Naranja
        } else {
            badgeEstado.style.backgroundColor = "#10b981"; // Verde (Disponible)
        }

        if(document.getElementById("det-direccion")) document.getElementById("det-direccion").textContent = direccion;
        if(document.getElementById("det-ubicacion")) document.getElementById("det-ubicacion").textContent = `${direccion}, ${barrio}, ${ciudad}`;
        if(document.getElementById("det-precio")) document.getElementById("det-precio").textContent = precio;
        if(document.getElementById("det-metraje")) document.getElementById("det-metraje").textContent = metraje;
        if(document.getElementById("det-ciudad")) document.getElementById("det-ciudad").textContent = ciudad;
        if(document.getElementById("det-barrio")) document.getElementById("det-barrio").textContent = barrio;
        if(document.getElementById("det-id")) document.getElementById("det-id").textContent = id;
        
        // Premium Fields
        if(document.getElementById("det-titulo-main")) document.getElementById("det-titulo-main").textContent = `${tipoOp.charAt(0).toUpperCase() + tipoOp.slice(1).toLowerCase()} en ${direccion}`;
        
        if(document.getElementById("det-habitaciones")) document.getElementById("det-habitaciones").textContent = inmueble.habitaciones || "0";
        if(document.getElementById("det-banos")) document.getElementById("det-banos").textContent = inmueble.banos || "0";
        if(document.getElementById("det-garajes")) document.getElementById("det-garajes").textContent = inmueble.garajes || "0";
        if(document.getElementById("det-estrato")) document.getElementById("det-estrato").textContent = inmueble.estrato || "0";
        
        if(document.getElementById("det-descripcion")) {
            document.getElementById("det-descripcion").textContent = inmueble.descripcion || "No hay descripción disponible para este inmueble.";
        }
        
        if(document.getElementById("det-caracteristicas")) {
            
        // Modificar botón de acción
        // Configurar mapa de Google Maps dinmico
        const mapContainer = document.querySelector(".map-placeholder");
        if (mapContainer) {
            const addressForMap = encodeURIComponent(`${direccion}, ${barrio}, ${ciudad}, Colombia`);
            mapContainer.innerHTML = `<iframe width="100%" height="300" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="https://maps.google.com/maps?q=${addressForMap}&t=&z=16&ie=UTF8&iwloc=&output=embed" style="border-radius: 8px;"></iframe>`;
        }

        const btnTramite = document.getElementById("btn-tramite-main");
        if (btnTramite) {
            if (tipoOp.toUpperCase() === "ARRIENDO") {
                btnTramite.innerHTML = "📝 Iniciar Trámite de Arriendo";
            } else {
                btnTramite.innerHTML = "🔑 Reservar / Separar";
            }
        }
            const ul = document.getElementById("det-caracteristicas");
            ul.innerHTML = "";
            if(inmueble.caracteristicas) {
                try {
                    const arr = JSON.parse(inmueble.caracteristicas);
                    if(arr.length > 0) {
                        arr.forEach(c => {
                            const li = document.createElement("li");
                            li.textContent = c;
                            ul.appendChild(li);
                        });
                    } else {
                        ul.innerHTML = "<li>No hay características registradas.</li>";
                    }
                } catch(e) {
                    ul.innerHTML = "<li>No hay características registradas.</li>";
                }
            } else {
                ul.innerHTML = "<li>No hay características registradas.</li>";
            }
        }

        // Renderizar Galería
        const gallery = document.getElementById("det-gallery");
        gallery.innerHTML = "";
        
        // Ajustar layout de la galería dependiendo de cuántas fotos hay
        const numImgs = Math.min(imagenes.length, 5);
        
        if (numImgs === 1) {
            gallery.style.gridTemplateColumns = "1fr";
            gallery.style.gridTemplateRows = "400px";
        } else if (numImgs === 2) {
            gallery.style.gridTemplateColumns = "1fr 1fr";
            gallery.style.gridTemplateRows = "400px";
        } else if (numImgs === 3) {
            gallery.style.gridTemplateColumns = "2fr 1fr";
            gallery.style.gridTemplateRows = "200px 200px";
        } else {
            gallery.style.gridTemplateColumns = "2fr 1fr 1fr";
            gallery.style.gridTemplateRows = "250px 250px";
        }

        for (let i = 0; i < numImgs; i++) {
            const imgSrc = imagenes[i];
            
            const imgEl = document.createElement("img");
            imgEl.src = escapeHtml(imgSrc);
            imgEl.alt = `Foto ${i+1} de la propiedad`;
            
            // Asignar clases dinámicas basadas en la cantidad de fotos
            if (numImgs === 1) {
                imgEl.className = "gallery-img";
                imgEl.style.gridColumn = "1 / -1";
                imgEl.style.gridRow = "1 / -1";
            } else if (numImgs === 2) {
                imgEl.className = "gallery-img";
            } else if (numImgs === 3) {
                imgEl.className = `gallery-img`;
                if(i === 0) { imgEl.style.gridColumn = "1 / 2"; imgEl.style.gridRow = "1 / 3"; }
                if(i === 1) { imgEl.style.gridColumn = "2 / 3"; imgEl.style.gridRow = "1 / 2"; }
                if(i === 2) { imgEl.style.gridColumn = "2 / 3"; imgEl.style.gridRow = "2 / 3"; }
            } else {
                imgEl.className = `gallery-img gallery-item-${i+1}`;
            }
            
            imgEl.onerror = function() { this.src = '/img/no-image.png'; };
            gallery.appendChild(imgEl);
        }
        
        // Actualizar el título de la página web
        document.title = `${direccion} - ${tipoOp} | ING AYA`;
    }

    // Inicializar
    document.addEventListener("DOMContentLoaded", cargarDetalle);

    // ============================================================
    // MAGIA DE LA SESIÓN ACTIVA (Misión 1)
    // ============================================================
    document.addEventListener("DOMContentLoaded", function() {
      // 1. Buscamos la llave secreta
      const token = localStorage.getItem("mi_token");
      
      // Si la llave existe, el usuario está logueado
      if (token) {
        // Usamos selectores múltiples para que funcione en cualquier página
        const linkIngresar = document.querySelector(".nav-link-ingresar, .inicio-nav");
        const linkRegistrar = document.querySelector(".nav-link-registrar, .crearcue-nav");
        const navLinks = document.querySelector(".nav-links, .Menu_principal");
  
        // Ocultamos el botón de crear cuenta
        if (linkRegistrar) {
          linkRegistrar.parentElement.style.display = "none";
        }
  
        // Cambiamos el botón de Iniciar Sesión por Cerrar Sesión
        if (linkIngresar) {
          linkIngresar.innerHTML = "Cerrar sesión";
          linkIngresar.href = "#"; 
          linkIngresar.style.color = "#ff4c4c"; // Rojito para destacar
          
          linkIngresar.addEventListener("click", function(e) {
            e.preventDefault();
            Swal.fire({
              title: '¿Cerrar sesión?',
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Sí, salir',
              cancelButtonText: 'Cancelar',
              confirmButtonColor: '#d33'
            }).then((result) => {
              if (result.isConfirmed) {
                localStorage.removeItem("mi_token"); // Borramos la llave
                localStorage.removeItem("mi_avatar");
                localStorage.removeItem("mi_nombre");
                localStorage.removeItem("is_admin");
                window.location.reload(); // Recargamos la página
              }
            });
          });
        }
  
        // Creamos el botón de "Mi Perfil" con foto dinámica
        if (navLinks) {
          let avatarUrl = localStorage.getItem("mi_avatar");
          if (!avatarUrl) {
              let nombre = localStorage.getItem("mi_nombre") || "U";
              avatarUrl = `https://ui-avatars.com/api/?name=${nombre.replace(" ", "+")}&background=random`;
          }
  
          const liPerfil = document.createElement("li");
          liPerfil.innerHTML = `
            <a href="../PROCESO INGRESO DE ADMINISTRADOR, EMPELADO, SECRETARIA, USUARIO/perfil.html" style="display: flex; align-items: center; gap: 8px; color: #3b82f6; font-weight: bold;">
              <img src="${avatarUrl}" alt="Perfil" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=' + (typeof nombre !== 'undefined' ? nombre.replace(/ /g, '+') : 'U') + '&background=random';">
              Mi Perfil
            </a>
          `;
          // Lo insertamos justo antes de cerrar sesión
          navLinks.insertBefore(liPerfil, linkIngresar.parentElement);
        }
      }
    });

})();

// ==========================================
// FUNCIONES DE AUTH EN DETALLES
// ==========================================
function irALogin() {
    // Guardar URL actual para regresar
    localStorage.setItem("redirect_after_login", window.location.href);
    window.location.href = "../PROCESO INGRESO DE ADMINISTRADOR, EMPELADO, SECRETARIA, USUARIO/login.html";
}

async function obtenerPerfilCliente() {
    const token = localStorage.getItem("mi_token");
    if (!token) return null;
    try {
        const res = await fetch("https://ingaya-django-production.up.railway.app/api/perfil/", {
            method: "GET",
            headers: { "Authorization": "Token " + token, "Content-Type": "application/json" }
        });
        if (res.ok) return await res.json();
    } catch(e) { console.error(e); }
    return null;
}

async function solicitarReserva() {
    const perfil = await obtenerPerfilCliente();
    if (!perfil || perfil.es_empleado || perfil.es_admin_sin_perfil || localStorage.getItem("is_admin") === "true") {
        Swal.fire('Acción Restringida', 'Solo los clientes registrados pueden iniciar trámites.', 'warning');
        return;
    }

    const isArriendo = window.inmuebleObj && window.inmuebleObj.tipo_operacion && window.inmuebleObj.tipo_operacion.toUpperCase() === "ARRIENDO";
    
    Swal.fire({
        title: isArriendo ? '¿Iniciar trámite de arriendo?' : '¿Confirmar Reserva?',
        text: isArriendo ? "Enviaremos una solicitud a nuestro equipo para iniciar tu proceso de arriendo. ¿Estás seguro?" : "Enviaremos una solicitud a nuestro equipo para iniciar el trámite de separación de este inmueble. ¿Estás seguro?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, iniciar trámite',
        cancelButtonText: 'Cancelar',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            try {
                // Remove commas and dots from price if formatted, or just use precioRaw if we have it globally
                // Fortunately we saved "inmueble" globally in cargarDetalle().
                const valor_total = window.inmuebleObj ? window.inmuebleObj.precio : 0;
                const tipo_op = window.inmuebleObj ? window.inmuebleObj.tipo_operacion : "VENTA";
                const id_inmueble = window.inmuebleObj ? window.inmuebleObj.id_inmueble : new URLSearchParams(window.location.search).get("id");
                
                // Determinamos el estado inicial según la operación
                const estadoInicial = (tipo_op.toUpperCase() === "ARRIENDO") ? "REVISION" : "SEPARACION";

                const data = {
                    fecha: new Date().toISOString(),
                    tipo_operacion: tipo_op,
                    valor_total: valor_total,
                    estado: estadoInicial,
                    id_cliente: perfil.id_cliente,
                    id_inmueble: id_inmueble
                };

                const response = await fetch("https://ingaya-django-production.up.railway.app/api/transacciones/", {
                    method: "POST",
                    headers: {
                        "Authorization": "Token " + localStorage.getItem("mi_token"),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                return await response.json();
            } catch (error) {
                Swal.showValidationMessage(`Fallo en la solicitud: ${error}`);
            }
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire(
                '¡Trámite Iniciado!',
                'Hemos registrado tu interés. Un agente se contactará contigo para continuar el proceso.',
                'success'
            );
        }
    });
}

async function agendarVisita() {
    const perfil = await obtenerPerfilCliente();
    if (!perfil || perfil.es_empleado || perfil.es_admin_sin_perfil || localStorage.getItem("is_admin") === "true") {
        Swal.fire('Acción Restringida', 'Solo los clientes registrados pueden agendar visitas.', 'warning');
        return;
    }

    try {
        const resFechas = await fetch("https://ingaya-django-production.up.railway.app/api/citas/fechas_ocupadas/");
        let fechasOcupadas = [];
        if (resFechas.ok) {
            fechasOcupadas = await resFechas.json();
        }

        let horaSeleccionada = null;
        let fechaSeleccionada = null;

        Swal.fire({
            title: 'Agendar una Visita',
            html: `
                <div id="flatpickr-container" style="display: flex; justify-content: center; margin-top: 15px;"></div>
                <div id="time-slots-wrapper" style="display: none;">
                    <h3 style="color: white; margin-top: 15px; font-size: 16px;">Selecciona una hora:</h3>
                    <div id="time-slots-container"></div>
                </div>
            `,
            confirmButtonText: 'Agendar',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                flatpickr("#flatpickr-container", {
                    inline: true,
                    enableTime: false, // Ahora la hora es por lista
                    locale: "es",
                    minDate: "today",
                    disable: [
                        function(date) {
                            const dateString = date.toISOString().split('T')[0];
                            return fechasOcupadas.includes(dateString);
                        }
                    ],
                    onDayCreate: function(dObj, dStr, fp, dayElem) {
                        const dateString = dayElem.dateObj.toISOString().split('T')[0];
                        if (fechasOcupadas.includes(dateString)) {
                            dayElem.classList.add("fully-booked");
                        }
                    },
                    onChange: async function(selectedDates, dateStr, instance) {
                        if (selectedDates.length > 0) {
                            fechaSeleccionada = selectedDates[0];
                            horaSeleccionada = null; // Reset
                            const dateString = fechaSeleccionada.toISOString().split('T')[0];
                            
                            // Mostrar cargando
                            const wrapper = document.getElementById('time-slots-wrapper');
                            const container = document.getElementById('time-slots-container');
                            wrapper.style.display = 'block';
                            container.innerHTML = '<p style="color: #9ca3af; grid-column: span 3;">Consultando disponibilidad...</p>';
                            
                            // Obtener horas ocupadas para este día
                            try {
                                const resHoras = await fetch(`https://ingaya-django-production.up.railway.app/api/citas/horas_ocupadas/?fecha=${dateString}`);
                                let horasOcupadas = [];
                                if (resHoras.ok) {
                                    horasOcupadas = await resHoras.json(); // ["08:00", "14:00"]
                                }
                                
                                const now = new Date();
                                const isToday = fechaSeleccionada.toDateString() === now.toDateString();
                                const currentHour = now.getHours();
                                
                                container.innerHTML = '';
                                
                                // Generar slots de 08:00 a 17:00
                                for (let h = 8; h <= 17; h++) {
                                    const horaString = `${h.toString().padStart(2, '0')}:00`;
                                    
                                    const btn = document.createElement('button');
                                    btn.type = 'button';
                                    btn.className = 'time-slot';
                                    
                                    // Formato amigable AM/PM
                                    const ampm = h >= 12 ? 'PM' : 'AM';
                                    const displayHour = h > 12 ? h - 12 : h;
                                    btn.innerText = `${displayHour}:00 ${ampm}`;
                                    
                                    // Validaciones
                                    if (isToday && h <= currentHour) {
                                        btn.classList.add('past');
                                        btn.disabled = true;
                                    } else if (horasOcupadas.includes(horaString)) {
                                        btn.classList.add('busy');
                                        btn.disabled = true;
                                    } else {
                                        btn.classList.add('free');
                                        btn.onclick = () => {
                                            // Desmarcar otros
                                            document.querySelectorAll('.time-slot.free').forEach(b => b.classList.remove('selected'));
                                            btn.classList.add('selected');
                                            horaSeleccionada = horaString;
                                        };
                                    }
                                    
                                    container.appendChild(btn);
                                }
                                
                            } catch (e) {
                                container.innerHTML = '<p style="color: #ef4444; grid-column: span 3;">Error al cargar las horas.</p>';
                            }
                        }
                    }
                });
            },
            preConfirm: async () => {
                if (!fechaSeleccionada) {
                    Swal.showValidationMessage('Por favor selecciona una fecha en el calendario');
                    return false;
                }
                if (!horaSeleccionada) {
                    Swal.showValidationMessage('Por favor selecciona una hora en la lista (verde)');
                    return false;
                }
                
                // Ensamblar la fecha y hora final
                const [hr, min] = horaSeleccionada.split(':');
                const finalDate = new Date(fechaSeleccionada);
                finalDate.setHours(parseInt(hr), parseInt(min), 0, 0);
                
                const id_inmueble = window.inmuebleObj ? window.inmuebleObj.id_inmueble : new URLSearchParams(window.location.search).get("id");
                
                try {
                    const data = {
                        fecha_hora: finalDate.toISOString(),
                    estado: "PROGRAMADA",
                    descripcion: "Visita solicitada para el inmueble ID: " + id_inmueble,
                    id_cliente: perfil.id_cliente
                };

                const response = await fetch("https://ingaya-django-production.up.railway.app/api/citas/", {
                    method: "POST",
                    headers: {
                        "Authorization": "Token " + localStorage.getItem("mi_token"),
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    throw new Error(await response.text());
                }
                return await response.json();
            } catch (error) {
                Swal.showValidationMessage(`Error: ${error}`);
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire('Visita Agendada', 'Tu cita ha sido programada con éxito. Revisa el panel para más detalles.', 'success');
        }
    });
    } catch (err) {
        console.error("Error al obtener fechas ocupadas:", err);
        Swal.fire("Error", "No se pudo cargar la disponibilidad.", "error");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const token = localStorage.getItem("mi_token");
    const anonBox = document.getElementById("anon-box");
    const userBox = document.getElementById("user-box");
    
    if (token && anonBox && userBox) {
        anonBox.style.display = "none";
        userBox.style.display = "block";
        
        let nombre = localStorage.getItem("mi_nombre") || "Cliente";
        // Si el nombre es muy largo, usamos solo el primer nombre
        nombre = nombre.split(" ")[0];
        const greeting = document.getElementById("user-greeting");
        if(greeting) greeting.innerText = "Hola, " + nombre;
    }
});
