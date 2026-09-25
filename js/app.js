/**
 * Software Center — Experiencia Apple HIG
 * Código pulido, sobrio y fluido.
 */

const state = {
  apps: [],
  query: "",
  category: "Todas",
  sort: "default",
  viewMode: "grid", // "grid" | "list"
  selectedAppForModal: null,
};

let elements = {};

const normalize = (value = "") =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function initElements() {
  elements = {
    search: document.querySelector("#search"),
    clearSearch: document.querySelector("#clear-search"),
    categoryFilters: document.querySelector("#category-filters"),
    sortSelect: document.querySelector("#sort-select"),
    appsContainer: document.querySelector("#apps-container"),
    emptyState: document.querySelector("#empty-state"),
    resultCount: document.querySelector("#result-count"),
    appCount: document.querySelector("#app-count"),
    categoryCount: document.querySelector("#category-count"),
    themeToggle: document.querySelector("#theme-toggle"),
    btnViewGrid: document.querySelector("#btn-view-grid"),
    btnViewList: document.querySelector("#btn-view-list"),
    btnResetFilters: document.querySelector("#btn-reset-filters"),
    btnScrollTop: document.querySelector("#btn-scroll-top"),
    currentYear: document.querySelector("#current-year"),
    toastShelf: document.querySelector("#toast-shelf"),

    // Modal de Detalle
    detailModal: document.querySelector("#detail-modal"),
    modalAppIcon: document.querySelector("#modal-app-icon"),
    modalAppName: document.querySelector("#modal-app-name"),
    modalAppCompany: document.querySelector("#modal-app-company"),
    modalAppDesc: document.querySelector("#modal-app-description"),
    modalAppWingetCmd: document.querySelector("#modal-app-winget-cmd"),
    modalAppOs: document.querySelector("#modal-app-os"),
    modalAppSize: document.querySelector("#modal-app-size"),
    modalAppCategory: document.querySelector("#modal-app-category"),
    modalAppDownloadLink: document.querySelector("#modal-app-download-link"),
    modalAppOfficialLink: document.querySelector("#modal-app-official-link"),
    modalDownloadText: document.querySelector("#modal-download-text"),
    btnCopyModalWinget: document.querySelector("#btn-copy-modal-winget"),

    // Modal Winget por Lote
    btnOpenWinget: document.querySelector("#btn-open-winget"),
    wingetModal: document.querySelector("#winget-modal"),
    wingetCheckboxesContainer: document.querySelector("#winget-checkboxes-container"),
    wingetCommandOutput: document.querySelector("#winget-command-output"),
    btnWingetSelectAll: document.querySelector("#btn-winget-select-all"),
    btnWingetSelectEssentials: document.querySelector("#btn-winget-select-essentials"),
    btnWingetClearAll: document.querySelector("#btn-winget-clear-all"),
    btnCopyBatchWinget: document.querySelector("#btn-copy-batch-winget"),
  };
}

/* ==========================================================================
   Carga del Catálogo (Híbrida: http fetch + fallback local APPS_DATA)
   ========================================================================== */
async function loadApps() {
  try {
    let data = null;

    if (window.location.protocol.startsWith("http")) {
      try {
        const response = await fetch("data/apps.json");
        if (response.ok) {
          data = await response.json();
        }
      } catch (err) {
        console.warn("No se pudo obtener apps.json vía fetch, usando datos locales:", err);
      }
    }

    if ((!data || !Array.isArray(data) || data.length === 0) && Array.isArray(window.APPS_DATA)) {
      data = window.APPS_DATA;
    }

    if (!data) {
      const response = await fetch("data/apps.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    }

    if (!Array.isArray(data)) throw new TypeError("Formato de aplicaciones inválido");

    state.apps = data;
    initializeCatalog();
  } catch (error) {
    console.error("Error al cargar el catálogo:", error);
    if (elements.appsContainer) {
      elements.appsContainer.innerHTML = `
        <div class="apple-empty-state" style="grid-column: 1 / -1;">
          <h3>No pudimos cargar los programas</h3>
          <p>Verifica que los archivos de datos existan en la carpeta correspondiente.</p>
        </div>`;
    }
    if (elements.resultCount) elements.resultCount.textContent = "Catálogo no disponible";
  }
}

/* ==========================================================================
   Inicialización de Componentes
   ========================================================================== */
function initializeCatalog() {
  const categories = [...new Set(state.apps.map(({ categoria }) => categoria))].sort();

  if (elements.appCount) elements.appCount.textContent = state.apps.length;
  if (elements.categoryCount) elements.categoryCount.textContent = categories.length;

  renderCategoryTabs(["Todas", ...categories]);
  renderApps();
  setupBatchWingetCheckboxes();
}

/* ==========================================================================
   Segmented Control de Categorías (Pestañas Apple con Indicador Deslizante)
   ========================================================================== */
function updateSegmentedThumb(targetButton) {
  if (!elements.categoryFilters) return;

  let thumb = elements.categoryFilters.querySelector("#segmented-thumb");
  if (!thumb) {
    thumb = document.createElement("div");
    thumb.id = "segmented-thumb";
    thumb.className = "segmented-thumb";
    thumb.setAttribute("aria-hidden", "true");
    elements.categoryFilters.prepend(thumb);
  }

  const btn = targetButton || elements.categoryFilters.querySelector(".apple-tab-item.active");
  if (!btn) {
    thumb.style.opacity = "0";
    return;
  }

  const left = btn.offsetLeft;
  const width = btn.offsetWidth;
  thumb.style.transform = `translateX(${left}px)`;
  thumb.style.width = `${width}px`;
  thumb.style.opacity = "1";
}

function renderCategoryTabs(categories) {
  if (!elements.categoryFilters) return;

  const fragment = document.createDocumentFragment();

  // Elemento físico indicador deslizante (macOS sliding thumb)
  const thumb = document.createElement("div");
  thumb.id = "segmented-thumb";
  thumb.className = "segmented-thumb";
  thumb.setAttribute("aria-hidden", "true");
  fragment.appendChild(thumb);

  let activeBtn = null;

  categories.forEach((cat) => {
    const count =
      cat === "Todas"
        ? state.apps.length
        : state.apps.filter((a) => a.categoria === cat).length;

    const button = document.createElement("button");
    button.type = "button";
    const isActive = cat === state.category;
    button.className = `apple-tab-item${isActive ? " active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(isActive));
    button.innerHTML = `
      <span>${cat}</span>
      <span class="apple-tab-count">${count}</span>
    `;

    if (isActive) activeBtn = button;

    button.addEventListener("click", () => {
      state.category = cat;
      elements.categoryFilters.querySelectorAll(".apple-tab-item").forEach((btn) => {
        const isCurrent = btn === button;
        btn.classList.toggle("active", isCurrent);
        btn.setAttribute("aria-selected", String(isCurrent));
      });
      updateSegmentedThumb(button);
      renderApps();
    });

    fragment.appendChild(button);
  });

  elements.categoryFilters.replaceChildren(fragment);

  // Sincronizar posición del thumb deslizante con física fluida
  requestAnimationFrame(() => {
    updateSegmentedThumb(activeBtn);
  });
}

/* ==========================================================================
   Filtrado y Ordenación
   ========================================================================== */
function getFilteredApps() {
  const query = normalize(state.query.trim());

  let list = state.apps.filter((app) => {
    const matchesCategory =
      state.category === "Todas" || app.categoria === state.category;

    if (!matchesCategory) return false;
    if (!query) return true;

    const tags = Array.isArray(app.tags) ? app.tags.join(" ") : "";
    const searchable = normalize(
      [app.nombre, app.empresa, app.descripcion, app.categoria, tags].join(" ")
    );

    return searchable.includes(query);
  });

  list.sort((a, b) => {
    if (state.sort === "name-asc") {
      return a.nombre.localeCompare(b.nombre);
    }
    if (state.sort === "name-desc") {
      return b.nombre.localeCompare(a.nombre);
    }
    if (state.sort === "category") {
      return a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre);
    }
    // "default": recomendados primero
    if (a.destacado && !b.destacado) return -1;
    if (!a.destacado && b.destacado) return 1;
    return 0;
  });

  return list;
}

/* ==========================================================================
   Renderizado de Aplicaciones (Animación en Cascada Apple Fade-Up)
   ========================================================================== */
function renderApps() {
  if (!elements.appsContainer) return;

  const apps = getFilteredApps();
  const fragment = document.createDocumentFragment();

  if (state.viewMode === "grid") {
    elements.appsContainer.className = "apple-grid";
    apps.forEach((app, index) => fragment.appendChild(createCard(app, index)));
  } else {
    elements.appsContainer.className = "apple-list";
    apps.forEach((app, index) => fragment.appendChild(createListRow(app, index)));
  }

  elements.appsContainer.replaceChildren(fragment);

  const hasItems = apps.length > 0;
  if (elements.emptyState) elements.emptyState.hidden = hasItems;
  elements.appsContainer.hidden = !hasItems;

  if (elements.resultCount) {
    elements.resultCount.innerHTML = `Mostrando <strong>${apps.length}</strong> ${
      apps.length === 1 ? "aplicación" : "aplicaciones"
    }${state.category !== "Todas" ? ` en <em>${state.category}</em>` : ""}`;
  }
}

/* Tarjeta Estilo App Store */
function createCard(app, index = 0) {
  const card = document.createElement("article");
  card.className = "apple-app-card";
  card.setAttribute("tabindex", "0");
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Ver detalles de ${app.nombre}`);
  card.style.setProperty("--stagger-i", index);

  const downloadLabel = app.tipoDescarga === "pagina" ? "Ver" : "Obtener";
  const sizeOrVer = [app.tamano, app.version ? `v${app.version}` : ""].filter(Boolean).join(" · ") || "Variable";

  card.innerHTML = `
    <div class="card-top-row">
      <div class="apple-squircle-icon">
        <img src="${app.icono}" alt="Icono de ${app.nombre}" loading="lazy" width="38" height="38" />
      </div>
      <div class="card-info-col">
        <h3 class="card-title-line">${app.nombre}</h3>
        <span class="card-developer-line">${app.empresa}</span>
        <span class="card-category-line">${app.categoria}</span>
      </div>
    </div>

    <p class="card-body-description">${app.descripcion}</p>

    <div class="card-footer-actions">
      <span class="card-meta-detail">${sizeOrVer}</span>
      <div class="card-action-btns">
        <a href="${app.descarga}" target="_blank" rel="noopener noreferrer" class="apple-get-action" data-stop aria-label="Descargar ${app.nombre}">
          ${downloadLabel}
        </a>
        <a href="${app.paginaOficial}" target="_blank" rel="noopener noreferrer" class="apple-mini-icon-btn" title="Sitio oficial" data-stop aria-label="Página oficial">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
        ${
          app.wingetId
            ? `<button class="apple-mini-icon-btn" type="button" title="Copiar comando Winget" data-copy-cmd="${app.wingetId}" data-stop aria-label="Copiar comando Winget">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
              </button>`
            : ""
        }
      </div>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-stop]")) return;
    openDetailModal(app);
  });

  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      if (e.target.closest("[data-stop]")) return;
      e.preventDefault();
      openDetailModal(app);
    }
  });

  const downloadBtn = card.querySelector(".apple-get-action");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      showToast(`Iniciando descarga oficial de ${app.nombre}…`);
    });
  }

  const copyBtn = card.querySelector("[data-copy-cmd]");
  if (copyBtn) {
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const cmd = `winget install --id ${app.wingetId} -e`;
      navigator.clipboard.writeText(cmd).then(() => {
        showToast(`Comando copiado: ${cmd}`);
      });
    });
  }

  return card;
}

/* Fila en Lista */
function createListRow(app, index = 0) {
  const row = document.createElement("div");
  row.className = "apple-list-row";
  row.setAttribute("tabindex", "0");
  row.setAttribute("role", "button");
  row.setAttribute("aria-label", `Ver detalles de ${app.nombre}`);
  row.style.setProperty("--stagger-i", index);

  const downloadLabel = app.tipoDescarga === "pagina" ? "Ver" : "Obtener";

  row.innerHTML = `
    <div class="list-left">
      <div class="list-icon">
        <img src="${app.icono}" alt="" loading="lazy" width="24" height="24" />
      </div>
      <div class="list-title">
        <h3>${app.nombre}</h3>
        <p>${app.empresa}</p>
      </div>
    </div>

    <div class="list-cat">${app.categoria}</div>
    <div class="list-size">${app.tamano || "—"}</div>

    <div style="display:flex;align-items:center;gap:8px;">
      <a href="${app.descarga}" target="_blank" rel="noopener noreferrer" class="apple-get-action" data-stop aria-label="Descargar ${app.nombre}">
        ${downloadLabel}
      </a>
      <a href="${app.paginaOficial}" target="_blank" rel="noopener noreferrer" class="apple-mini-icon-btn" title="Sitio oficial" data-stop>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </a>
    </div>
  `;

  row.addEventListener("click", (e) => {
    if (e.target.closest("[data-stop]")) return;
    openDetailModal(app);
  });

  return row;
}

/* ==========================================================================
   Modal Tipo macOS Sheet
   ========================================================================== */
function openDetailModal(app) {
  if (!elements.detailModal) return;

  state.selectedAppForModal = app;

  elements.modalAppIcon.src = app.icono;
  elements.modalAppName.textContent = app.nombre;
  elements.modalAppCompany.textContent = `${app.empresa} · ${app.categoria}`;
  elements.modalAppDesc.textContent = app.descripcion;

  const wingetCmd = app.wingetId
    ? `winget install --id ${app.wingetId} -e`
    : `Descarga manual recomendada desde su web oficial`;
  elements.modalAppWingetCmd.textContent = wingetCmd;

  elements.modalAppCategory.textContent = app.categoria;
  elements.modalAppOs.textContent = app.sistemaOperativo || "Windows 10 / 11";
  elements.modalAppSize.textContent = app.tamano || "Variable";

  elements.modalAppDownloadLink.href = app.descarga;
  elements.modalDownloadText.textContent =
    app.tipoDescarga === "pagina" ? "Abrir página de descarga" : "Obtener instalador oficial";
  elements.modalAppOfficialLink.href = app.paginaOficial;

  elements.detailModal.classList.add("active");
}

function closeDetailModal() {
  if (!elements.detailModal) return;
  elements.detailModal.classList.remove("active");
}

/* ==========================================================================
   Instalador por Lotes (Winget)
   ========================================================================== */
function setupBatchWingetCheckboxes() {
  if (!elements.wingetCheckboxesContainer) return;

  const fragment = document.createDocumentFragment();

  state.apps.forEach((app) => {
    if (!app.wingetId) return;

    const label = document.createElement("label");
    label.className = "batch-checkbox-row";

    const isChecked = Boolean(app.destacado);

    label.innerHTML = `
      <input type="checkbox" value="${app.wingetId}" data-is-essential="${Boolean(app.destacado)}" ${
        isChecked ? "checked" : ""
      } />
      <span>${app.nombre}</span>
    `;

    label.querySelector("input").addEventListener("change", updateBatchWingetCommand);
    fragment.appendChild(label);
  });

  elements.wingetCheckboxesContainer.replaceChildren(fragment);
  updateBatchWingetCommand();
}

function updateBatchWingetCommand() {
  if (!elements.wingetCommandOutput) return;

  const checkedInputs = elements.wingetCheckboxesContainer.querySelectorAll(
    'input[type="checkbox"]:checked'
  );

  const ids = Array.from(checkedInputs).map((input) => input.value);

  if (ids.length === 0) {
    elements.wingetCommandOutput.value = "# Marca las casillas de arriba para generar tu comando";
    return;
  }

  const command = ids
    .map((id) => `winget install --id ${id} -e --accept-package-agreements --accept-source-agreements`)
    .join("; ");

  elements.wingetCommandOutput.value = command;
}

function openWingetModal() {
  if (!elements.wingetModal) return;
  elements.wingetModal.classList.add("active");
}

function closeWingetModal() {
  if (!elements.wingetModal) return;
  elements.wingetModal.classList.remove("active");
}

/* ==========================================================================
   Avisos Apple Toast
   ========================================================================== */
function showToast(message) {
  if (!elements.toastShelf) return;

  const toast = document.createElement("div");
  toast.className = "apple-toast-msg";
  toast.textContent = message;

  elements.toastShelf.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

/* ==========================================================================
   Tema Claro / Oscuro
   ========================================================================== */
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("software-center-theme", theme);
  } catch (e) {}

  if (elements.themeToggle) {
    elements.themeToggle.setAttribute(
      "aria-label",
      `Cambiar a tema ${theme === "dark" ? "claro" : "oscuro"}`
    );
  }
}

function initializeTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem("software-center-theme");
  } catch (e) {}

  // Estándar Apple: Light por defecto a menos que el usuario haya guardado oscuro
  setTheme(saved || "light");
}

/* ==========================================================================
   Eventos y Atajos (Estilo macOS)
   ========================================================================== */
function setupEventListeners() {
  // Buscador Spotlight
  if (elements.search) {
    elements.search.addEventListener("input", (e) => {
      state.query = e.target.value;
      if (elements.clearSearch) {
        elements.clearSearch.classList.toggle("visible", state.query.length > 0);
      }
      renderApps();
    });
  }

  if (elements.clearSearch) {
    elements.clearSearch.addEventListener("click", () => {
      state.query = "";
      elements.search.value = "";
      elements.clearSearch.classList.remove("visible");
      renderApps();
      elements.search.focus();
    });
  }

  // Orden
  if (elements.sortSelect) {
    elements.sortSelect.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderApps();
    });
  }

  // Restablecer filtros
  if (elements.btnResetFilters) {
    elements.btnResetFilters.addEventListener("click", () => {
      state.query = "";
      state.category = "Todas";
      state.sort = "default";
      if (elements.search) elements.search.value = "";
      if (elements.sortSelect) elements.sortSelect.value = "default";
      if (elements.clearSearch) elements.clearSearch.classList.remove("visible");
      initializeCatalog();
    });
  }

  // Selector de Vista (Cuadrícula / Lista)
  if (elements.btnViewGrid && elements.btnViewList) {
    elements.btnViewGrid.addEventListener("click", () => {
      state.viewMode = "grid";
      elements.btnViewGrid.classList.add("active");
      elements.btnViewGrid.setAttribute("aria-pressed", "true");
      elements.btnViewList.classList.remove("active");
      elements.btnViewList.setAttribute("aria-pressed", "false");
      renderApps();
    });

    elements.btnViewList.addEventListener("click", () => {
      state.viewMode = "list";
      elements.btnViewList.classList.add("active");
      elements.btnViewList.setAttribute("aria-pressed", "true");
      elements.btnViewGrid.classList.remove("active");
      elements.btnViewGrid.setAttribute("aria-pressed", "false");
      renderApps();
    });
  }

  // Alternador de tema
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  // Modal Winget
  if (elements.btnOpenWinget) {
    elements.btnOpenWinget.addEventListener("click", openWingetModal);
  }

  if (elements.btnWingetSelectAll) {
    elements.btnWingetSelectAll.addEventListener("click", () => {
      elements.wingetCheckboxesContainer
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = true));
      updateBatchWingetCommand();
    });
  }

  if (elements.btnWingetSelectEssentials) {
    elements.btnWingetSelectEssentials.addEventListener("click", () => {
      elements.wingetCheckboxesContainer
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = cb.dataset.isEssential === "true"));
      updateBatchWingetCommand();
    });
  }

  if (elements.btnWingetClearAll) {
    elements.btnWingetClearAll.addEventListener("click", () => {
      elements.wingetCheckboxesContainer
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = false));
      updateBatchWingetCommand();
    });
  }

  if (elements.btnCopyBatchWinget) {
    elements.btnCopyBatchWinget.addEventListener("click", () => {
      const text = elements.wingetCommandOutput.value;
      if (text.startsWith("#")) {
        showToast("Selecciona al menos una aplicación");
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        showToast("Comando copiado al portapapeles");
      });
    });
  }

  if (elements.btnCopyModalWinget) {
    elements.btnCopyModalWinget.addEventListener("click", () => {
      const text = elements.modalAppWingetCmd.textContent;
      navigator.clipboard.writeText(text).then(() => {
        showToast("Comando copiado");
      });
    });
  }

  // Cierre de modales
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeDetailModal();
      closeWingetModal();
    });
  });

  [elements.detailModal, elements.wingetModal].forEach((overlay) => {
    if (!overlay) return;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeDetailModal();
        closeWingetModal();
      }
    });
  });

  // Atajos de teclado (Escape y Cmd/Ctrl + K)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDetailModal();
      closeWingetModal();
      if (document.activeElement === elements.search) {
        elements.search.blur();
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (elements.search) {
        elements.search.focus();
        elements.search.select();
      }
    }
  });

  // Colección Destacada (Bento Grid): Apertura de modal y avisos de descarga
  document.querySelectorAll(".bento-card[data-app-id]").forEach((bentoCard) => {
    bentoCard.addEventListener("click", (e) => {
      if (e.target.closest("[data-stop]")) return;
      const appId = bentoCard.dataset.appId;
      const app = state.apps.find((a) => a.id === appId);
      if (app) openDetailModal(app);
    });

    bentoCard.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (e.target.closest("[data-stop]")) return;
        e.preventDefault();
        const appId = bentoCard.dataset.appId;
        const app = state.apps.find((a) => a.id === appId);
        if (app) openDetailModal(app);
      }
    });

    const getBtn = bentoCard.querySelector(".apple-get-btn");
    if (getBtn) {
      getBtn.addEventListener("click", () => {
        const appId = bentoCard.dataset.appId;
        const app = state.apps.find((a) => a.id === appId);
        const name = app ? app.nombre : "la aplicación";
        showToast(`Iniciando descarga oficial de ${name}…`);
      });
    }
  });

  // Re-alinear el fondo deslizante del control segmentado al redimensionar la ventana
  window.addEventListener("resize", () => {
    updateSegmentedThumb();
  });

  // Volver arriba
  if (elements.btnScrollTop) {
    elements.btnScrollTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

/* ==========================================================================
   Punto de Entrada
   ========================================================================== */
function init() {
  initElements();

  if (elements.currentYear) {
    elements.currentYear.textContent = new Date().getFullYear();
  }

  initializeTheme();
  setupEventListeners();
  loadApps();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
