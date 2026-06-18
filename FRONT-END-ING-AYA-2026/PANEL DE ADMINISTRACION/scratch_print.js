function abrirModalImpresion(tipo) {
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
