// ============================================================
// Acciones-Comun.js
// Compartido entre contactanos.html y login.html
// Toggle modo oscuro/claro · Reveal · Login con fetch a Django
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

      const btn = contactForm.querySelector("button[type='submit']");
      const textoOriginal = btn.textContent;
      btn.textContent = "Enviando…";
      btn.disabled = true;

      setTimeout(function () {
        btn.textContent = textoOriginal;
        btn.disabled = false;

        Swal.fire({
          icon:               "success",
          title:              "¡Mensaje enviado!",
          text:               "Te contactaremos en menos de 24 horas. ¡Gracias por escribirnos!",
          confirmButtonColor: "#3b82f6",
          confirmButtonText:  "Cerrar"
        });

        contactForm.reset();
      }, 1000);
    });
  }

  // ============================================================
  // FORMULARIO DE LOGIN — fetch real al backend Django
  // ============================================================
  const loginForm = document.getElementById("loginForm");

  // La función también es llamada por onsubmit="iniciarSesion(event)" del HTML
  window.iniciarSesion = async function (event) {
    if (event) event.preventDefault();
    if (!loginForm) return;

    const email    = loginForm.querySelector("#email").value.trim();
    const password = loginForm.querySelector("#password").value;

    if (!email || !password) {
      Swal.fire({
        icon:               "warning",
        title:              "Campos incompletos",
        text:               "Por favor completa todos los campos.",
        confirmButtonColor: "#3b82f6"
      });
      return;
    }

    const btn = loginForm.querySelector(".btn-primary");
    btn.textContent = "Ingresando…";
    btn.disabled    = true;

    try {
      const response = await fetch("https://ingaya-django-production.up.railway.app/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            "username": email, // Django Token Auth usa 'username' por defecto
            "password": password
        })
      });

      const data = await response.json();

      if (data.token) {
        // Guardamos el token secreto en el navegador
        sessionStorage.setItem("mi_token", data.token);
        // Guardamos si es administrador
        if (data.is_admin) {
            sessionStorage.setItem("is_admin", "true");
        } else {
            sessionStorage.removeItem("is_admin");
        }
        
        // Guardamos el rol para validaciones de frontend
        if (data.rol) {
            sessionStorage.setItem("rol", data.rol);
        } else {
            sessionStorage.removeItem("rol");
        }
        
        if (data.requiere_cambio) {
            sessionStorage.setItem("requiere_cambio", "true");
        } else {
            sessionStorage.removeItem("requiere_cambio");
        }

        Swal.fire({
          icon:               "success",
          title:              "¡Bienvenido!",
          text:               "Sesión iniciada correctamente.",
          confirmButtonColor: "#3b82f6",
          timer:              1500,
          showConfirmButton:  false,
        }).then(async function () {
          // Pre-cargar datos del perfil antes de redirigir para evitar la "U" temporal
          try {
            const perfilRes = await fetch("https://ingaya-django-production.up.railway.app/api/perfil/", {
                method: "GET",
                headers: {
                    "Authorization": "Token " + data.token,
                    "Content-Type": "application/json"
                }
            });
            if (perfilRes.ok) {
                const perfilData = await perfilRes.json();
                sessionStorage.setItem("mi_nombre", perfilData.nombre || "Usuario");
                if (perfilData.foto) {
                    sessionStorage.setItem("mi_avatar", "https://ingaya-django-production.up.railway.app" + perfilData.foto);
                }
            }
          } catch (e) {
            console.error("Error precargando perfil", e);
          }
          
          const redirectUrl = sessionStorage.getItem("redirect_after_login");
            if (redirectUrl) {
                sessionStorage.removeItem("redirect_after_login");
                window.location.href = redirectUrl;
            } else if (data.is_admin || (data.rol && data.rol !== 'Cliente')) {
                window.location.href = "../PANEL DE ADMINISTRACION/admin_dashboard.html";
            } else {
                window.location.href = "../PAGINA PRINCIPAL INMUEBLES ING AYA/Index.html";
            }
        });
      } else {
        Swal.fire({
          icon:               "error",
          title:              "Acceso denegado",
          text:               data.error || "Correo o contraseña incorrectos.",
          confirmButtonColor: "#3b82f6"
        });
      }

    } catch (err) {
      console.error("Login error:", err);
      Swal.fire({
        icon:               "error",
        title:              "Error de conexión",
        text:               "No se pudo conectar con el servidor. Intenta más tarde.",
        confirmButtonColor: "#3b82f6"
      });
    } finally {
      btn.textContent = "Iniciar sesión";
      btn.disabled    = false;
    }
  };

  if (loginForm) {
    loginForm.addEventListener("submit", window.iniciarSesion);
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
  // FOOTER NEWSLETTER
  // ============================================================
  document.querySelectorAll("footer form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const input = form.querySelector("input[type='email']");
      if (!input || !input.value.trim()) return;

      Swal.fire({
        icon:               "success",
        title:              "¡Suscrito!",
        text:               "Recibirás nuestras novedades en " + input.value.trim(),
        confirmButtonColor: "#3b82f6",
        timer:              3000,
        timerProgressBar:   true,
        showConfirmButton:  false
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
