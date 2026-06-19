// ============================================================
// inmuebles.js  —  Venta
// Toggle tema · Reveal · Carga desde backend · Filtros
// API pública: window.INMUEBLES.setItems() / .reload()
// ============================================================

(() => {
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
  // REVEAL CON IntersectionObserver
  // ============================================================
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(el => el.classList.add("visible"));
      return;
    }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    els.forEach(el => obs.observe(el));
  }

  // ============================================================
  // FOOTER NEWSLETTER
  // ============================================================
  function initFooterNewsletter() {
    const form = document.getElementById("footerForm");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const input = form.querySelector("input[type='email']");
      if (!input || !input.value.trim()) return;
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "success",
          title: "¡Suscrito!",
          text: "Recibirás novedades en " + input.value.trim(),
          confirmButtonColor: "#3b82f6",
          timer: 3000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
      input.value = "";
    });
  }

  // ============================================================
  // URL BASE DEL BACKEND
  // ============================================================
  const BASE_API = "http://127.0.0.1:8000/api/inmuebles/";

  // ============================================================
  // ESTADO GLOBAL
  // ============================================================
  let inmueblesGlobal = [];

  let gridEl, emptyEl, errorEl, errorMsgEl, selectCiudad, selectTipo;

  // ============================================================
  // UTILIDADES
  // ============================================================
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatoPrecio(valor) {
    if (valor == null || valor === "") return "Consultar";
    const num = Number(valor);
    if (Number.isNaN(num)) return String(valor);
    return num.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  }

  function obtenerPrimeraImagen(inm) {
    if (!inm) return "/img/no-image.png";
    if (inm.imagen_principal) return inm.imagen_principal;
    const imgs = inm.imagenes;
    if (Array.isArray(imgs) && imgs.length > 0) {
      const first = imgs[0];
      if (first && typeof first === "object") return first.url_imagen || first.url || "/img/no-image.png";
      if (typeof first === "string") return first;
    }
    return "/img/no-image.png";
  }

  // ============================================================
  // ESTADOS DE LA UI
  // ============================================================
  function showLoading() {
    if (emptyEl) emptyEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          Cargando propiedades…
        </div>`;
    }
  }

  function showEmpty() {
    if (gridEl)  gridEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = false;
    if (errorEl) errorEl.hidden = true;
  }

  function showError(msg) {
    if (gridEl)     gridEl.innerHTML = "";
    if (emptyEl)    emptyEl.hidden = true;
    if (errorEl)    errorEl.hidden = false;
    if (errorMsgEl) errorMsgEl.textContent = msg || "Error al cargar propiedades.";
  }

  // ============================================================
  // RENDERIZADO DE TARJETAS
  // ============================================================
  function renderizar(items) {
    if (!gridEl) return;

    if (!items || items.length === 0) { showEmpty(); return; }

    if (emptyEl) emptyEl.hidden = true;
    if (errorEl) errorEl.hidden = true;

    gridEl.innerHTML = "";
    const fragment = document.createDocumentFragment();

    items.forEach(inm => {
      const imgUrl    = obtenerPrimeraImagen(inm);
      const precio    = formatoPrecio(inm.precio);
      const metraje   = inm.metraje != null ? `${inm.metraje} m²` : "";
      const tipo      = inm.tipo_operacion || inm.tipoOperacion || inm.tipoInmuebleNombre || "Inmueble";
      const direccion = inm.direccion || "Dirección no disponible";
      const barrio    = inm.barrio   || "";
      const ciudad    = inm.ciudad   || "";
      const estado    = inm.estado   || "";
      const id        = inm.id_inmueble || inm.id || "";

      const article = document.createElement("article");
      article.className = "card-inmueble";
      article.innerHTML = `
        <div class="card-media" style="position: relative;">
          <img
            src="${escapeHtml(imgUrl)}"
            alt="Imagen de ${escapeHtml(tipo)} en ${escapeHtml(ciudad)}"
            loading="lazy"
            onerror="this.src='/img/no-image.png'">
          <span class="card-badge">${escapeHtml(tipo)}</span>
          ${id ? `<button style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; color: white; padding: 8px; font-size: 18px; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='rgba(244,63,94,0.8)'" onmouseout="this.style.background='rgba(0,0,0,0.5)'" onclick="guardarFavorito(${id})" title="Guardar en Favoritos">❤️</button>` : ""}
        </div>
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(direccion)}</h3>
          <p class="card-address">${escapeHtml(barrio)}${barrio && ciudad ? " · " : ""}${escapeHtml(ciudad)}</p>
          ${estado ? `<p class="card-location">Estado: ${escapeHtml(estado)}</p>` : ""}
          <div class="card-meta-row">
            <span class="card-price">${escapeHtml(precio)}</span>
            ${metraje ? `<span class="card-metraje">${escapeHtml(metraje)}</span>` : ""}
          </div>
        </div>
                ${id ? `<a class="btn-ver" href="../detalle.html?id=${encodeURIComponent(id)}">Ver propiedad →</a>` : ""}
      `;
      fragment.appendChild(article);
    });

    gridEl.appendChild(fragment);
  }

  // ============================================================
  // FILTROS
  // ============================================================
  function aplicarFiltros() {
    const ciudadSel = (selectCiudad?.value || "todos").toLowerCase();
    const tipoSel   = (selectTipo?.value   || "todos").toLowerCase();

    const filtrados = inmueblesGlobal.filter(inm => {
      const c = (inm.ciudad || "").toLowerCase();
      const t = ((inm.tipo_operacion || inm.tipoOperacion) || inm.tipoInmuebleNombre || "").toLowerCase();
      return (ciudadSel === "todos" || c === ciudadSel) &&
             (tipoSel   === "todos" || t === tipoSel);
    });

    renderizar(filtrados);
  }

  // ============================================================
  // CARGA DESDE BACKEND
  // ============================================================
  async function cargarInmuebles() {
    showLoading();
    try {
      const res = await fetch(BASE_API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const allInmuebles = Array.isArray(data) ? data : [];
      // Filtrar por Venta o Arriendo
      inmueblesGlobal = allInmuebles.filter(inm => {
          const t = inm.tipo_operacion || "";
          const estado = (inm.estado || "").toUpperCase();
          if (estado === "MANTENIMIENTO" || estado === "NO DISPONIBLE" || estado === "RESERVADO" || estado === "EN TRAMITE") return false;
          return t.toUpperCase() === "VENTA";
      });
      aplicarFiltros();
    } catch (err) {
      console.error("Error cargando inmuebles:", err);
      showError("No se pudieron cargar las propiedades. Intenta más tarde.");
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener("DOMContentLoaded", () => {
    gridEl       = document.getElementById("gridInmuebles");
    emptyEl      = document.getElementById("emptyState");
    errorEl      = document.getElementById("errorState");
    errorMsgEl   = document.getElementById("errorMessage");
    selectCiudad = document.getElementById("ciudad");
    selectTipo   = document.getElementById("tipo");

    if (selectCiudad) selectCiudad.addEventListener("change", aplicarFiltros);
    if (selectTipo)   selectTipo.addEventListener("change",   aplicarFiltros);

    initReveal();
    initFooterNewsletter();
    cargarInmuebles();
  });

  // ============================================================
  // API PÚBLICA (para pruebas o integración manual)
  // ============================================================
  window.INMUEBLES = {
    setItems(items) {
      inmueblesGlobal = Array.isArray(items) ? items : [];
      aplicarFiltros();
    },
    reload(tipo = "VENTA") {
      cargarInmuebles(tipo);
    },
  };

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


// ==========================================
// FUNCIÓN FAVORITOS
// ==========================================
window.guardarFavorito = async function(idInmueble) {
    const token = localStorage.getItem("mi_token");
    if (!token) {
        Swal.fire('Atención', 'Debes iniciar sesión para guardar favoritos.', 'warning');
        return;
    }
    try {
        const response = await fetch("http://127.0.0.1:8000/api/favoritos/", {
            method: "POST",
            headers: {
                "Authorization": "Token " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id_inmueble: idInmueble })
        });
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Guardado!',
                text: 'El inmueble se guardó en tus favoritos',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            const data = await response.json();
            Swal.fire('Error', data.error || 'No se pudo guardar el favorito', 'error');
        }
    } catch (err) {
        console.error(err);
    }
}
