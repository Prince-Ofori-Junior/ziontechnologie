
/* =========================================================
   ZION TECHNOLOGIE GHANA
   E-COMMERCE WEBSITE — MAIN JAVASCRIPT
   Compatible with:
   index.html
   style.css
   Responsive: Mobile / Tablet / Desktop

   Features:
   - Product filtering and search
   - Product sorting
   - Shopping cart with localStorage
   - WhatsApp checkout
   - Service booking
   - Mobile navigation
   - Contact links
   - Toast notifications
========================================================= */


/* =========================================================
   01. BUSINESS CONFIGURATION
========================================================= */

const ZION_CONFIG = {
  whatsappNumber: "233244244529",
  email: "ziontechnologies@gmail.com"
};


/* =========================================================
   02. GLOBAL HELPERS
========================================================= */

const $ = id => document.getElementById(id);

const money = value => {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2
  })
    .format(Number(value) || 0)
    .replace("GHS", "GH₵");
};

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function getWhatsAppNumber() {
  const rawNumber = String(ZION_CONFIG.whatsappNumber || "").trim();

  // Reject placeholder numbers before removing non-digit characters.
  if (!rawNumber || /[xX]/.test(rawNumber)) return "";

  const number = rawNumber.replace(/\D/g, "");

  if (number.length < 10 || number.length > 15) return "";

  return number;
}

function getLocalDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const date = {};

  parts.forEach(part => {
    date[part.type] = part.value;
  });

  return `${date.year}-${date.month}-${date.day}`;
}


/* =========================================================
   03. DOM ELEMENTS
========================================================= */

const productGrid = $("productGrid");
const cartCount = $("cartCount");
const cartItems = $("cartItems");
const cartTotal = $("cartTotal");

const drawer = $("cartDrawer");
const backdrop = $("cartBackdrop");
const toast = $("toast");

const searchPanel = $("searchPanel");
const searchInput = $("searchInput");

const mainNav = $("mainNav");
const menuToggle = $("menuToggle");

const bookingForm = $("bookingForm");
const bookingDate = $("bookingDate");

const contactWhatsapp = $("contactWhatsapp");
const contactEmail = $("contactEmail");
const footerEmail = $("footerEmail");

const productCards = productGrid
  ? [...productGrid.querySelectorAll(".product-card")]
  : [];


/* =========================================================
   04. PRODUCT DATA
========================================================= */

const products = Object.fromEntries(
  productCards
    .filter(card => card.dataset.id)
    .map(card => {
      const image = card.querySelector(".product-image img");

      return [
        card.dataset.id,
        {
          id: card.dataset.id,
          name: card.dataset.name || "Unnamed product",
          category: card.dataset.category || "Other",
          price: Number(card.dataset.price) || 0,
          image: image ? image.currentSrc || image.src : ""
        }
      ];
    })
);


/* =========================================================
   05. SHOPPING CART STORAGE
========================================================= */

let cart = {};

try {
  const savedCart = JSON.parse(
    localStorage.getItem("ZionGhanaCart") || "{}"
  );

  if (
    savedCart &&
    typeof savedCart === "object" &&
    !Array.isArray(savedCart)
  ) {
    Object.entries(savedCart).forEach(([id, quantity]) => {
      const validQuantity = Math.floor(Number(quantity));

      if (
        products[id] &&
        Number.isFinite(validQuantity) &&
        validQuantity > 0
      ) {
        cart[id] = validQuantity;
      }
    });
  }
} catch {
  cart = {};
}

let activeFilter = "All";
let searchTerm = "";


/* =========================================================
   06. TOAST NOTIFICATIONS
========================================================= */

let toastTimer;

function showToast(message) {
  if (!toast) {
    console.info(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(toastTimer);

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2300);
}


/* =========================================================
   07. CART CALCULATIONS
========================================================= */

function cartQuantity() {
  return Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0
  );
}

function cartSubtotal() {
  return Object.entries(cart).reduce((sum, [id, quantity]) => {
    return sum + (products[id]?.price || 0) * quantity;
  }, 0);
}

function saveCart() {
  try {
    localStorage.setItem(
      "ZionGhanaCart",
      JSON.stringify(cart)
    );
  } catch {
    showToast("Unable to save your cart on this device");
  }

  renderCart();
}


/* =========================================================
   08. RENDER SHOPPING CART
========================================================= */

function renderCart() {
  const quantity = cartQuantity();
  const subtotal = cartSubtotal();

  if (cartCount) {
    cartCount.textContent = quantity;
    cartCount.setAttribute("aria-label", `${quantity} items in cart`);
  }

  if (cartTotal) {
    cartTotal.textContent = money(subtotal);
  }

  if (!cartItems) return;

  const entries = Object.entries(cart).filter(
    ([id, quantity]) => products[id] && quantity > 0
  );

  if (!entries.length) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <span>＋</span>
        <h4>Your cart is empty</h4>
        <p>Add equipment to start your order.</p>
      </div>
    `;

    return;
  }

  cartItems.innerHTML = entries.map(([id, quantity]) => {
    const product = products[id];

    return `
      <div class="cart-item">

        <div class="cart-item-image">
          ${
            product.image
              ? `
                <img
                  src="${escapeHTML(product.image)}"
                  alt="${escapeHTML(product.name)}"
                  loading="lazy"
                >
              `
              : ""
          }
        </div>

        <div class="cart-item-details">

          <h4>${escapeHTML(product.name)}</h4>

          <small>${money(product.price)} each</small>

          <div class="qty-controls">

            <button
              type="button"
              data-action="decrease"
              data-id="${escapeHTML(id)}"
              aria-label="Decrease quantity of ${escapeHTML(product.name)}"
            >−</button>

            <b>${quantity}</b>

            <button
              type="button"
              data-action="increase"
              data-id="${escapeHTML(id)}"
              aria-label="Increase quantity of ${escapeHTML(product.name)}"
            >+</button>

          </div>

        </div>

        <div class="cart-item-side">

          <strong>${money(product.price * quantity)}</strong>

          <button
            class="remove-item"
            type="button"
            data-action="remove"
            data-id="${escapeHTML(id)}"
          >Remove</button>

        </div>

      </div>
    `;
  }).join("");
}


/* =========================================================
   09. CART OPERATIONS
========================================================= */

function addToCart(id) {
  if (!products[id]) {
    showToast("This product is currently unavailable");
    return;
  }

  cart[id] = (cart[id] || 0) + 1;

  saveCart();

  showToast(`${products[id].name} added to your cart`);
}

function updateQuantity(id, action) {
  if (!cart[id] || !products[id]) return;

  if (action === "increase") {
    cart[id] += 1;
  }

  if (action === "decrease") {
    cart[id] -= 1;
  }

  if (action === "remove" || cart[id] <= 0) {
    delete cart[id];
  }

  saveCart();
}


/* =========================================================
   10. OPEN AND CLOSE CART
========================================================= */

function openCart() {
  if (!drawer || !backdrop) return;

  drawer.classList.add("open");
  backdrop.classList.add("open");

  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  if (!drawer || !backdrop) return;

  drawer.classList.remove("open");
  backdrop.classList.remove("open");

  drawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}


/* =========================================================
   11. WHATSAPP INTEGRATION
========================================================= */

function whatsappURL(message) {
  const number = getWhatsAppNumber();

  if (!number) {
    showToast("Set a valid Ghana WhatsApp number in script.js");
    return null;
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function sendWhatsApp(message) {
  const url = whatsappURL(message);

  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}


/* =========================================================
   12. SHOPPING CART CHECKOUT
========================================================= */

function checkout() {
  const entries = Object.entries(cart).filter(
    ([id, quantity]) => products[id] && quantity > 0
  );

  if (!entries.length) {
    showToast("Your cart is empty");
    return;
  }

  const lines = entries.map(([id, quantity]) => {
    const product = products[id];

    return (
      `• ${product.name} × ${quantity} — ` +
      `${money(product.price * quantity)}`
    );
  });

  const message = [
    "Hello Zion Technologie Ghana, I would like to place an order:",
    "",
    ...lines,
    "",
    `Estimated subtotal: ${money(cartSubtotal())}`,
    "",
    "Please confirm stock availability, delivery fee and payment details.",
    "",
    "Name:",
    "Town / delivery location:"
  ].join("\n");

  sendWhatsApp(message);
}


/* =========================================================
   13. PRODUCT SEARCH AND FILTERING
========================================================= */

function applyFilters() {
  const term = searchTerm.toLowerCase();

  productCards.forEach(card => {
    const category = card.dataset.category || "";
    const name = card.dataset.name || "";

    const matchesCategory =
      activeFilter === "All" || category === activeFilter;

    const searchableText = (
      `${name} ${category} ${card.textContent}`
    ).toLowerCase();

    const matchesSearch =
      !term || searchableText.includes(term);

    card.hidden = !(matchesCategory && matchesSearch);
  });
}

function setFilter(category) {
  if (!category) return;

  activeFilter = category;

  document.querySelectorAll(".filter-chip").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === category
    );
  });

  applyFilters();

  const shopSection = $("shop");

  if (shopSection) {
    shopSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


/* =========================================================
   14. PRODUCT SORTING
========================================================= */

function sortProducts(value) {
  if (!productGrid) return;

  const sorted = [...productCards].sort((a, b) => {
    const priceA = Number(a.dataset.price) || 0;
    const priceB = Number(b.dataset.price) || 0;

    if (value === "low") {
      return priceA - priceB;
    }

    if (value === "high") {
      return priceB - priceA;
    }

    const idA = Number((a.dataset.id || "").replace(/^p/i, "")) || 0;
    const idB = Number((b.dataset.id || "").replace(/^p/i, "")) || 0;

    return idA - idB;
  });

  sorted.forEach(card => {
    productGrid.appendChild(card);
  });
}


/* =========================================================
   15. SEARCH PANEL
========================================================= */

function openSearch() {
  if (!searchPanel) return;

  searchPanel.classList.add("open");
  searchPanel.setAttribute("aria-hidden", "false");

  if (searchInput) {
    searchInput.focus();
  }
}

function closeSearch() {
  if (!searchPanel) return;

  searchPanel.classList.remove("open");
  searchPanel.setAttribute("aria-hidden", "true");
}


/* =========================================================
   16. MOBILE NAVIGATION
========================================================= */

function closeMenu() {
  if (mainNav) {
    mainNav.classList.remove("open");
  }

  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", "false");
  }
}

function toggleMenu() {
  if (!mainNav || !menuToggle) return;

  const isOpen = mainNav.classList.toggle("open");

  menuToggle.setAttribute(
    "aria-expanded",
    String(isOpen)
  );
}


/* =========================================================
   17. SERVICE BOOKING FORM
========================================================= */

if (bookingDate) {
  bookingDate.min = getLocalDate();
}

if (bookingForm) {
  bookingForm.addEventListener("submit", event => {
    event.preventDefault();

    const form = new FormData(bookingForm);

    const getValue = name => {
      const value = form.get(name);
      return String(value ?? "").trim();
    };

    const name = getValue("name");
    const phone = getValue("phone");
    const service = getValue("service");
    const location = getValue("location");
    const date = getValue("date") || "Flexible";
    const details = getValue("details") || "Not provided";

    if (!name || !phone || !service || !location) {
      showToast("Please complete all required booking fields");
      return;
    }

    const message = [
      "Hello Zion Technologie Ghana, I would like to request a service booking.",
      "",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Service: ${service}`,
      `Town / area: ${location}`,
      `Preferred date: ${date}`,
      `Job details: ${details}`,
      "",
      "Please contact me to confirm availability, quotation and appointment."
    ].join("\n");

    sendWhatsApp(message);
  });
}


/* =========================================================
   18. CONTACT INFORMATION
========================================================= */

const contactMessage =
  "Hello Zion Technologie, I would like to enquire about your products and services.";

const contactNumber = getWhatsAppNumber();

if (contactWhatsapp) {
  if (contactNumber) {
    contactWhatsapp.href =
      `https://wa.me/${contactNumber}?text=${encodeURIComponent(contactMessage)}`;

    contactWhatsapp.target = "_blank";
    contactWhatsapp.rel = "noopener noreferrer";
  } else {
    contactWhatsapp.addEventListener("click", event => {
      event.preventDefault();
      showToast("Set a valid WhatsApp number in script.js");
    });
  }
}

if (contactEmail) {
  contactEmail.href = `mailto:${ZION_CONFIG.email}`;
}

if (footerEmail) {
  footerEmail.href = `mailto:${ZION_CONFIG.email}`;
  footerEmail.textContent = ZION_CONFIG.email;
}


/* =========================================================
   19. FOOTER YEAR
========================================================= */

const yearElement = $("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}


/* =========================================================
   20. GLOBAL CLICK EVENTS
========================================================= */

document.addEventListener("click", event => {
  const target = event.target;

  if (!(target instanceof Element)) return;


  // Add product to cart
  const addButton = target.closest(".add-cart");

  if (addButton) {
    addToCart(addButton.dataset.id);
  }


  // Cart quantity and remove buttons
  const quantityButton = target.closest("[data-action]");

  if (quantityButton) {
    updateQuantity(
      quantityButton.dataset.id,
      quantityButton.dataset.action
    );
  }


  // Product category filters
  const filterButton = target.closest(".filter-chip");

  if (filterButton) {
    setFilter(filterButton.dataset.filter);
  }


  // Category links
  const categoryLink = target.closest("[data-category-link]");

  if (categoryLink) {
    const category = categoryLink.dataset.categoryLink;

    const matchingFilter = [...document.querySelectorAll(".filter-chip")]
      .some(button => button.dataset.filter === category);

    if (matchingFilter) {
      event.preventDefault();
      setFilter(category);
    } else {
      activeFilter = "All";

      document.querySelectorAll(".filter-chip").forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.filter === "All"
        );
      });

      applyFilters();
    }
  }


  // Service selection links
  const serviceLink = target.closest("[data-service]");

  if (serviceLink) {
    const serviceSelect = $("serviceSelect");

    if (serviceSelect) {
      serviceSelect.value = serviceLink.dataset.service;
    }
  }


  // Close search when clicking outside its panel
  if (
    searchPanel &&
    searchPanel.classList.contains("open") &&
    !target.closest("#searchPanel") &&
    !target.closest("#searchTrigger")
  ) {
    closeSearch();
  }
});


/* =========================================================
   21. BUTTON EVENT LISTENERS
========================================================= */

const cartTrigger = $("cartTrigger");
const closeCartButton = $("closeCart");
const checkoutButton = $("checkoutBtn");

const searchTrigger = $("searchTrigger");
const closeSearchButton = $("closeSearch");

const sortSelect = $("sortSelect");

if (cartTrigger) {
  cartTrigger.addEventListener("click", openCart);
}

if (closeCartButton) {
  closeCartButton.addEventListener("click", closeCart);
}

if (backdrop) {
  backdrop.addEventListener("click", closeCart);
}

if (checkoutButton) {
  checkoutButton.addEventListener("click", checkout);
}

if (searchTrigger) {
  searchTrigger.addEventListener("click", openSearch);
}

if (closeSearchButton) {
  closeSearchButton.addEventListener("click", closeSearch);
}

if (searchInput) {
  searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.trim();
    applyFilters();
  });
}

if (sortSelect) {
  sortSelect.addEventListener("change", event => {
    sortProducts(event.target.value);
  });
}


/* =========================================================
   22. MOBILE MENU EVENTS
========================================================= */

if (menuToggle) {
  menuToggle.addEventListener("click", toggleMenu);
}

if (mainNav) {
  mainNav.addEventListener("click", event => {
    if (
      event.target instanceof Element &&
      event.target.closest("a")
    ) {
      closeMenu();
    }
  });
}


/* =========================================================
   23. KEYBOARD ACCESSIBILITY
========================================================= */

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeCart();
    closeSearch();
    closeMenu();
  }
});


/* =========================================================
   24. INITIALIZE WEBSITE
========================================================= */

renderCart();
applyFilters();

console.info(
  "Zion Technologie website initialized successfully."
);
