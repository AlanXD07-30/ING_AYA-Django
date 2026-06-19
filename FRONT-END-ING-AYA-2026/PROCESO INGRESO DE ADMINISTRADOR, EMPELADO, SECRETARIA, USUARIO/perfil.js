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
            
            // Cargar datos adicionales del cliente si no es empleado o admin
            if (!data.es_admin_sin_perfil && !data.es_empleado) {
                cargarFavoritos(token);
                // cargarHistorialCompras(token); // To Do: implement this
                cargarTramitesPendientes(token, data);
            }
            
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

// ==========================================
// TRAMITES PENDIENTES
// ==========================================
window.leerPromesa = async function(id_transaccion) {
    const token = localStorage.getItem('mi_token');
    if (!token) return;

    Swal.fire({
        title: 'Generando Documento...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const resTx = await fetch(`http://127.0.0.1:8000/api/transacciones/${id_transaccion}/`, {
            headers: { 'Authorization': 'Token ' + token }
        });
        const tx = await resTx.json();
        
        let inmueble = null;
        if (tx.id_inmueble) {
            const resInm = await fetch(`http://127.0.0.1:8000/api/inmuebles/${tx.id_inmueble}/`);
            if (resInm.ok) inmueble = await resInm.json();
        }
        
        let precioFormat = inmueble ? `$${parseFloat(inmueble.precio).toLocaleString('es-CO')}` : "$0";
        let dir = inmueble ? inmueble.direccion : "N/A";
        let barrio = inmueble ? inmueble.barrio : "N/A";
        let tipo = inmueble ? inmueble.tipo_inmueble : "N/A";
        let ciudad = inmueble ? inmueble.ciudad : "N/A";
        let metros = inmueble ? inmueble.metros_cuadrados : "N/A";
        
        const docHtml = `
            <html>
            <head>
                <title>Promesa de Compraventa - Ing Aya</title>
                <style>
                    body { font-family: 'Times New Roman', Times, serif; padding: 40px; margin: 0 auto; max-width: 800px; color: #000; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
                    .header h2 { margin: 5px 0 0 0; font-size: 18px; color: #555; }
                    .content p { text-align: justify; margin-bottom: 15px; }
                    .signature-box { margin-top: 50px; display: flex; justify-content: space-between; }
                    .signature { width: 45%; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>INMOBILIARIA ING AYA S.A.S.</h1>
                    <h2>CONTRATO DE PROMESA DE COMPRAVENTA / ARRENDAMIENTO</h2>
                    <p>NIT: 901.234.567-8 | Bogotá D.C., Colombia</p>
                </div>
                <div class="content">
                    <p>Entre los suscritos a saber, por una parte <strong>INMOBILIARIA ING AYA S.A.S.</strong>, sociedad comercial legalmente constituida, quien en adelante se denominará <strong>EL PROMITENTE VENDEDOR/ARRENDADOR</strong>, y por la otra parte el <strong>CLIENTE</strong> registrado bajo la identificación vinculada a la transacción #${id_transaccion}, quien en adelante se denominará <strong>EL PROMITENTE COMPRADOR/ARRENDATARIO</strong>, hemos celebrado el presente contrato de promesa de compraventa / arrendamiento, el cual se regirá por las siguientes cláusulas:</p>
                    
                    <p><strong>PRIMERA - OBJETO:</strong> EL PROMITENTE VENDEDOR promete transferir a título de venta o arriendo al PROMITENTE COMPRADOR el derecho de dominio y posesión que tiene y ejerce sobre el inmueble ubicado en la ciudad de <strong>${ciudad}</strong>, identificado como un(a) <strong>${tipo}</strong>, ubicado en el barrio <strong>${barrio}</strong>, con dirección exacta: <strong>${dir}</strong>.</p>
                    
                    <p><strong>SEGUNDA - CARACTERÍSTICAS:</strong> El inmueble objeto del presente contrato cuenta con una extensión superficial aproximada de <strong>${metros} metros cuadrados</strong>, y se entregará con todos sus usos, costumbres y servidumbres, libre de todo gravamen, hipoteca, embargo o pleito pendiente.</p>
                    
                    <p><strong>TERCERA - PRECIO Y FORMA DE PAGO:</strong> El precio pactado para la presente transacción ha sido acordado en la suma de <strong>${precioFormat}</strong> moneda corriente colombiana. El pago será procesado según los términos acordados entre las partes, debiendo completarse dentro de los plazos estipulados.</p>
                    
                    <p><strong>CUARTA - ENTREGA:</strong> La entrega material del inmueble se realizará una vez firmadas las escrituras y/o contratos correspondientes y cancelada la totalidad del saldo pactado.</p>
                    
                    <p><strong>QUINTA - CLÁUSULA PENAL:</strong> Las partes acuerdan que en caso de incumplimiento de cualquiera de las cláusulas aquí descritas, la parte incumplida pagará a la parte cumplida una sanción pecuniaria equivalente al diez por ciento (10%) del valor total de la transacción.</p>

                    <p>Para constancia de lo anterior, se expide y acepta electrónicamente este documento a través de la plataforma de Ing Aya.</p>
                </div>
                <div class="signature-box">
                    <div class="signature">
                        <strong>INMOBILIARIA ING AYA S.A.S.</strong><br>
                        Firma Autorizada
                    </div>
                    <div class="signature">
                        <strong>EL CLIENTE</strong><br>
                        Aceptación Electrónica
                    </div>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        const pdfWindow = window.open('', '_blank');
        pdfWindow.document.write(docHtml);
        pdfWindow.document.close();

        Swal.fire({
            title: '¿Confirmar Promesa?',
            text: '¿Has leído el documento PDF que se abrió y aceptas los términos para proceder con el trámite?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, Acepto los términos',
            cancelButtonText: 'Rechazar',
            reverseButtons: true
        }).then(async (result) => {
            if (result.isConfirmed || result.dismiss === Swal.DismissReason.cancel) {
                const acepta = result.isConfirmed;
                try {
                    const response = await fetch(`http://127.0.0.1:8000/api/transacciones/${id_transaccion}/firmar_promesa/`, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Token ' + token,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ acepta: acepta })
                    });

                    if (response.ok) {
                        Swal.fire(
                            acepta ? '¡Promesa Aceptada!' : 'Trámite Cancelado',
                            acepta ? 'El inmueble ahora está En Trámite.' : 'El inmueble vuelve a estar Disponible.',
                            acepta ? 'success' : 'info'
                        ).then(() => {
                            window.location.reload();
                        });
                    } else {
                        Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
                    }
                } catch (error) {
                    Swal.fire('Error', 'Problema de conexión.', 'error');
                }
            }
        });
    } catch (err) {
        Swal.fire('Error', 'No se pudo cargar la información de la promesa.', 'error');
        console.error(err);
    }
};

async function cargarTramitesPendientes(token, clienteData) {
    const container = document.getElementById("tramites-container");
    const fila = document.getElementById("fila-tramites-pendientes");
    if (!container || !fila) return; 

    if (!clienteData || !clienteData.id_cliente) {
        fila.style.display = "flex";
        container.innerHTML = `<p style="color: red;">Error: No se encontró el ID del cliente en los datos del perfil.</p>`;
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/api/transacciones/", {
            method: "GET",
            headers: {
                "Authorization": `Token ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            fila.style.display = "flex";
            container.innerHTML = `<p style="color: red;">Error de red: No se pudieron cargar las transacciones (${response.status}).</p>`;
            return;
        }

        if (response.ok) {
            const transaccionesAll = await response.json();
            const tramites = transaccionesAll.filter(t => 
                t.id_cliente == clienteData.id_cliente && 
                ((t.estado || "").toUpperCase() === "SEPARACION" || (t.estado || "").toUpperCase() === "PROMESA" || (t.estado || "").toUpperCase() === "RESERVADO")
            );

            if (tramites.length === 0) {
                fila.style.display = "flex";
                container.innerHTML = `<p style="color: gray;">No hay trámites en curso. (Debug: Cliente ID esperado: ${clienteData.id_cliente}, Transacciones totales revisadas: ${transaccionesAll.length})</p>`;
                return;
            }

            fila.style.display = "flex";
            container.innerHTML = "";
            for (let t of tramites) {
                let propertyInfo = "Inmueble ID: " + t.id_inmueble;
                let propertyImg = "https://ui-avatars.com/api/?name=Inmueble&background=1e3a8a&color=fff";
                let propertyTitle = "";
                let btnAction = "";

                try {
                    const resInm = await fetch(`http://127.0.0.1:8000/api/inmuebles/${t.id_inmueble}/`);
                    if(resInm.ok) {
                        const inm = await resInm.json();
                        propertyInfo = `$${parseFloat(inm.precio).toLocaleString('es-CO')}`;
                        propertyTitle = `${inm.tipo_inmueble} en ${inm.barrio}`;
                        if (inm.imagen_principal) {
                            propertyImg = inm.imagen_principal.startsWith("http") ? inm.imagen_principal : "http://127.0.0.1:8000" + inm.imagen_principal;
                        }
                    }
                } catch(e) {}

                let estadoTramite = (t.estado || "").toUpperCase();
                if (estadoTramite === "SEPARACION" || estadoTramite === "RESERVADO") {
                    btnAction = `<button class="btn-primary" style="width: 100%; margin-top: 10px; font-size: 14px; background: #3b82f6; border: none; color: white; padding: 8px; border-radius: 4px; cursor: pointer;" onclick="leerPromesa(${t.id_transaccion})">Leer Promesa</button>`;
                } else if (estadoTramite === "PROMESA") {
                    btnAction = `<button class="btn-secondary" style="width: 100%; margin-top: 10px; font-size: 14px; cursor: not-allowed; padding: 8px; border-radius: 4px;" disabled>En trámite avanzado...</button>`;
                }

                container.innerHTML += `
                    <div class="favorito-card" style="display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.05);">
                        <img src="${propertyImg}" alt="Inmueble" style="height: 150px; width: 100%; object-fit: cover;">
                        <div class="fav-info" style="flex: 1; display: flex; flex-direction: column; padding: 15px;">
                            <h3 style="margin-bottom: 5px; font-size: 16px; color: #fff;">${propertyTitle || "Trámite #" + t.id_transaccion}</h3>
                            <p style="color: var(--primary-color); font-weight: bold; margin-bottom: 5px;">${propertyInfo}</p>
                            <p style="font-size: 12px; color: #94a3b8; margin-bottom: auto;">Estado Trámite: <strong style="color: #3b82f6;">${t.estado}</strong></p>
                            ${btnAction}
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        fila.style.display = "flex";
        container.innerHTML = `<p style="color: red;">Ocurrió un error inesperado al cargar los trámites: ${e.message}</p>`;
    }
}
