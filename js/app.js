const state = {
  apps: [],
  query: "",
  category: "Todas",
};

const elements = {
  grid: document.querySelector("#app-grid"),
  template: document.querySelector("#app-card-template"),
  search: document.querySelector("#search"),
  filters: document.querySelector("#category-filter"),
  resultCount: document.querySelector("#result-count"),
  appCount: document.querySelector("#app-count"),
  categoryCount: document.querySelector("#category-count"),
  emptyState: document.querySelector("#empty-state"),
  clearFilters: document.querySelector("#clear-filters"),
  themeToggle: document.querySelector("#theme-toggle"),
  year: document.querySelector("#current-year"),
  toast: document.querySelector("#toast"),
};

const normalize = (value = "") =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

async function loadApps() {
  try {
    const response = await fetch("data/apps.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new TypeError("apps.json debe contener un arreglo");
    state.apps = data;
    initializeCatalog();
  } catch (error) {
    console.error("No se pudo cargar el catálogo:", error);
    elements.grid.innerHTML = `
      <div class="empty-state" style="display:block;grid-column:1/-1">
        <h3>No pudimos cargar el catálogo</h3>
        <p>Ejecuta el proyecto desde un servidor web local para permitir la lectura de apps.json.</p>
      </div>`;
    elements.resultCount.textContent = "Catálogo no disponible";
  } finally {
    elements.grid.setAttribute("aria-busy", "false");
  }
}

function initializeCatalog() {
  const categories = [...new Set(state.apps.map(({ categoria }) => categoria))].sort();
  elements.appCount.textContent = state.apps.length;
  elements.categoryCount.textContent = categories.length;
  renderFilters(["Todas", ...categories]);
  renderApps();
}

function renderFilters(categories) {
  const fragment = document.createDocumentFragment();
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button${category === state.category ? " active" : ""}`;
    button.textContent = category;
    button.setAttribute("aria-pressed", String(category === state.category));
    button.addEventListener("click", () => {
      state.category = category;
      document.querySelectorAll(".filter-button").forEach((item) => {
        const active = item.textContent === category;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      renderApps();
    });
    fragment.append(button);
  });
  elements.filters.replaceChildren(fragment);
}

function getFilteredApps() {
  const query = normalize(state.query.trim());
  return state.apps.filter((app) => {
    const matchesCategory = state.category === "Todas" || app.categoria === state.category;
    const searchable = normalize([app.nombre, app.empresa, app.descripcion, app.categoria].join(" "));
    return matchesCategory && (!query || searchable.includes(query));
  });
}

function createCard(app, index) {
  const card = elements.template.content.firstElementChild.cloneNode(true);
  const icon = card.querySelector(".app-icon img");
  icon.src = app.icono;
  icon.alt = `Icono de ${app.nombre}`;
  card.querySelector(".category-badge").textContent = app.categoria;
  card.querySelector("h3").textContent = app.nombre;
  card.querySelector(".company").textContent = app.empresa;
  card.querySelector(".description").textContent = app.descripcion;
  card.querySelector(".os b").textContent = app.sistemaOperativo || "Windows";

  const size = card.querySelector(".size");
  if (app.tamano) size.textContent = app.tamano;
  else size.remove();

  const download = card.querySelector(".download-button");
  download.href = app.descarga;
  download.target = "_blank";
  download.rel = "noopener noreferrer";
  download.setAttribute("aria-label", `Descargar ${app.nombre} desde la fuente oficial`);
  if (app.tipoDescarga === "pagina") {
    download.querySelector("span").textContent = "Ver descarga";
  }
  download.addEventListener("click", showDownloadToast);

  const official = card.querySelector(".official-button");
  official.href = app.paginaOficial;
  official.setAttribute("aria-label", `Abrir la página oficial de ${app.nombre}`);
  card.style.animationDelay = `${Math.min(index * 45, 300)}ms`;
  return card;
}

function renderApps() {
  const apps = getFilteredApps();
  const fragment = document.createDocumentFragment();
  apps.forEach((app, index) => fragment.append(createCard(app, index)));
  elements.grid.replaceChildren(fragment);
  elements.emptyState.hidden = apps.length > 0;
  elements.grid.hidden = apps.length === 0;
  elements.resultCount.textContent = `${apps.length} ${apps.length === 1 ? "aplicación" : "aplicaciones"}`;
}

let toastTimer;
function showDownloadToast() {
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2400);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("software-center-theme", theme);
  const isDark = theme === "dark";
  elements.themeToggle.setAttribute("aria-label", `Cambiar a tema ${isDark ? "claro" : "oscuro"}`);
}

function initializeTheme() {
  const saved = localStorage.getItem("software-center-theme");
  const preferred = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(saved || preferred);
}

elements.search.addEventListener("input", ({ target }) => {
  state.query = target.value;
  renderApps();
});
elements.clearFilters.addEventListener("click", () => {
  state.query = "";
  state.category = "Todas";
  elements.search.value = "";
  initializeCatalog();
  elements.search.focus();
});
elements.themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.search.focus();
  }
});

elements.year.textContent = new Date().getFullYear();
initializeTheme();
loadApps();
