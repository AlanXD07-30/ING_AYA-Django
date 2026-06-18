// ============================================================
// Acciones-Comun.js
// Compartido entre contactanos.html y login.html
// Toggle modo oscuro/claro · Reveal · Formularios con Swal
// ============================================================

(function () {
  "use strict";

  // ============================================================
  // TOGGLE MODO OSCURO / CLARO (mismo localStorage que Index)
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
  // ANIMACIONES DE ENTRADA — IntersectionObserver
  // ============================================================
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && revealEls.length) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  // ============================================================
  // FORMULARIO DE CONTACTO
  // ============================================================
  const contactForm = document.getElementById("contactForm");

  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();

      // Animación del botón mientras "envía"
      const btn = contactForm.querySelector("button[type='submit']");
      const textoOriginal = btn.textContent;
      btn.textContent = "Enviando…";
      btn.disabled = true;

      // Simula delay de red
      setTimeout(function () {
        btn.textContent = textoOriginal;
        btn.disabled = false;

        Swal.fire({
          icon:              "success",
          title:             "¡Mensaje enviado!",
          text:              "Te contactaremos en menos de 24 horas. ¡Gracias por escribirnos!",
          confirmButtonColor: "#3b82f6",
          confirmButtonText: "Cerrar"
        });

        contactForm.reset();
      }, 1000);
    });
  }

  // ============================================================
  // FORMULARIO DE LOGIN
  // ============================================================
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const email    = loginForm.querySelector("#email").value.trim();
      const password = loginForm.querySelector("#password").value;

      if (!email || !password) {
        Swal.fire({
          icon:              "warning",
          title:             "Campos incompletos",
          text:              "Por favor completa todos los campos.",
          confirmButtonColor: "#3b82f6"
        });
        return;
      }

      // Aquí conectas con tu backend; esto es un placeholder
      const btn = loginForm.querySelector(".btn-primary");
      btn.textContent = "Ingresando…";
      btn.disabled    = true;

      setTimeout(function () {
        btn.textContent = "Iniciar sesión";
        btn.disabled    = false;

        // Ejemplo: credenciales incorrectas → error
        Swal.fire({
          icon:              "error",
          title:             "Credenciales incorrectas",
          text:              "Verifica tu correo y contraseña e inténtalo de nuevo.",
          confirmButtonColor: "#3b82f6"
        });
      }, 900);
    });
  }

  // ============================================================
  // FORMULARIO DEL FOOTER (newsletter) — aplica en ambas páginas
  // ============================================================
  document.querySelectorAll("footer form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const input = form.querySelector("input[type='email']");
      if (!input || !input.value.trim()) return;

      Swal.fire({
        icon:              "success",
        title:             "¡Suscrito!",
        text:              "Recibirás nuestras novedades en " + input.value.trim(),
        confirmButtonColor: "#3b82f6",
        timer:             3000,
        timerProgressBar:  true,
        showConfirmButton: false
      });

      input.value = "";
    });
  });

})();


// ==========================================
// SESION GLOBAL NAVBAR
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    const isAuthPage = window.location.pathname.toLowerCase().includes("login") || 
                       window.location.pathname.toLowerCase().includes("registro") ||
                       window.location.pathname.toLowerCase().includes("perfil") ||
                       window.location.pathname.toLowerCase().includes("index");
    
    if (isAuthPage) return;

    const token = localStorage.getItem("mi_token");
    if (token) {
      const linkIngresar = document.querySelector(".nav-link-ingresar, .inicio-nav");
      const linkRegistrar = document.querySelector(".nav-link-registrar, .crearcue-nav");
      const navLinks = document.querySelector(".nav-links, .Menu_principal");

      if (linkRegistrar) linkRegistrar.parentElement.style.display = "none";

      if (linkIngresar) {
        const hrefLogin = linkIngresar.getAttribute("href");
        let hrefPerfil = "../PROCESO INGRESO DE ADMINISTRADOR, EMPELADO, SECRETARIA, USUARIO/perfil.html";
        if (hrefLogin && hrefLogin.includes("login.html")) {
            hrefPerfil = hrefLogin.replace("login.html", "perfil.html");
        }

        linkIngresar.innerHTML = "Cerrar sesión";
        linkIngresar.href = "#"; 
        linkIngresar.style.color = "#ff4c4c"; 
        
        linkIngresar.addEventListener("click", function(e) {
          e.preventDefault();
          if (window.Swal) {
              Swal.fire({
                title: '¿Cerrar sesión?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#d33'
              }).then((result) => {
                if (result.isConfirmed) {
                  localStorage.removeItem("mi_token"); 
                  localStorage.removeItem("mi_avatar");
                  localStorage.removeItem("mi_nombre");
                  window.location.reload(); 
                }
              });
          } else {
              if (confirm("¿Cerrar sesión?")) {
                  localStorage.removeItem("mi_token"); 
                  localStorage.removeItem("mi_avatar");
                  localStorage.removeItem("mi_nombre");
                  window.location.reload(); 
              }
          }
        });

        if (navLinks) {
          let avatarUrl = localStorage.getItem("mi_avatar");
          if (!avatarUrl) {
              let nombre = localStorage.getItem("mi_nombre") || "U";
              avatarUrl = `https://ui-avatars.com/api/?name=${nombre.replace(" ", "+")}&background=random`;
          }

          const liPerfil = document.createElement("li");
          liPerfil.innerHTML = `
            <a href="${hrefPerfil}" style="display: flex; align-items: center; gap: 8px; color: #3b82f6; font-weight: bold;">
              <img src="${avatarUrl}" alt="Perfil" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
              Mi Perfil
            </a>
          `;
          navLinks.insertBefore(liPerfil, linkIngresar.parentElement);
        }
      }
    }
});
