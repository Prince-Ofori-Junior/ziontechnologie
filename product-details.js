
/* ==========================================
   ZION TECHNOLOGIE — PRODUCT DETAILS PAGE
========================================== */

const BUSINESS_WHATSAPP = "233595856187";
const BUSINESS_PHONE = "+233595856187";

const CURRENCY = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2
});

const money = value =>
  CURRENCY.format(Number(value) || 0).replace("GHS", "GH₵");

const productId = new URLSearchParams(
  window.location.search
).get("id");

const detailsContainer = document.querySelector("#productDetails");
const relatedContainer = document.querySelector("#relatedProducts");
const toast = document.querySelector("#productToast");

let products = [];
let currentProduct = null;
let selectedQuantity = 1;
let toastTimer;

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("zion-cart") || "{}");
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem("zion-cart", JSON.stringify(cart));
}

function addToCart(product, quantity = 1) {
  const cart = getCart();

  if (cart[product.id]) {
    cart[product.id].qty += quantity;
  } else {
    cart[product.id] = {
      ...product,
      qty: quantity
    };
  }

  saveCart(cart);
  notify(`${product.name} added to your cart`);
}

function whatsappUrl(message) {
  return `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

/* PRODUCT DETAILS */

function renderProduct(product) {
  currentProduct = product;

  document.title = `${product.name} | Zion Technologie`;

  document.querySelector('meta[name="description"]')
    ?.setAttribute(
      "content",
      `${product.name} from Zion Technologie. ${product.description}`
    );

  document.querySelector("#breadcrumbProduct").textContent =
    product.name;

  detailsContainer.innerHTML = `
    <div class="product-detail-layout">

      <div class="product-detail-image">
        <span class="detail-category">
          ${escapeHTML(product.label || product.category)}
        </span>

        <img
          src="${escapeHTML(product.image)}"
          alt="${escapeHTML(product.alt || product.name)}"
          onerror="this.onerror=null;this.src='images/product-placeholder.png';">

        <div class="image-caption">
          <span>✳</span>
          ZION TECHNOLOGIE PRODUCT COLLECTION
        </div>
      </div>

      <div class="product-detail-content">

        <div class="eyebrow">
          <span></span>
          ${escapeHTML(product.category.toUpperCase())}
        </div>

        <h1>${escapeHTML(product.name)}</h1>

        <div class="detail-price">
          ${money(product.price)}
        </div>

        <p class="detail-description">
          ${escapeHTML(product.description)}
        </p>

        <div class="detail-status">
          <span class="status-dot"></span>
          Availability confirmed when you enquire
        </div>

        <div class="detail-divider"></div>

        <div class="detail-information">
          <div>
            <span>Product category</span>
            <strong>${escapeHTML(product.category)}</strong>
          </div>

          <div>
            <span>Product reference</span>
            <strong>${escapeHTML(product.id.toUpperCase())}</strong>
          </div>

          <div>
            <span>Listed price</span>
            <strong>${money(product.price)}</strong>
          </div>
        </div>

        <div class="quantity-selector">
          <span>Quantity</span>

          <div class="detail-quantity">
            <button type="button" id="decreaseQuantity" aria-label="Decrease quantity">−</button>
            <strong id="selectedQuantity">1</strong>
            <button type="button" id="increaseQuantity" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <div class="detail-total">
          <span>Estimated total</span>
          <strong id="detailTotal">${money(product.price)}</strong>
        </div>

        <div class="detail-actions">
          <button class="button primary detail-add-button" id="detailAddToCart">
            Add to cart ＋
          </button>

          <a
            class="button detail-call-button"
            href="tel:${BUSINESS_PHONE}">
            ☎ Call to order
          </a>
        </div>

        <a
          class="detail-whatsapp-link"
          id="productWhatsApp"
          href="#"
          target="_blank"
          rel="noopener">
          Ask about this product on WhatsApp ↗
        </a>

        <p class="detail-disclaimer">
          Prices are indicative. Please contact our team to confirm
          stock, specifications, warranty, delivery and installation charges.
          No payment is collected on this page.
        </p>

      </div>

    </div>
  `;

  document.querySelector("#decreaseQuantity")
    .addEventListener("click", () => {
      selectedQuantity = Math.max(1, selectedQuantity - 1);
      updateQuantity();
    });

  document.querySelector("#increaseQuantity")
    .addEventListener("click", () => {
      selectedQuantity++;
      updateQuantity();
    });

  document.querySelector("#detailAddToCart")
    .addEventListener("click", () => {
      addToCart(product, selectedQuantity);
    });

  document.querySelector("#productWhatsApp").href =
    whatsappUrl(
      `Hello Zion Technologie, I am interested in this product:\n\n` +
      `Product: ${product.name}\n` +
      `Reference: ${product.id}\n` +
      `Listed price: ${money(product.price)}\n` +
      `Quantity: ${selectedQuantity}\n\n` +
      `Please confirm availability and specifications.`
    );
}

function updateQuantity() {
  document.querySelector("#selectedQuantity").textContent =
    selectedQuantity;

  document.querySelector("#detailTotal").textContent =
    money(currentProduct.price * selectedQuantity);

  document.querySelector("#productWhatsApp").href =
    whatsappUrl(
      `Hello Zion Technologie, I am interested in:\n\n` +
      `Product: ${currentProduct.name}\n` +
      `Quantity: ${selectedQuantity}\n` +
      `Estimated total: ${money(currentProduct.price * selectedQuantity)}\n\n` +
      `Please confirm availability and final pricing.`
    );
}

/* RELATED PRODUCTS */

function renderRelatedProducts(product) {
  const related = products
    .filter(item =>
      item.category === product.category &&
      item.id !== product.id
    )
    .slice(0, 4);

  if (!related.length) {
    relatedContainer.innerHTML = `
      <p>No related products are available at the moment.</p>
    `;
    return;
  }

  relatedContainer.innerHTML = related.map(item => `
    <article class="related-product-card">
      <a href="product.html?id=${encodeURIComponent(item.id)}">
        <div class="related-product-image">
          <img
            src="${escapeHTML(item.image)}"
            alt="${escapeHTML(item.alt || item.name)}"
            loading="lazy">
        </div>

        <div class="related-product-info">
          <span>${escapeHTML(item.category.toUpperCase())}</span>
          <h3>${escapeHTML(item.name)}</h3>
          <strong>${money(item.price)}</strong>
        </div>
      </a>

      <button type="button" data-related-add="${escapeHTML(item.id)}">
        Add to cart ＋
      </button>
    </article>
  `).join("");
}

/* RELATED PRODUCT CART ACTION */

relatedContainer.addEventListener("click", event => {
  const button = event.target.closest("[data-related-add]");

  if (!button) return;

  const product = products.find(
    item => item.id === button.dataset.relatedAdd
  );

  if (product) addToCart(product);
});

/* LOAD CATALOGUE */

async function loadProduct() {
  try {
    if (!productId) {
      throw new Error("No product was selected.");
    }

    const response = await fetch("products.json");

    if (!response.ok) {
      throw new Error("Could not load the product catalogue.");
    }

    products = await response.json();

    const product = products.find(
      item => item.id === productId
    );

    if (!product) {
      throw new Error("This product could not be found.");
    }

    renderProduct(product);
    renderRelatedProducts(product);

  } catch (error) {
    detailsContainer.innerHTML = `
      <div class="product-not-found">
        <h2>Product unavailable</h2>
        <p>${escapeHTML(error.message)}</p>
        <a class="button primary" href="index.html#catalogue">
          Return to shop
        </a>
      </div>
    `;
  }
}

document.querySelector("#year").textContent =
  new Date().getFullYear();

loadProduct();
