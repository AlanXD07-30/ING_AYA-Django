// ============================================================
// Acciones-SobreNosotros.js
// Toggle modo oscuro/claro + animaciones reveal + contadores
// ============================================================

(function () {
  "use strict";

  // ============================================================
  // TOGGLE MODO OSCURO / CLARO (mismo sistema que Index)
  // ============================================================
  const html       = document.documentElement;
  const toggleBtn  = document.getElementById("themeToggle");
  const themeIcon  = document.getElementById("themeIcon");

  // Leer preferencia guardada por Index.html; si no hay, modo oscuro
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

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target); // solo una vez
          }
        });
      },
      { threshold: 0.12 }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback para navegadores sin soporte
    revealEls.forEach(function (el) {
      el.classList.add("visible");
    });
  }

  // ============================================================
  // CONTADORES ANIMADOS en la sección de estadísticas
  // ============================================================
  const counters = document.querySelectorAll(".stat-item .number");

  function animateCounter(el) {
    const target  = parseInt(el.getAttribute("data-target"), 10);
    const duration = 1800; // ms
    const start   = performance.now();

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = Math.floor(eased * target);

      // Formato con puntos de miles
      el.textContent = current.toLocaleString("es-CO");

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString("es-CO");
      }
    }

    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window && counters.length) {
    const counterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach(function (el) {
      counterObserver.observe(el);
    });
  }

  // ============================================================
  // MICRO-INTERACCIÓN: hover en cards del equipo
  // (ya manejado en CSS; aquí solo se agrega foco accesible)
  // ============================================================
  document.querySelectorAll(".team-card").forEach(function (card) {
    card.setAttribute("tabindex", "0");
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
