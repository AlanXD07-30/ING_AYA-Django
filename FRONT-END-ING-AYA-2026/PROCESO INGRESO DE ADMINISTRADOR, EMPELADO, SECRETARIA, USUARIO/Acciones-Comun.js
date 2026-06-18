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
      const response = await fetch("http://127.0.0.1:8000/api/login/", {
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
        localStorage.setItem("mi_token", data.token);
        // Guardamos si es administrador
        if (data.is_admin) {
            localStorage.setItem("is_admin", "true");
        } else {
            localStorage.removeItem("is_admin");
        }
        
        // Guardamos el rol para validaciones de frontend
        if (data.rol) {
            localStorage.setItem("rol", data.rol);
        } else {
            localStorage.removeItem("rol");
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
            const perfilRes = await fetch("http://127.0.0.1:8000/api/perfil/", {
                method: "GET",
                headers: {
                    "Authorization": "Token " + data.token,
                    "Content-Type": "application/json"
                }
            });
            if (perfilRes.ok) {
                const perfilData = await perfilRes.json();
                localStorage.setItem("mi_nombre", perfilData.nombre || "Usuario");
                if (perfilData.foto) {
                    localStorage.setItem("mi_avatar", "http://127.0.0.1:8000" + perfilData.foto);
                }
            }
          } catch (e) {
            console.error("Error precargando perfil", e);
          }
          
          const redirectUrl = localStorage.getItem("redirect_after_login");
            if (redirectUrl) {
                localStorage.removeItem("redirect_after_login");
                window.location.href = redirectUrl;
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