// ============================================================
// Acciones-Pag-Prin.js
// CORREGIDO: IIFE completo (antes faltaba el wrapper (function(){ ... })();)
// ============================================================

(function () {
  "use strict";

  // ============================================================
  // TOGGLE MODO OSCURO / CLARO
  // ============================================================
  const html        = document.documentElement;
  const toggleBtn   = document.getElementById("themeToggle");
  const themeIcon   = document.getElementById("themeIcon");
  const themeLabel  = document.getElementById("themeLabel");

  // Lee preferencia guardada; si no hay, usa modo oscuro por defecto
  const savedTheme = localStorage.getItem("ingaya-theme") || "dark";
  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      const current = html.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem("ingaya-theme", next);
    });
  }

  function applyTheme(theme) {
    html.setAttribute("data-theme", theme);
    if (themeIcon)  themeIcon.textContent  = theme === "dark" ? "☀️" : "🌙";
    if (themeLabel) themeLabel.textContent = theme === "dark" ? "" : "";
  }

  // ============================================================
  // ALERTAS (SweetAlert2)
  // ============================================================

  function alertaInmueble(event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();

    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success",
        cancelButton:  "btn btn-danger"
      },
      buttonsStyling: false
    });

    swalWithBootstrapButtons.fire({
      title:             "¿Quieres volver atrás?",
      icon:              "warning",
      showCancelButton:  true,
      confirmButtonText: "Sí",
      cancelButtonText:  "No",
      reverseButtons:    true
    }).then(function (result) {
      if (result.isConfirmed) {
        window.history.back();
      }
    });
  }

  function confirmarSobreNosotros(event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();

    Swal.fire({
      title:               "¿Quieres ver más sobre nosotros?",
      text:                "Puedes ver más sobre nosotros",
      icon:                "warning",
      showCancelButton:    true,
      confirmButtonColor:  "#3085d6",
      cancelButtonColor:   "#d33",
      confirmButtonText:   "Confirmar"
    }).then(function (result) {
      if (result.isConfirmed) {
        window.location.href = "../SOBRE%20NOSOTROS/sobrenosotros.html";
      }
    });
  }

  function confirmarInmuebles(event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();

    Swal.fire({
      title:               "¿Quieres ver nuestros inmuebles?",
      text:                "Puedes ver nuestros inmuebles",
      icon:                "warning",
      showCancelButton:    true,
      confirmButtonColor:  "#3b82f6",
      cancelButtonColor:   "#d33",
      confirmButtonText:   "Confirmar"
    }).then(function (result) {
      if (result.isConfirmed) {
        window.location.href = "../SECCIÓN%20DE%20INMUEBLES/inmuebles.html";
      }
    });
  }

  function confirmarNosotros(event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();

    Swal.fire({
      title:               "¿Quieres ver cómo contactarnos?",
      text:                "Puedes ver cómo contactarnos",
      icon:                "warning",
      showCancelButton:    true,
      confirmButtonColor:  "#3085d6",
      cancelButtonColor:   "#d33",
      confirmButtonText:   "Confirmar"
    }).then(function (result) {
      if (result.isConfirmed) {
        window.location.href = "../CONTACTANOS/contactanos.html";
      }
    });
  }

  // ============================================================
  // Exponer funciones al scope global para uso en atributos HTML
  // ============================================================
  window.alertaInmueble        = alertaInmueble;
  window.confirmarSobreNosotros = confirmarSobreNosotros;
  window.confirmarInmuebles    = confirmarInmuebles;
  window.confirmarNosotros     = confirmarNosotros;

  // ============================================================
  // MAGIA DE LA SESIÓN ACTIVA (Misión 1)
  // ============================================================
  // Removed DOMContentLoaded for faster execution
    {
    // 1. Buscamos la llave secreta
    const token = sessionStorage.getItem("mi_token");
    
    // Si la llave existe, el usuario está logueado
    if (token) {
      // Usamos selectores múltiples para que funcione en cualquier página sin importar la clase HTML
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
              sessionStorage.removeItem("mi_token"); // Borramos la llave
              sessionStorage.removeItem("mi_avatar");
              sessionStorage.removeItem("mi_nombre");
              sessionStorage.removeItem("is_admin");
              window.location.reload(); // Recargamos la página
            }
          });
        });
      }

      // Creamos el botón de "Mi Perfil" con foto dinámica
      if (navLinks) {
        let avatarUrl = sessionStorage.getItem("mi_avatar");
        if (!avatarUrl) {
            let nombre = sessionStorage.getItem("mi_nombre") || "U";
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
  }

})();
