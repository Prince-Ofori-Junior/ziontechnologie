
/* =========================================================
   ZION TECHNOLOGIE — STOREFRONT INTERACTIONS
   Product Search | Cart | Wishlist | Catalogue | WhatsApp
========================================================= */

const BUSINESS_WHATSAPP = "233595856187";

/* =========================================================
   WALMART-STYLE GHANA CEDI PRICE FORMAT
========================================================= */

function money(value) {
  return `GH₵${Number(value).toLocaleString("en-GH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let products = [];
let activeCategory = "All";
let searchTerm = "";

let cart = JSON.parse(
  localStorage.getItem("zion-cart") || "{}"
);

let wishlist = JSON.parse(
  localStorage.getItem("zion-wishlist") || "[]"
);

const $ = selector => document.querySelector(selector);

const grid = $("#productGrid");
const toast = $("#toast");

let toastTimer;

/* =========================================================
   NOTIFICATIONS
========================================================= */

function notify(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================================================
   SHOPPING CART FUNCTIONS
========================================================= */

function saveCart() {
  localStorage.setItem(
    "zion-cart",
    JSON.stringify(cart)
  );

  renderCart();
}

function totalItems() {
  return Object.values(cart).reduce(
    (sum, item) => sum + item.qty,
    0
  );
}

function cartTotal() {
  return Object.values(cart).reduce(
    (sum, item) => sum + item.qty * item.price,
    0
  );
}

function addToCart(id) {
  const product = products.find(
    item => item.id === id
  );

  if (!product) return;

  if (cart[id]) {
    cart[id].qty++;
  } else {
    cart[id] = {
      ...product,
      qty: 1
    };
  }

  saveCart();

  notify(`${product.name} added to your cart`);
}

function setQty(id, delta) {
  if (!cart[id]) return;

  cart[id].qty += delta;

  if (cart[id].qty <= 0) {
    delete cart[id];
  }

  saveCart();
}

/* =========================================================
   RENDER SHOPPING CART
========================================================= */

function renderCart() {
  $("#cartCount").textContent = totalItems();
  $("#drawerCount").textContent = totalItems();
  $("#cartTotal").textContent = money(cartTotal());

  const entries = Object.values(cart);

  $("#cartItems").innerHTML = entries.length

    ? entries.map(product => `

      <div class="cart-line">

        <img src="${product.image}" alt="">

        <div>

          <strong>${product.name}</strong>

          <small>${money(product.price)} each</small>

          <div class="quantity">

            <button
              data-qty="${product.id}"
              data-delta="-1"
              aria-label="Decrease quantity">
              −
            </button>

            <b>${product.qty}</b>

            <button
              data-qty="${product.id}"
              data-delta="1"
              aria-label="Increase quantity">
              +
            </button>

          </div>

        </div>

        <div>

          <div class="line-price">
            ${money(product.price * product.qty)}
          </div>

          <button
            class="remove-line"
            data-remove="${product.id}">
            Remove
          </button>

        </div>

      </div>

    `).join("")

    : `

      <div class="empty-cart">

        <h3>Your cart is empty</h3>

        <p>
          Explore the catalogue and add products to your selection.
        </p>

      </div>

    `;
}

/* =========================================================
   PRODUCT CATALOGUE
========================================================= */

function renderProducts() {
  if (!grid) return;

  let list = products.filter(product => {

    const matchesCategory =
      activeCategory === "All" ||
      product.category === activeCategory;

    const searchableText = `
      ${product.name}
      ${product.category}
      ${product.description}
    `.toLowerCase();

    const matchesSearch =
      searchableText.includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  /* PRODUCT SORTING */

  const sort = $("#sortProducts")?.value;

  if (sort === "low") {
    list.sort((a, b) => a.price - b.price);
  }

  if (sort === "high") {
    list.sort((a, b) => b.price - a.price);
  }

  if (sort === "az") {
    list.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /* RESULT COUNT */

  if ($("#resultCount")) {
    $("#resultCount").textContent =
      `${list.length} product${list.length === 1 ? "" : "s"} found`;
  }

  /* DISPLAY PRODUCTS */

  grid.innerHTML = list.length

    ? list.map(product => `

      <article class="product-card">

        <div class="product-image">

          <button
            class="wish-btn ${wishlist.includes(product.id) ? "active" : ""}"
            data-wish="${product.id}"
            aria-label="Add ${product.name} to wishlist">

            ${wishlist.includes(product.id) ? "♥" : "♡"}

          </button>

          <img
            src="${product.image}"
            alt="${product.alt || product.name}"
            loading="lazy">

        </div>

        <div class="product-info">

          <div class="product-type">
            ${product.category.toUpperCase()}
          </div>

          <h3>${product.name}</h3>

          <p>${product.description}</p>

          <div class="product-bottom">

            <div class="product-price">
              <span class="currency">GH₵</span>
              <span class="amount">
                ${Number(product.price).toLocaleString("en-GH")}
              </span>
            </div>

            <button
              class="add-btn"
              data-add="${product.id}">
              Add to cart ＋
            </button>

          </div>

          <a
            class="view-btn"
            href="product.html?id=${encodeURIComponent(product.id)}">

            View product details ↗

          </a>

        </div>

      </article>

    `).join("")

    : `

      <div class="empty-results">

        <b>No matching products found.</b>

        <p>
          Try another search or category.
        </p>

      </div>

    `;
}

/* =========================================================
   CATEGORY FILTERS
========================================================= */

function setCategory(category) {
  activeCategory = category;

  document.querySelectorAll(".filter").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === category
    );
  });

  renderProducts();
}

/* =========================================================
   ZION TECHNOLOGIE — YOUTUBE-STYLE PRODUCT SEARCH
   Live autocomplete | Product images | Backdrop
========================================================= */

const headerSearchForm = $("#headerSearchForm");
const headerSearchInput = $("#headerSearchInput");
const catalogueSearch = $("#productSearch");
const searchSuggestions = $("#searchSuggestions");
const searchWrap = $("#headerSearchWrap");

/* CREATE SEARCH BACKDROP */

const searchBackdrop = document.createElement("div");
searchBackdrop.className = "search-backdrop";
document.body.appendChild(searchBackdrop);

/* ESCAPE HTML TO PREVENT INVALID MARKUP */

function escapeSearchHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

/* OPEN AND CLOSE SEARCH DROPDOWN */

function openSearchSuggestions() {
  searchSuggestions?.classList.add("show");
  searchBackdrop.classList.add("show");
}

function closeSearchSuggestions() {
  searchSuggestions?.classList.remove("show");
  searchBackdrop.classList.remove("show");
}

/* SYNCHRONISE BOTH SEARCH INPUTS */

function updateProductSearch(value) {
  searchTerm = value.trim();

  if (headerSearchInput) {
    headerSearchInput.value = value;
  }

  if (catalogueSearch) {
    catalogueSearch.value = value;
  }

  renderProducts();
}

/* FIND AND DISPLAY MATCHING PRODUCTS */

function renderSearchSuggestions(value) {
  if (!searchSuggestions) return;

  const query = value.trim().toLowerCase();

  if (!query) {
    searchSuggestions.innerHTML = "";
    closeSearchSuggestions();
    return;
  }

  const matches = products.filter(product => {

    const searchableText = `
      ${product.name}
      ${product.category}
      ${product.description}
    `.toLowerCase();

    return searchableText.includes(query);

  }).slice(0, 8);

  /* NO MATCHING PRODUCTS */

  if (!matches.length) {
    searchSuggestions.innerHTML = `
      <div class="search-empty">
        <strong>No products found</strong>
        <p>Try another product name or category.</p>
      </div>
    `;

    openSearchSuggestions();
    return;
  }

  /* DISPLAY PRODUCT SUGGESTIONS */

  searchSuggestions.innerHTML = matches.map(product => `

    <a
      class="search-suggestion-item"
      href="product.html?id=${encodeURIComponent(product.id)}"
    >

      <img
        src="${escapeSearchHTML(product.image)}"
        alt="${escapeSearchHTML(product.name)}"
        loading="lazy"
      >

      <span class="search-suggestion-info">

        <strong>
          ${escapeSearchHTML(product.name)}
        </strong>

        <small>
          ${escapeSearchHTML(product.category)}
        </small>

        <b>
          ${money(product.price)}
        </b>

      </span>

    </a>

  `).join("");

  openSearchSuggestions();
}

/* HEADER SEARCH — LIVE AUTOCOMPLETE */

headerSearchInput?.addEventListener("input", event => {
  const value = event.target.value;

  updateProductSearch(value);

  renderSearchSuggestions(value);
});

/* CATALOGUE SEARCH */

catalogueSearch?.addEventListener("input", event => {
  updateProductSearch(event.target.value);
});

/* SUBMIT SEARCH */

headerSearchForm?.addEventListener("submit", event => {
  event.preventDefault();

  if (!headerSearchInput) return;

  const query = headerSearchInput.value.trim();

  if (!query) return;

  const firstMatch = products.find(product => {

    const searchableText = `
      ${product.name}
      ${product.category}
      ${product.description}
    `.toLowerCase();

    return searchableText.includes(query.toLowerCase());

  });

  closeSearchSuggestions();

  if (firstMatch) {
    window.location.href =
      `product.html?id=${encodeURIComponent(firstMatch.id)}`;
  } else {
    $("#catalogue")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
});

/* CLOSE DROPDOWN WHEN BACKDROP IS CLICKED */

searchBackdrop.addEventListener("click", closeSearchSuggestions);

/* CLOSE DROPDOWN WHEN CLICKING OUTSIDE SEARCH */

document.addEventListener("click", event => {
  if (
    searchWrap &&
    !searchWrap.contains(event.target)
  ) {
    closeSearchSuggestions();
  }
});

/* CLOSE DROPDOWN WITH ESCAPE */

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeSearchSuggestions();
  }
});

/* SORT PRODUCTS */

$("#sortProducts")?.addEventListener(
  "change",
  renderProducts
);

/* =========================================================
   CART DRAWER
========================================================= */

function openCart() {
  $("#cartDrawer").classList.add("open");

  $("#overlay").classList.add("open");

  $("#cartDrawer").setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeCart() {
  $("#cartDrawer").classList.remove("open");

  $("#overlay").classList.remove("open");

  $("#cartDrawer").setAttribute(
    "aria-hidden",
    "true"
  );
}

/* =========================================================
   WHATSAPP FUNCTIONS
========================================================= */

function whatsapp(message) {
  return `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function checkout() {
  const items = Object.values(cart);

  if (!items.length) {
    notify("Your cart is empty");
    return;
  }

  const lines = items.map(product =>
    `• ${product.name} — ${product.qty} × ${money(product.price)} = ${money(product.price * product.qty)}`
  ).join("\n");

  const message = `

Hello Zion Technologie, I would like to enquire about this order:

${lines}

Estimated subtotal: ${money(cartTotal())}

Please confirm stock, delivery and final pricing.

`;

  window.open(
    whatsapp(message),
    "_blank",
    "noopener"
  );

  closeCart();
}

/* =========================================================
   PRODUCT QUICK VIEW
========================================================= */

function showQuickView(id) {
  const product = products.find(
    item => item.id === id
  );

  if (!product) return;

  $("#quickViewContent").innerHTML = `

    <button
      class="close-btn"
      id="quickClose"
      aria-label="Close details">
      ×
    </button>

    <img
      src="${product.image}"
      alt="${product.alt || product.name}">

    <div>

      <div class="eyebrow">

        <span></span>

        ${product.category.toUpperCase()}

      </div>

      <h3>${product.name}</h3>

      <div class="product-price">
        <span class="currency">GH₵</span>
        <span class="amount">
          ${Number(product.price).toLocaleString("en-GH")}
        </span>
      </div>

      <p>${product.description}</p>

      <p>
        Product price and availability are indicative.
        Contact our team to confirm specifications,
        warranty and current stock.
      </p>

      <button
        class="button primary"
        id="quickAdd">

        Add to cart ＋

      </button>

    </div>

  `;

  $("#quickView").classList.add("open");

  $("#quickView").setAttribute(
    "aria-hidden",
    "false"
  );

  $("#quickClose").addEventListener("click", () => {
    $("#quickView").classList.remove("open");

    $("#quickView").setAttribute(
      "aria-hidden",
      "true"
    );
  });

  $("#quickAdd").addEventListener("click", () => {
    addToCart(id);

    $("#quickView").classList.remove("open");

    $("#quickView").setAttribute(
      "aria-hidden",
      "true"
    );
  });
}

/* =========================================================
   GLOBAL CLICK EVENTS
========================================================= */

document.addEventListener("click", event => {

  /* ADD TO CART */

  const add = event.target.closest("[data-add]");

  if (add) {
    addToCart(add.dataset.add);
  }

  /* WISHLIST */

  const wish = event.target.closest("[data-wish]");

  if (wish) {
    const id = wish.dataset.wish;

    wishlist = wishlist.includes(id)
      ? wishlist.filter(item => item !== id)
      : [...wishlist, id];

    localStorage.setItem(
      "zion-wishlist",
      JSON.stringify(wishlist)
    );

    renderProducts();

    notify(
      wishlist.includes(id)
        ? "Saved to wishlist"
        : "Removed from wishlist"
    );
  }

  /* QUICK VIEW */

  const view = event.target.closest("[data-view]");

  if (view) {
    showQuickView(view.dataset.view);
  }

  /* QUANTITY CONTROLS */

  const qty = event.target.closest("[data-qty]");

  if (qty) {
    setQty(
      qty.dataset.qty,
      Number(qty.dataset.delta)
    );
  }

  /* REMOVE CART ITEM */

  const remove = event.target.closest("[data-remove]");

  if (remove) {
    delete cart[remove.dataset.remove];

    saveCart();
  }

  /* SERVICE REQUEST */

  const service = event.target.closest("[data-service]");

  if (service) {
    $("#serviceSelect").value =
      service.dataset.service;

    $("#booking").scrollIntoView({
      behavior: "smooth"
    });
  }

  /* CATEGORY FILTER */

  const filter = event.target.closest("[data-filter]");

  if (filter) {
    setCategory(filter.dataset.filter);
  }

});

/* =========================================================
   HEADER AND CART EVENTS
========================================================= */

$("#cartOpen")?.addEventListener(
  "click",
  openCart
);

$("#cartClose")?.addEventListener(
  "click",
  closeCart
);

$("#overlay")?.addEventListener(
  "click",
  closeCart
);

$("#checkout")?.addEventListener(
  "click",
  checkout
);

/* =========================================================
   MOBILE NAVIGATION — WORLD CLASS DRAWER
========================================================= */

const mobileMenu = $("#mobileMenu");
const mobileNavDrawer = $("#mobileNavDrawer");
const mobileNavBackdrop = $("#mobileNavBackdrop");
const mobileNavClose = $("#mobileNavClose");
const mobileNavLinks = document.querySelectorAll(".mobile-nav-link");
const mobileCartOpen = $("#mobileCartOpen");
const mobileCartCount = $("#mobileCartCount");
const cartCount = $("#cartCount");

let drawerOpen = false;

function lockBodyScroll(lock) {
  document.body.style.overflow = lock ? "hidden" : "";
  document.body.style.paddingRight = lock ? `${window.innerWidth - document.documentElement.clientWidth}px` : "";
}

function openDrawer() {
  if (drawerOpen) return;
  drawerOpen = true;
  mobileNavDrawer.classList.add("open");
  mobileNavDrawer.setAttribute("aria-hidden", "false");
  mobileMenu.setAttribute("aria-expanded", "true");
  mobileMenu.setAttribute("aria-label", "Close navigation");
  lockBodyScroll(true);
  updateMobileCartCount();
}

function closeDrawer() {
  if (!drawerOpen) return;
  drawerOpen = false;
  mobileNavDrawer.classList.remove("open");
  mobileNavDrawer.setAttribute("aria-hidden", "true");
  mobileMenu.setAttribute("aria-expanded", "false");
  mobileMenu.setAttribute("aria-label", "Open navigation");
  lockBodyScroll(false);
}

function toggleDrawer() {
  drawerOpen ? closeDrawer() : openDrawer();
}

mobileMenu?.addEventListener("click", toggleDrawer);
mobileNavClose?.addEventListener("click", closeDrawer);
mobileNavBackdrop?.addEventListener("click", closeDrawer);

mobileNavLinks.forEach(link => {
  link.addEventListener("click", () => {
    closeDrawer();
  });
});

mobileCartOpen?.addEventListener("click", () => {
  closeDrawer();
  setTimeout(() => {
    $("#cartOpen")?.click();
  }, 350);
});

function updateMobileCartCount() {
  const total = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  if (mobileCartCount) mobileCartCount.textContent = total;
  if (cartCount) cartCount.textContent = total;
}

/* Re-render cart count badge when cart changes */

const _saveCart = saveCart;
saveCart = function () {
  _saveCart();
  if (drawerOpen) updateMobileCartCount();
};

/* =========================================================
   SERVICE REQUEST FORM
========================================================= */

if ($("#bookingDate")) {
  $("#bookingDate").min =
    new Date().toISOString().split("T")[0];
}

$("#bookingForm")?.addEventListener("submit", event => {
  event.preventDefault();

  const data = Object.fromEntries(
    new FormData(event.currentTarget).entries()
  );

  const message = `

Hello Zion Technologie, I would like to request a technical service.

Name: ${data.name}
Phone: ${data.phone}
Service: ${data.service}
Location: ${data.location}
Preferred date: ${data.date || "Flexible"}
Details: ${data.details || "Not provided"}

Please contact me to confirm availability and quotation.

`;

  window.open(
    whatsapp(message),
    "_blank",
    "noopener"
  );
});

/* =========================================================
   FOOTER AND CONTACT
========================================================= */

if ($("#whatsappLink")) {
  $("#whatsappLink").href = whatsapp(
    "Hello Zion Technologie, I would like to make an enquiry."
  );
}

if ($("#year")) {
  $("#year").textContent = new Date().getFullYear();
}

/* =========================================================
   KEYBOARD CONTROLS
========================================================= */

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeDrawer();
    closeCart();

    $("#searchModal")?.classList.remove("open");

    $("#quickView")?.classList.remove("open");

    $("#quickView")?.setAttribute(
      "aria-hidden",
      "true"
    );
  }
});

/* =========================================================
   LOAD PRODUCTS
========================================================= */

fetch("products.json")

  .then(response => {
    if (!response.ok) {
      throw new Error(
        "Could not load catalogue"
      );
    }

    return response.json();
  })

  .then(data => {
    products = data;

    renderProducts();

    renderCart();
  })

  .catch(error => {
    console.error("Product loading error:", error);

    if (grid) {
      grid.innerHTML = `

        <div class="empty-results">

          The product catalogue could not be loaded.

          Check that products.json is in the same folder.

        </div>

      `;
    }
  });

/* =========================================================
   INFINITE HERO IMAGE SLIDESHOW
========================================================= */

(() => {
  const slideshow = document.querySelector(
    ".hero-slideshow"
  );

  if (!slideshow) return;

  const slides = slideshow.querySelectorAll(
    ".hero-slide"
  );

  const indicators = slideshow.querySelectorAll(
    ".hero-slide-indicators span"
  );

  if (slides.length < 2) return;

  let currentSlide = 0;

  function showNextSlide() {
    slides[currentSlide].classList.remove("active");

    indicators[currentSlide]?.classList.remove("active");

    currentSlide =
      (currentSlide + 1) % slides.length;

    slides[currentSlide].classList.add("active");

    indicators[currentSlide]?.classList.add("active");
  }

  // Change image every 4 seconds indefinitely

  setInterval(showNextSlide, 4000);

})();
