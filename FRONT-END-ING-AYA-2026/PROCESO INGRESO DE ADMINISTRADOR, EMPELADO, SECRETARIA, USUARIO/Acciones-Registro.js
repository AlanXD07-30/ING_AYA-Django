// ============================================================
// Acciones-Registro.js
// Toggle tema · Validación en tiempo real · Indicador contraseña
// Fetch al backend Django con spinner y mensajes inline
// ============================================================

(function () {
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
    if (themeIcon) themeIcon.innerHTML = theme === "dark" ? '<i class="bi bi-brightness-high-fill"></i>' : '<i class="bi bi-moon-stars-fill"></i>';
  }

  // ============================================================
  // REFERENCIAS DEL FORMULARIO
  // ============================================================
  const form       = document.getElementById("form-registro");
  const btnReg     = document.getElementById("btn-registrar");
  const btnText    = document.getElementById("btn-text");
  const btnSpinner = document.getElementById("btn-spinner");
  const serverMsg  = document.getElementById("server-message");

  const camposObligatorios = [
    { id: "nombre",         errorId: "error-nombre", validate: v => v.trim().length >= 2 },
    { id: "identificacion", errorId: "error-id",     validate: v => /^\d{8,10}$/.test(v.trim()) },
    { id: "telefono",       errorId: "error-tel",    validate: v => /^\d{10}$/.test(v.trim()) },
    { id: "fecha_nacimiento", errorId: "error-nacimiento", validate: v => {
        if (!v) return false;
        const fecha = new Date(v);
        if (isNaN(fecha.getTime())) return false;
        const hoy = new Date();
        let edad = hoy.getFullYear() - fecha.getFullYear();
        const m = hoy.getMonth() - fecha.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) {
            edad--;
        }
        return edad >= 18;
    } },
    { id: "email",          errorId: "error-email",  validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
    { id: "contrasena",     errorId: "error-pass",   validate: v => v.length >= 8 && v.length <= 16 },
  ];

  // ============================================================
  // VALIDACIÓN EN TIEMPO REAL
  // ============================================================
  camposObligatorios.forEach(function (campo) {
    const el  = document.getElementById(campo.id);
    const err = document.getElementById(campo.errorId);
    if (!el || !err) return;

    function validateField() {
      const ok = campo.validate(el.value);
      el.classList.toggle("valid",   ok);
      el.classList.toggle("invalid", !ok && el.value.length > 0);
      err.classList.toggle("visible", !ok && el.value.length > 0);
    }

    el.addEventListener("blur",  validateField);
    el.addEventListener("input", validateField);
  });

  // ============================================================
  // INDICADOR DE FORTALEZA DE CONTRASEÑA
  // ============================================================
  const passInput     = document.getElementById("contrasena");
  const strengthBox   = document.getElementById("pass-strength");
  const strengthFill  = document.getElementById("strength-fill");
  const strengthLabel = document.getElementById("strength-label");

  const strengthLevels = [
    { label: "Muy débil",  color: "#ef4444", pct: "20%"  },
    { label: "Débil",      color: "#f97316", pct: "40%"  },
    { label: "Regular",    color: "#eab308", pct: "60%"  },
    { label: "Fuerte",     color: "#22c55e", pct: "80%"  },
    { label: "Muy fuerte", color: "#10b981", pct: "100%" },
  ];

  function getStrength(pw) {
    let score = 0;
    if (pw.length >= 8)           score++;
    if (/[A-Z]/.test(pw))        score++;
    if (/[0-9]/.test(pw))        score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length >= 12)          score++;
    return Math.min(score, 4);
  }

  if (passInput) {
    passInput.addEventListener("input", function () {
      const val = passInput.value;
      if (!val) { strengthBox.classList.remove("visible"); return; }
      strengthBox.classList.add("visible");
      const level = getStrength(val);
      const info  = strengthLevels[level];
      strengthFill.style.width           = info.pct;
      strengthFill.style.backgroundColor = info.color;
      strengthLabel.textContent          = "Fortaleza: " + info.label;
      strengthLabel.style.color          = info.color;
    });
  }

  // ============================================================
  // HELPERS DE UI
  // ============================================================
  function setLoading(loading) {
    btnReg.disabled = loading;
    btnSpinner.classList.toggle("visible", loading);
    btnText.textContent = loading ? "Registrando…" : "Crear cuenta";
  }

  function showServerMsg(text, type) {
    serverMsg.textContent = text;
    serverMsg.className   = "server-message " + type;
    serverMsg.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideServerMsg() {
    serverMsg.className   = "server-message";
    serverMsg.textContent = "";
  }

  // ============================================================
  // HELPER — leer cookie CSRF de Django
  // ============================================================
  function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
  }

  // ============================================================
  // VALIDACIÓN COMPLETA ANTES DE ENVIAR
  // ============================================================
  function validarFormulario() {
    let ok = true;
    camposObligatorios.forEach(function (campo) {
      const el  = document.getElementById(campo.id);
      const err = document.getElementById(campo.errorId);
      if (!el || !err) return;
      const valid = campo.validate(el.value);
      el.classList.toggle("valid",   valid);
      el.classList.toggle("invalid", !valid);
      err.classList.toggle("visible", !valid);
      if (!valid) ok = false;
    });
    return ok;
  }

  // ============================================================
  // SUBMIT — fetch al backend Django (/registro)
  // ============================================================
  if (form) {
    // Apuntar siempre al backend Django, ignorar el action del HTML
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      hideServerMsg();

      if (!validarFormulario()) {
        showServerMsg("Por favor corrige los campos marcados en rojo.", "error");
        return;
      }

      const emailValue = document.getElementById("email").value.trim();
      const passwordValue = document.getElementById("contrasena").value;

      const payload = {
          "username": emailValue, // Usamos el correo como username en Django
          "email": emailValue,
          "password": passwordValue,
          "nombre": document.getElementById("nombre").value.trim(),
          "identificacion": document.getElementById("identificacion").value.trim(),
          "telefono": document.getElementById("telefono").value.trim() || null,
          "direccion": document.getElementById("direccion").value.trim() || null,
          "fecha_nacimiento": document.getElementById("fecha_nacimiento").value || null
      };

      setLoading(true);

      try {
        const response = await fetch("https://ingaya-django-production.up.railway.app/api/registro/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          showServerMsg("¡Registro exitoso! Redirigiendo al login…", "success");
          form.reset();
          if (strengthBox) strengthBox.classList.remove("visible");

          // Redirigir al login HTML tras 2 s
          setTimeout(function () {
            window.location.href = "login.html";
          }, 2000);

        } else {
          showServerMsg("Error al registrar. Inténtalo de nuevo o el correo ya existe.", "error");
        }

      } catch (err) {
        console.error("Fetch error", err);
        showServerMsg(
          "No se pudo conectar con el servidor. ¿Está encendido Django?",
          "error"
        );
      } finally {
        setLoading(false);
      }
    });
  }

  // ============================================================
  // FOOTER NEWSLETTER
  // ============================================================
  document.querySelectorAll("footer form").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      const input = f.querySelector("input[type='email']");
      if (!input || !input.value.trim()) return;

      Swal.fire({
        icon:               "success",
        title:              "¡Suscrito!",
        text:               "Recibirás nuestras novedades en " + input.value.trim(),
        confirmButtonColor: "#3b82f6",
        timer:              3000,
        timerProgressBar:   true,
        showConfirmButton:  false,
      });

      input.value = "";
    });
  });

})();
// ============================================================
// Ocultar/Mostrar Contraseña
// ============================================================
window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    }
};
