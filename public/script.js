// Reemplaza estos valores con los endpoints de tu API para BigQuery.
window.MILA_PERU_CONFIG = window.MILA_PERU_CONFIG || {
  catalogEndpoint: "/api/catalog",
  quoteEndpoint: "",
  purchaseEndpoint: "/api/purchases"
};

const fallbackProducts = [
  {
    id: 1, name: "Velo", category: "urinarios", label: "Urinario suspendido", badge: "Nuevo",
    sku: "CMP-UR-VEL-01", imageIndex: 0,
    description: "Urinario suspendido de perfil ligero, creado para baños contemporáneos de alto tránsito y fácil mantenimiento.",
    colors: [{ name: "Blanco brillo", hex: "#f5f3ec" }, { name: "Marfil", hex: "#ddd4c6" }, { name: "Grafito mate", hex: "#444541" }],
    features: ["Cerámica vitrificada", "Descarga de bajo consumo", "Fijación oculta", "52 × 34 × 30 cm"],
    prices: { retail: 459, wholesale: 369, wholesaleMin: 6 }
  },
  {
    id: 2, name: "Linea", category: "urinarios", label: "Urinario compacto", badge: "Profesional",
    sku: "CMP-UR-LIN-02", imageIndex: 1,
    description: "Una pieza compacta de geometría suave, pensada para optimizar el espacio sin sacrificar presencia ni comodidad.",
    colors: [{ name: "Blanco brillo", hex: "#f5f3ec" }, { name: "Arena", hex: "#c8b8a2" }, { name: "Negro satinado", hex: "#292a28" }],
    features: ["Cerámica de alta densidad", "Sifón integrado", "Limpieza rápida", "49 × 32 × 29 cm"],
    prices: { retail: 389, wholesale: 315, wholesaleMin: 6 }
  },
  {
    id: 3, name: "Sfera", category: "lavaderos", label: "Lavadero sobreponer", badge: "Favorito",
    sku: "CMP-LV-SFE-03", imageIndex: 2,
    description: "Lavadero circular de sobreponer con borde fino y profundidad confortable. Un volumen limpio para espacios serenos.",
    colors: [{ name: "Blanco brillo", hex: "#f5f3ec" }, { name: "Blanco mate", hex: "#e9e6de" }, { name: "Terracota", hex: "#a86d53" }],
    features: ["Borde ultrafino", "Sin rebosadero", "Desagüe estándar", "Ø 40 × 14 cm"],
    prices: { retail: 329, wholesale: 259, wholesaleMin: 8 }
  },
  {
    id: 4, name: "Arco", category: "lavaderos", label: "Lavadero de encimera", badge: "Colección 26",
    sku: "CMP-LV-ARC-04", imageIndex: 3,
    description: "Lavadero ovalado de gran amplitud, con curvas continuas que aportan ligereza a encimeras residenciales y hoteleras.",
    colors: [{ name: "Blanco brillo", hex: "#f5f3ec" }, { name: "Marfil", hex: "#ddd4c6" }, { name: "Verde salvia", hex: "#899181" }],
    features: ["Formato ovalado", "Esmalte antibacteriano", "Instalación sobre encimera", "58 × 38 × 15 cm"],
    prices: { retail: 379, wholesale: 299, wholesaleMin: 8 }
  },
  {
    id: 5, name: "Garda", category: "accesorios", label: "Set de baño · 3 piezas", badge: "Esencial",
    sku: "CMP-AC-GAR-05", imageIndex: 4,
    description: "Set coordinado de dosificador, vaso y bandeja en cerámica esmaltada para completar el baño con una misma línea visual.",
    colors: [{ name: "Blanco brillo", hex: "#f5f3ec" }, { name: "Arena", hex: "#c8b8a2" }, { name: "Grafito", hex: "#4b4c48" }],
    features: ["3 piezas coordinadas", "Bomba de acero inoxidable", "Base antideslizante", "Fácil limpieza"],
    prices: { retail: 189, wholesale: 139, wholesaleMin: 12 }
  },
  {
    id: 6, name: "Como", category: "accesorios", label: "Dosificador cerámico", badge: "Nuevo",
    sku: "CMP-AC-COM-06", imageIndex: 5,
    description: "Dosificador de líneas sencillas con vaso complementario. Detalles funcionales con el acabado de la colección MIla Peru.",
    colors: [{ name: "Blanco brillo", hex: "#f5f3ec" }, { name: "Rosa arcilla", hex: "#bc8f7d" }, { name: "Negro satinado", hex: "#292a28" }],
    features: ["Capacidad de 350 ml", "Bomba metálica", "Cerámica vitrificada", "Dosificador + vaso"],
    prices: { retail: 89, wholesale: 62, wholesaleMin: 18 }
  }
];

let products = fallbackProducts;
let activeProduct = null;
let activePriceType = "retail";
let selectedColor = "";

const grid = document.querySelector("#product-grid");
const count = document.querySelector("#product-count");
const filters = [...document.querySelectorAll(".filter-button")];
const dialog = document.querySelector("#product-dialog");
const dialogPhoto = document.querySelector("#dialog-photo");
const galleryThumbs = [...document.querySelectorAll(".gallery-thumb")];
const priceOptions = [...document.querySelectorAll(".price-option")];

const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
}

function spritePosition(imageIndex = 0) {
  const safeIndex = Math.max(0, Math.min(5, Number(imageIndex) || 0));
  return { x: ["0%", "50%", "100%"][safeIndex % 3], y: safeIndex < 3 ? "0%" : "100%" };
}

function spriteStyle(product) {
  const position = spritePosition(product.imageIndex);
  return `--product-x:${position.x};--product-y:${position.y}`;
}

function categoryName(category) {
  return ({ urinarios: "Urinarios", lavaderos: "Lavaderos", accesorios: "Accesorios de baño" })[category] || category;
}

function normalizeRemoteProducts(remoteProducts) {
  return remoteProducts.map((remote, index) => {
    const local = fallbackProducts.find(item => String(item.id) === String(remote.id))
      || fallbackProducts.find(item => item.name.toLowerCase() === String(remote.name || "").toLowerCase())
      || fallbackProducts[index % fallbackProducts.length];
    return {
      ...local,
      ...remote,
      imageIndex: Number.isInteger(remote.imageIndex) ? remote.imageIndex : local.imageIndex,
      colors: Array.isArray(remote.colors) ? remote.colors : local.colors,
      features: Array.isArray(remote.features) ? remote.features : local.features,
      prices: { ...local.prices, ...(remote.prices || {}) }
    };
  });
}

function renderProducts(filter = "todos") {
  const visible = filter === "todos" ? products : products.filter(product => product.category === filter);
  grid.innerHTML = visible.map(product => `
    <article class="product-card">
      <button class="product-card-button" type="button" data-product-id="${escapeHtml(product.id)}" aria-label="Ver detalles y precios de ${escapeHtml(product.name)}">
        <div class="product-visual">
          <div class="product-photo product-sprite" style="${spriteStyle(product)}" role="img" aria-label="${escapeHtml(product.label)} ${escapeHtml(product.name)}"></div>
          <span class="product-badge">${escapeHtml(product.badge)}</span>
        </div>
        <div class="product-meta">
          <div><p>${escapeHtml(product.label)}</p><h3>${escapeHtml(product.name)}</h3></div>
          <span class="product-arrow" aria-hidden="true">↗</span>
        </div>
      </button>
    </article>
  `).join("");
  count.textContent = visible.length;
}

async function loadCatalog() {
  const endpoint = window.MILA_PERU_CONFIG.catalogEndpoint;
  if (!endpoint) return renderProducts();
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("No se pudo cargar el catálogo");
    const data = await response.json();
    const remoteProducts = Array.isArray(data) ? data : data.products;
    products = normalizeRemoteProducts(remoteProducts);
  } catch (error) {
    console.warn("Usando catálogo local:", error.message);
  }
  renderProducts();
}

function applyProductSprite(element, product) {
  const position = spritePosition(product.imageIndex);
  element.style.setProperty("--product-x", position.x);
  element.style.setProperty("--product-y", position.y);
}

function setGalleryView(view) {
  const selectedView = Number(view);
  dialogPhoto.classList.toggle("view-detail", selectedView === 1);
  dialogPhoto.classList.toggle("view-close", selectedView === 2);
  document.querySelector("#gallery-counter").textContent = `0${selectedView + 1} / 03`;
  galleryThumbs.forEach((thumb, index) => {
    const isActive = index === selectedView;
    thumb.classList.toggle("is-active", isActive);
    thumb.setAttribute("aria-pressed", String(isActive));
  });
}

function updatePrice() {
  if (!activeProduct) return;
  document.querySelector("#dialog-price").textContent = currency.format(activeProduct.prices[activePriceType]);
  document.querySelector("#price-label").textContent = activePriceType === "retail" ? "Precio por menor" : "Precio por mayor";
  priceOptions.forEach(option => {
    const isActive = option.dataset.price === activePriceType;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  });
}

function effectivePriceForQuantity(quantity) {
  if (!activeProduct) return 0;
  return quantity >= activeProduct.prices.wholesaleMin ? activeProduct.prices.wholesale : activeProduct.prices.retail;
}

function updatePurchaseSummary() {
  if (!activeProduct) return;
  const quantityInput = document.querySelector("#purchase-quantity");
  const quantity = Math.max(1, Number(quantityInput.value) || 1);
  const wholesale = quantity >= activeProduct.prices.wholesaleMin;
  activePriceType = wholesale ? "wholesale" : "retail";
  updatePrice();
  document.querySelector("#purchase-total").textContent = currency.format(effectivePriceForQuantity(quantity) * quantity);
}

function openProduct(productId) {
  activeProduct = products.find(product => String(product.id) === String(productId));
  if (!activeProduct) return;
  activePriceType = "retail";
  selectedColor = activeProduct.colors[0]?.name || "";
  document.querySelector("#purchase-quantity").value = 1;
  document.querySelector("#purchase-result").hidden = true;
  document.querySelector("#purchase-result").innerHTML = "";

  document.querySelector("#dialog-category").textContent = activeProduct.label;
  document.querySelector("#dialog-product-name").textContent = activeProduct.name;
  document.querySelector("#dialog-description").textContent = activeProduct.description;
  document.querySelector("#dialog-sku").textContent = `Código: ${activeProduct.sku}`;
  document.querySelector("#wholesale-min").textContent = `Desde ${activeProduct.prices.wholesaleMin} unidades`;
  document.querySelector("#selected-color").textContent = selectedColor;
  dialogPhoto.setAttribute("aria-label", `${activeProduct.label} ${activeProduct.name}, vista de producto`);
  applyProductSprite(dialogPhoto, activeProduct);
  document.querySelectorAll(".thumb-photo").forEach(photo => applyProductSprite(photo, activeProduct));

  document.querySelector("#color-options").innerHTML = activeProduct.colors.map((color, index) => `
    <button class="color-swatch ${index === 0 ? "is-active" : ""}" type="button"
      style="--swatch:${escapeHtml(color.hex)}" data-color="${escapeHtml(color.name)}"
      aria-label="${escapeHtml(color.name)}" aria-pressed="${index === 0}"></button>
  `).join("");
  document.querySelector("#feature-list").innerHTML = activeProduct.features.map(feature => `<li>${escapeHtml(feature)}</li>`).join("");

  setGalleryView(0);
  updatePrice();
  updatePurchaseSummary();
  dialog.showModal();
  document.body.classList.add("dialog-open");
}

function closeProduct() {
  dialog.close();
}

filters.forEach(button => button.addEventListener("click", () => {
  filters.forEach(item => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderProducts(button.dataset.filter);
}));

grid.addEventListener("click", event => {
  const button = event.target.closest("[data-product-id]");
  if (button) openProduct(button.dataset.productId);
});

document.querySelector("#dialog-close").addEventListener("click", closeProduct);
dialog.addEventListener("click", event => { if (event.target === dialog) closeProduct(); });
dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
galleryThumbs.forEach(thumb => thumb.addEventListener("click", () => setGalleryView(thumb.dataset.view)));

document.querySelector("#color-options").addEventListener("click", event => {
  const swatch = event.target.closest("[data-color]");
  if (!swatch) return;
  selectedColor = swatch.dataset.color;
  document.querySelector("#selected-color").textContent = selectedColor;
  document.querySelectorAll(".color-swatch").forEach(item => {
    const isActive = item === swatch;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
});

priceOptions.forEach(option => option.addEventListener("click", () => {
  if (!activeProduct) return;
  const quantity = Math.max(1, Number(document.querySelector("#purchase-quantity").value) || 1);
  if (option.dataset.price === "wholesale" && quantity < activeProduct.prices.wholesaleMin) {
    document.querySelector("#purchase-quantity").value = activeProduct.prices.wholesaleMin;
  }
  updatePurchaseSummary();
}));

document.querySelector("#purchase-quantity").addEventListener("input", updatePurchaseSummary);

document.querySelector("#dialog-buy").addEventListener("click", async () => {
  if (!activeProduct) return;
  const name = document.querySelector("#purchase-name").value.trim();
  const email = document.querySelector("#purchase-email").value.trim();
  const quantity = Math.max(1, Number(document.querySelector("#purchase-quantity").value) || 1);
  const result = document.querySelector("#purchase-result");
  const button = document.querySelector("#dialog-buy");

  if (!name || !email) {
    result.hidden = false;
    result.innerHTML = "<strong>Faltan datos.</strong><br>Ingresa el nombre y correo del cliente.";
    return;
  }

  button.disabled = true;
  button.textContent = quantity >= 10000 ? "Procesando compra masiva…" : "Procesando compra…";
  result.hidden = false;
  result.innerHTML = "Enviando la compra a BigQuery…";

  try {
    const response = await fetch(window.MILA_PERU_CONFIG.purchaseEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        customerEmail: email,
        productId: activeProduct.id,
        color: selectedColor,
        quantity,
        paymentMethod: "SIMULATED_WEB"
      })
    });
    const data = await response.json();
    if (!response.ok && response.status !== 207) throw new Error(data.message || "No se pudo registrar la compra");

    result.innerHTML = `
      <strong>${data.status === "SUCCESS" ? "Compra registrada correctamente" : "Compra registrada con observaciones"}</strong>
      <span>Orden: ${escapeHtml(data.orderId)}</span>
      <span>Registros exitosos: ${data.successfulRecords}</span>
      <span>Registros fallidos: ${data.failedRecords}</span>
      <span>Tiempo: ${(data.durationMs / 1000).toFixed(2)} s</span>
      <span>Rendimiento: ${data.throughputRps} reg/s</span>
      <span>Total: ${currency.format(data.total)}</span>`;
    showToast(`Compra ${data.orderId} registrada en BigQuery`);
  } catch (error) {
    result.innerHTML = `<strong>No se pudo completar la compra.</strong><br>${escapeHtml(error.message)}`;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Comprar ahora <span aria-hidden="true">→</span>';
  }
});

document.querySelector("#dialog-quote").addEventListener("click", () => {
  if (!activeProduct) return;
  const interest = document.querySelector("[name='interest']");
  const message = document.querySelector("[name='message']");
  interest.value = categoryName(activeProduct.category);
  message.value = `Me interesa ${activeProduct.name} en color ${selectedColor}, con precio ${activePriceType === "retail" ? "por menor" : "por mayor"}.`;
  closeProduct();
  document.querySelector("#contacto").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => message.focus(), 450);
});

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");
function closeMenu() {
  nav.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
}
menuButton.addEventListener("click", () => {
  const open = !nav.classList.contains("is-open");
  nav.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
});
nav.addEventListener("click", event => { if (event.target.closest("a")) closeMenu(); });

const form = document.querySelector("#quote-form");
const formStatus = document.querySelector("#form-status");
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const payload = Object.fromEntries(new FormData(form));
  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.firstChild.textContent = "Enviando… ";
  try {
    if (window.MILA_PERU_CONFIG.quoteEndpoint) {
      const response = await fetch(window.MILA_PERU_CONFIG.quoteEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("No se pudo enviar la solicitud");
    } else {
      window.dispatchEvent(new CustomEvent("milaperu:quote-request", { detail: payload }));
      await new Promise(resolve => setTimeout(resolve, 650));
    }
    formStatus.textContent = "Gracias. Recibimos tu solicitud y te contactaremos muy pronto.";
    form.reset();
  } catch (error) {
    formStatus.textContent = "No pudimos enviar tu solicitud. Escríbenos a contacto@ceramicamilaperu.pe.";
  } finally {
    submitButton.disabled = false;
    submitButton.firstChild.textContent = "Solicitar asesoría ";
  }
});

let toastTimer;
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

document.querySelector("#year").textContent = new Date().getFullYear();
loadCatalog();
