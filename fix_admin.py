import re

with open(r'C:\Users\Pepe\Desktop\ING_AYA-Django\FRONT-END-ING-AYA-2026\PANEL DE ADMINISTRACION\admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace modal HTML
content = re.sub(
    r'<select id="swal-agente-id" class="swal2-input">\s*<option value="">Seleccione un agente...</option>\s*\$\{optionsHtml\}\s*</select>',
    '''<div style="text-align: left; margin-bottom: 10px;">
                      <label style="font-weight: bold; font-size: 14px; color: #475569;">Seleccione un Agente Inmobiliario:</label>
                  </div>
                  <select id="swal-agente-id" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; color: #1e293b; font-size: 15px; outline: none; cursor: pointer;">
                      <option value="">-- Elija un agente --</option>
                      ${optionsHtml}
                  </select>
                  <p style="font-size: 12px; color: #64748b; text-align: left; margin-top: 12px;">El agente recibirá un correo de notificación y el cliente también será informado de la asignación.</p>''',
    content
)

content = re.sub(
    r"confirmButtonText:\s*'Asignar'",
    "confirmButtonText: 'Confirmar Asignación',\n              confirmButtonColor: '#3b82f6'",
    content
)

# 1. Replace the inner button styles to add flex utility
content = content.replace(
    'class="btn-primary" onclick="abrirModalAsignarAgente(${c.id_cita})" style="margin-right: 5px;"',
    'class="btn-primary" onclick="abrirModalAsignarAgente(${c.id_cita})" style="padding: 6px 12px; font-size: 13px; width: 100%; margin-bottom: 5px;"'
)
content = content.replace(
    'class="btn-secondary" onclick="abrirModalEditarCita(${c.id_cita})"',
    'class="btn-secondary" onclick="abrirModalEditarCita(${c.id_cita})" style="padding: 6px 12px; font-size: 13px; flex: 1;"'
)
content = content.replace(
    'class="btn-danger" onclick="eliminarRegistro(\'citas\', ${c.id_cita}, cargarCitas)"',
    'class="btn-danger" onclick="eliminarRegistro(\'citas\', ${c.id_cita}, cargarCitas)" style="padding: 6px 12px; font-size: 13px;"'
)

# 2. Add flex wrapper around ALL actions
content = content.replace(
    '''          } else if (!esAgente && !verHistorial) {
              if (!c.id_empleado && cEstado === 'PROGRAMADA') {''',
    '''          } else if (!esAgente && !verHistorial) {
              accionesHtml += `<div style="display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-start; align-items: center; width: 100%;">`;
              if (!c.id_empleado && cEstado === 'PROGRAMADA') {'''
)
content = content.replace(
    '''              accionesHtml += `
                  <button class="btn-secondary" onclick="abrirModalEditarCita(${c.id_cita})" style="padding: 6px 12px; font-size: 13px; flex: 1;">?? Editar</button>
                  <button class="btn-danger" onclick="eliminarRegistro('citas', ${c.id_cita}, cargarCitas)" style="padding: 6px 12px; font-size: 13px;">???</button>
              `;''',
    '''              accionesHtml += `
                  <button class="btn-secondary" onclick="abrirModalEditarCita(${c.id_cita})" style="padding: 6px 12px; font-size: 13px; flex: 1;">✏️ Editar</button>
                  <button class="btn-danger" onclick="eliminarRegistro('citas', ${c.id_cita}, cargarCitas)" style="padding: 6px 12px; font-size: 13px;">🗑️</button>
              `;
              accionesHtml += `</div>`;'''
)

with open(r'C:\Users\Pepe\Desktop\ING_AYA-Django\FRONT-END-ING-AYA-2026\PANEL DE ADMINISTRACION\admin.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
