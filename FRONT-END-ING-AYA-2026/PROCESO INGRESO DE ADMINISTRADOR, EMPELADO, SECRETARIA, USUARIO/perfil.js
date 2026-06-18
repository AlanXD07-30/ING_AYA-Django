document.addEventListener("DOMContentLoaded", async function() {
    const token = localStorage.getItem("mi_token");

    if (!token) {
        // Si no hay token, no debería estar aquí. Lo mandamos al login.
        window.location.href = "login.html";
        return;
    }

    // Mostrar botón de Admin si el usuario tiene la credencial
    if (localStorage.getItem("is_admin") === "true") {
        const btnAdmin = document.getElementById("btn-admin-panel");
        if (btnAdmin) btnAdmin.style.display = "block";
    }

    // Botón cerrar sesión manual
    const btnCerrar = document.getElementById("btn-cerrar-sesion");
    if (btnCerrar) {
        btnCerrar.addEventListener("click", function(e) {
            e.preventDefault();
            localStorage.removeItem("mi_token");
            localStorage.removeItem("mi_avatar");
            localStorage.removeItem("mi_nombre");
            localStorage.removeItem("is_admin");
            window.location.href = "../PAGINA PRINCIPAL INMUEBLES ING AYA/Index.html";
        });
    }

    // ==========================================
    // 1. CARGAR DATOS DEL PERFIL
    // ==========================================
    try {
        const response = await fetch("http://127.0.0.1:8000/api/perfil/", {
            method: "GET",
            headers: {
                "Authorization": "Token " + token,
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            if (data.es_admin_sin_perfil) {
                // Caso: Superadmin que no tiene perfil en tabla Cliente
                document.getElementById("perfil-nombre").textContent = data.nombre + " (Admin)";
                document.getElementById("perfil-email").textContent = data.email;
                document.querySelector(".perfil-sidebar").innerHTML = `
                    <h2>Aviso</h2>
                    <p>Eres un superadministrador sin perfil de cliente. Las funciones de perfil están limitadas.</p>
                    <a href="../PANEL DE ADMINISTRACION/admin_dashboard.html" class="btn-primary" style="display:block; text-align:center; margin-top:20px; text-decoration:none;">Ir al Panel de Administración</a>
                `;
            } else if (data.es_empleado) {
                // Caso: Empleado logueado
                document.getElementById("perfil-nombre").textContent = data.nombre + " (" + data.rol + ")";
                document.getElementById("perfil-email").textContent = data.email || "Empleado";
                document.querySelector(".perfil-sidebar").innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span style="background: var(--primary-color); color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold;">
                            Acceso Empleado
                        </span>
                    </div>
                    <h2>Mi Perfil de Trabajo</h2>
                    <p><strong>Identificación:</strong> ${data.identificacion}</p>
                    <p><strong>Teléfono:</strong> ${data.telefono || "No registrado"}</p>
                    <p style="color: var(--text-muted); font-size: 0.9em; margin-top: 15px;">Usa el botón de abajo para entrar a tu área de trabajo y gestionar el sistema.</p>
                    <a href="../PANEL DE ADMINISTRACION/admin_dashboard.html" class="btn-primary" style="display:block; text-align:center; margin-top:20px; text-decoration:none;">Ir a mi Panel de Control</a>
                `;
            } else {
                // Rellenamos el HTML con los datos de Django
                document.getElementById("perfil-nombre").textContent = data.nombre || "Usuario";
                document.getElementById("perfil-email").textContent = data.email || "Sin correo";
                document.getElementById("dato-id").textContent = data.identificacion || "No registrado";
                document.getElementById("dato-telefono").textContent = data.telefono || "No registrado";
                document.getElementById("dato-direccion").textContent = data.direccion || "No registrado";
                document.getElementById("dato-nacimiento").textContent = data.fecha_nacimiento || "No registrado";
            }
            
            // Actualizamos el avatar con su foto real o su inicial
            let urlAvatar = "";
            const btnQuitarFoto = document.getElementById("btn-quitar-foto");
            if (data.foto_perfil) {
                // Si guardamos la foto, usamos la que viene del backend
                if (data.foto_perfil.startsWith("http")) {
                    urlAvatar = data.foto_perfil;
                } else {
                    urlAvatar = "http://127.0.0.1:8000" + data.foto_perfil;
                }
                if (btnQuitarFoto) btnQuitarFoto.style.display = "block";
            } else {
                const nombreParaAvatar = data.nombre ? data.nombre.replace(" ", "+") : "U";
                urlAvatar = `https://ui-avatars.com/api/?name=${nombreParaAvatar}&background=random&size=128`;
                if (btnQuitarFoto) btnQuitarFoto.style.display = "none";
            }
            document.getElementById("perfil-avatar").src = urlAvatar;

            // Guardamos el avatar en localStorage para que toda la app lo vea
            localStorage.setItem("mi_avatar", urlAvatar);
            localStorage.setItem("mi_nombre", data.nombre || "Usuario");
            
        } else {
            console.error("Error al cargar el perfil");
            Swal.fire("Error", "No se pudo cargar tu información", "error");
        }
    } catch (err) {
        console.error("Error de red", err);
    }

    // ==========================================
    // 1.5 SUBIR FOTO DE PERFIL
    // ==========================================
    const inputFoto = document.getElementById("input-foto");
    if (inputFoto) {
        inputFoto.addEventListener("change", async function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("foto_perfil", file);

            try {
                const res = await fetch("http://127.0.0.1:8000/api/perfil/", {
                    method: "POST",
                    headers: {
                        "Authorization": "Token " + token
                    },
                    body: formData
                });

                if (res.ok) {
                    const json = await res.json();
                    let nuevaUrl = json.data.foto_perfil;
                    if (!nuevaUrl.startsWith("http")) nuevaUrl = "http://127.0.0.1:8000" + nuevaUrl;
                    
                    document.getElementById("perfil-avatar").src = nuevaUrl;
                    localStorage.setItem("mi_avatar", nuevaUrl);
                    Swal.fire("¡Éxito!", "Foto de perfil actualizada", "success").then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire("Error", "No se pudo subir la foto", "error");
                }
            } catch (error) {
                console.error(error);
                Swal.fire("Error", "Error de conexión", "error");
            }
        });
    }

    // ==========================================
    // 1.6 QUITAR FOTO DE PERFIL
    // ==========================================
    const btnQuitarFotoClick = document.getElementById("btn-quitar-foto");
    if (btnQuitarFotoClick) {
        btnQuitarFotoClick.addEventListener("click", async function() {
            try {
                const res = await fetch("http://127.0.0.1:8000/api/perfil/", {
                    method: "DELETE",
                    headers: {
                        "Authorization": "Token " + token,
                        "Content-Type": "application/json"
                    }
                });

                if (res.ok) {
                    localStorage.removeItem("mi_avatar");
                    Swal.fire("¡Éxito!", "Foto eliminada", "success").then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire("Error", "No se pudo eliminar la foto", "error");
                }
            } catch (error) {
                console.error(error);
            }
        });
    }

    // ==========================================
    // 2. CARGAR FAVORITOS
    // ==========================================
    cargarFavoritos(token);
});

// Función para descargar y dibujar las tarjetas de los inmuebles
async function cargarFavoritos(token) {
    const container = document.getElementById("favoritos-container");
    container.innerHTML = "<p id='msg-cargando'>Cargando tus favoritos...</p>";
    
    try {
        const response = await fetch("http://127.0.0.1:8000/api/favoritos/", {
            method: "GET",
            headers: {
                "Authorization": "Token " + token,
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            const data = await response.json();
            container.innerHTML = ""; // Limpiamos el mensaje

            if (data.length === 0) {
                container.innerHTML = "<p>Aún no tienes inmuebles favoritos. ¡Ve a la sección de inmuebles y busca la casa de tus sueños!</p>";
                return;
            }

            // Dibujamos cada inmueble
            data.forEach(fav => {
                const inmueble = fav.inmueble_detalle;
                if (!inmueble) return;

                // Imagen del inmueble o por defecto si no tiene
                const imagenTemp = inmueble.imagen_principal || "https://images.pexels.com/photos/101808/pexels-photo-101808.jpeg?auto=compress&cs=tinysrgb&w=400";
                
                // Formateamos el precio (que en Django está como JSON)
                let precioTxt = "Consultar precio";
                if (inmueble.precio) {
                    if (typeof inmueble.precio === 'string') {
                        // A veces viene como un string JSON, lo intentamos parsear
                        try {
                            const p = JSON.parse(inmueble.precio);
                            if (p.venta) precioTxt = "$ " + parseInt(p.venta).toLocaleString();
                            else if (p.arriendo) precioTxt = "$ " + parseInt(p.arriendo).toLocaleString() + " /mes";
                        } catch(e) {
                            precioTxt = "$ " + inmueble.precio;
                        }
                    } else if (typeof inmueble.precio === 'object') {
                        if (inmueble.precio.venta) precioTxt = "$ " + parseInt(inmueble.precio.venta).toLocaleString();
                        else if (inmueble.precio.arriendo) precioTxt = "$ " + parseInt(inmueble.precio.arriendo).toLocaleString() + " /mes";
                    }
                }

                const card = document.createElement("div");
                card.className = "inmueble-card";
                card.innerHTML = `
                    <img src="${imagenTemp}" alt="Inmueble">
                    <div class="inmueble-info">
                        <h3>${inmueble.direccion || "Dirección no disponible"}</h3>
                        <p>${inmueble.barrio || "Ciudad"} - ${inmueble.ciudad || ""}</p>
                        <div class="precio-txt">${precioTxt}</div>
                        <button class="btn-eliminar-fav" onclick="eliminarFavorito(${inmueble.id_inmueble}, '${token}')">Quitar de Favoritos 💔</button>
                    </div>
                `;
                container.appendChild(card);
            });

        } else {
            container.innerHTML = "<p>Error al cargar la lista de favoritos.</p>";
        }
    } catch (err) {
        container.innerHTML = "<p>Error de conexión con el servidor.</p>";
    }
}

// Función expuesta globalmente para el botón de eliminar
window.eliminarFavorito = async function(idInmueble, token) {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/favoritos/", {
            method: "DELETE",
            headers: {
                "Authorization": "Token " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id_inmueble: idInmueble })
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'El inmueble ya no está en tus favoritos',
                timer: 1500,
                showConfirmButton: false
            });
            // Recargamos la cuadrícula
            cargarFavoritos(token);
        } else {
            Swal.fire('Error', 'No se pudo eliminar de favoritos', 'error');
        }
    } catch (err) {
        console.error(err);
    }
}


// ==========================================
// LÓGICA DE EDICIÓN DE PERFIL
// ==========================================

function abrirModalEditar() {
    const modal = document.getElementById("modal-editar");
    
    // Rellenar los campos actuales
    document.getElementById("edit-nombre").value = document.getElementById("perfil-nombre").innerText;
    
    const tel = document.getElementById("dato-telefono").innerText;
    document.getElementById("edit-telefono").value = tel !== "-" ? tel : "";
    
    const dir = document.getElementById("dato-direccion").innerText;
    document.getElementById("edit-direccion").value = dir !== "-" ? dir : "";
    
    const nac = document.getElementById("dato-nacimiento").innerText;
    document.getElementById("edit-nacimiento").value = nac !== "-" ? nac : "";

    document.getElementById("edit-old-password").value = "";
    document.getElementById("edit-new-password").value = "";

    modal.style.display = "flex";
}

function cerrarModalEditar() {
    document.getElementById("modal-editar").style.display = "none";
}

document.getElementById("form-editar")?.addEventListener("submit", async function(e) {
    e.preventDefault();

    const nombre = document.getElementById("edit-nombre").value;
    const telefono = document.getElementById("edit-telefono").value;
    const direccion = document.getElementById("edit-direccion").value;
    const nacimiento = document.getElementById("edit-nacimiento").value;

    const oldPassword = document.getElementById("edit-old-password").value;
    const newPassword = document.getElementById("edit-new-password").value;

    const token = localStorage.getItem("mi_token");

    const data = { nombre, telefono, direccion, fecha_nacimiento: nacimiento };
    
    if (newPassword) {
        if (!oldPassword) {
            cerrarModalEditar();
            Swal.fire('Error', 'Para cambiar la contraseña, debes ingresar tu contraseña actual.', 'error');
            return;
        }
        data.old_password = oldPassword;
        data.new_password = newPassword;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/perfil/", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Token " + token
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        cerrarModalEditar();

        if (response.ok) {
            Swal.fire('¡Éxito!', 'Tus datos han sido actualizados.', 'success').then(() => {
                localStorage.setItem("mi_nombre", nombre); 
                window.location.reload(); 
            });
        } else {
            Swal.fire('Error', result.error || 'No se pudieron actualizar los datos.', 'error');
        }
    } catch (error) {
        cerrarModalEditar();
        console.error(error);
        Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
    }
});
