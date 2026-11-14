/* ZION TECHNOLOGIE — SHOP SCRIPT v2
   Adds: checkout form, delivery/pickup, promo codes, delivery fee,
   wishlist ("Saved" filter), stock limits, order references + history,
   empty-search message. Works with your existing index.html. */

const ZION_CONFIG = {
  whatsappNumber: "233244244529",
  email: "ziontechnologies@gmail.com",
  deliveryFee: 30,            // GH₵, estimate – confirmed by the team
  freeDeliveryOver: 1500,     // free delivery above this subtotal (0 = off)
  maxQty: 10,
  promos: {                   // edit or remove codes here
    ZION5:     { type: "percent", value: 5,  label: "5% off" },
    WELCOME50: { type: "flat",    value: 50, label: "GH₵ 50 off" }
  }
};

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const money = v => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", minimumFractionDigits: 2 })
  .format(Number(v) || 0).replace("GHS", "GH₵");
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast("Could not save data on this device"); } }
};
function waNumber() {
  const raw = String(ZION_CONFIG.whatsappNumber || "").trim();
  if (!raw || /x/i.test(raw)) return "";
  const n = raw.replace(/\D/g, "");
  return n.length >= 10 && n.length <= 15 ? n : "";
}
function localDate() {
  const p = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date()).forEach(x => p[x.type] = x.value);
  return `${p.year}-${p.month}-${p.day}`;
}

/* ---------- DOM ---------- */
const productGrid = $("productGrid"), cartCount = $("cartCount"), cartItems = $("cartItems"),
  cartTotal = $("cartTotal"), drawer = $("cartDrawer"), backdrop = $("cartBackdrop"),
  toastEl = $("toast"), searchPanel = $("searchPanel"), searchInput = $("searchInput"),
  mainNav = $("mainNav"), menuToggle = $("menuToggle"), bookingForm = $("bookingForm");
const cards = productGrid ? [...productGrid.querySelectorAll(".product-card")] : [];

/* ---------- products ---------- */
const products = Object.fromEntries(cards.filter(c => c.dataset.id).map(c => {
  const img = c.querySelector(".product-image img");
  const stock = c.dataset.stock === undefined ? Infinity : Number(c.dataset.stock);
  return [c.dataset.id, {
    id: c.dataset.id, name: c.dataset.name || "Product", category: c.dataset.category || "Other",
    price: Number(c.dataset.price) || 0, image: img ? img.currentSrc || img.src : "",
    stock: Number.isFinite(stock) ? stock : Infinity
  }];
}));
const maxFor = p => Math.min(ZION_CONFIG.maxQty, p.stock);

/* ---------- state ---------- */
let cart = {};
const saved = store.get("ZionGhanaCart", {});
Object.entries(saved && typeof saved === "object" ? saved : {}).forEach(([id, q]) => {
  q = Math.floor(Number(q));
  if (products[id] && q > 0) cart[id] = Math.min(q, maxFor(products[id]));
});
let wishlist = (store.get("ZionWishlist", []) || []).filter(id => products[id]);
let promoCode = store.get("ZionPromo", "");
let customer = store.get("ZionCustomer", { name: "", phone: "", method: "Delivery", location: "", payment: "Mobile Money", note: "" });
let activeFilter = "All", searchTerm = "";

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  if (!toastEl) return console.info(msg);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2300);
}

/* ---------- totals ---------- */
const qtyTotal = () => Object.values(cart).reduce((s, q) => s + q, 0);
const subtotal = () => Object.entries(cart).reduce((s, [id, q]) => s + products[id].price * q, 0);
function totals() {
  const sub = subtotal();
  const promo = ZION_CONFIG.promos[promoCode];
  let discount = 0;
  if (promo) discount = promo.type === "percent" ? sub * promo.value / 100 : Math.min(promo.value, sub);
  const after = sub - discount;
  const free = ZION_CONFIG.freeDeliveryOver && after >= ZION_CONFIG.freeDeliveryOver;
  const delivery = customer.method === "Delivery" && sub > 0 && !free ? ZION_CONFIG.deliveryFee : 0;
  return { sub, discount, delivery, free, total: after + delivery, promo };
}
function persistCart() { store.set("ZionGhanaCart", cart); renderCart(); }

/* ---------- inject extra UI (no HTML edits needed) ---------- */
const footer = drawer?.querySelector(".cart-footer");
if (footer) {
  const totalRow = footer.querySelector(".cart-total");
  totalRow.querySelector("span").textContent = "Estimated total";
  const box = document.createElement("div");
  box.className = "co-box";
  box.innerHTML = `
    <div class="co-promo">
      <input id="promoInput" placeholder="Promo code" autocomplete="off" aria-label="Promo code">
      <button type="button" id="promoBtn">Apply</button>
    </div>
    <div class="co-summary" id="coSummary"></div>
    <details class="co-details" open>
      <summary>Your details</summary>
      <div class="co-grid">
        <input id="coName" placeholder="Full name *" autocomplete="name">
        <input id="coPhone" type="tel" placeholder="Phone number *" autocomplete="tel">
        <select id="coMethod" aria-label="Delivery method">
          <option>Delivery</option><option>Pickup</option>
        </select>
        <select id="coPayment" aria-label="Payment preference">
          <option>Mobile Money</option><option>Cash on delivery</option><option>Bank transfer</option>
        </select>
        <input id="coLocation" class="co-wide" placeholder="Delivery town / area *" autocomplete="street-address">
        <input id="coNote" class="co-wide" placeholder="Order note (optional)">
      </div>
    </details>`;
  footer.insertBefore(box, totalRow);
  const clear = document.createElement("button");
  clear.type = "button"; clear.id = "clearCart"; clear.className = "co-clear"; clear.textContent = "Clear cart";
  footer.appendChild(clear);

  $("coName").value = customer.name; $("coPhone").value = customer.phone;
  $("coMethod").value = customer.method; $("coPayment").value = customer.payment;
  $("coLocation").value = customer.location; $("coNote").value = customer.note;
  $("promoInput").value = promoCode;
}
function readCustomer() {
  customer = {
    name: $("coName").value.trim(), phone: $("coPhone").value.trim(),
    method: $("coMethod").value, payment: $("coPayment").value,
    location: $("coLocation").value.trim(), note: $("coNote").value.trim()
  };
  store.set("ZionCustomer", customer);
  const loc = $("coLocation");
  loc.hidden = customer.method === "Pickup";
}

/* wishlist hearts + stock state on each card */
cards.forEach(card => {
  const p = products[card.dataset.id];
  if (!p) return;
  const wrap = card.querySelector(".product-image");
  const h = document.createElement("button");
  h.type = "button"; h.className = "wish-btn"; h.dataset.wish = p.id;
  wrap.appendChild(h);
  if (p.stock <= 0) {
    const b = card.querySelector(".add-cart");
    b.disabled = true; b.textContent = "Out of stock";
    card.classList.add("sold-out");
  }
});
const filtersBox = $("filterList");
if (filtersBox) {
  const chip = document.createElement("button");
  chip.className = "filter-chip"; chip.type = "button"; chip.dataset.filter = "Saved"; chip.id = "savedChip";
  filtersBox.appendChild(chip);
}
const emptyMsg = document.createElement("p");
emptyMsg.className = "no-results"; emptyMsg.hidden = true;
emptyMsg.textContent = "No products match your search or filter. Try another word or choose All products.";
productGrid?.after(emptyMsg);

function renderWishlist() {
  document.querySelectorAll(".wish-btn").forEach(b => {
    const on = wishlist.includes(b.dataset.wish);
    b.classList.toggle("on", on);
    b.textContent = on ? "♥" : "♡";
    b.setAttribute("aria-pressed", on);
    b.setAttribute("aria-label", (on ? "Remove from" : "Save to") + " wishlist: " + products[b.dataset.wish].name);
  });
  const chip = $("savedChip");
  if (chip) chip.textContent = `♥ Saved (${wishlist.length})`;
}
function toggleWish(id) {
  if (!products[id]) return;
  const i = wishlist.indexOf(id);
  i > -1 ? wishlist.splice(i, 1) : wishlist.push(id);
  store.set("ZionWishlist", wishlist);
  renderWishlist();
  toast(i > -1 ? "Removed from saved items" : "Saved for later");
  if (activeFilter === "Saved") applyFilters();
}

/* ---------- render cart ---------- */
function renderCart() {
  const t = totals();
  if (cartCount) { cartCount.textContent = qtyTotal(); cartCount.setAttribute("aria-label", qtyTotal() + " items in cart"); }
  if (cartTotal) cartTotal.textContent = money(t.total);

  const sum = $("coSummary");
  if (sum) {
    sum.innerHTML = `
      <div><span>Subtotal</span><b>${money(t.sub)}</b></div>
      ${t.discount ? `<div class="good"><span>Promo ${esc(promoCode)} (${esc(t.promo.label)})</span><b>−${money(t.discount)}</b></div>` : ""}
      <div><span>${customer.method === "Pickup" ? "Pickup" : "Delivery (estimate)"}</span><b>${t.free ? "Free" : money(t.delivery)}</b></div>`;
    sum.hidden = !t.sub;
  }
  const hasItems = t.sub > 0;
  footer?.querySelectorAll(".co-box, .co-clear, .checkout-btn").forEach(el => el.hidden = !hasItems);
  readCustomer();

  if (!cartItems) return;
  const entries = Object.entries(cart);
  if (!entries.length) {
    cartItems.innerHTML = `<div class="empty-cart"><span>＋</span><h4>Your cart is empty</h4><p>Add equipment to start your order.</p></div>`;
    return;
  }
  cartItems.innerHTML = entries.map(([id, q]) => {
    const p = products[id], atMax = q >= maxFor(p);
    return `
    <div class="cart-item">
      <div class="cart-item-image">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : ""}</div>
      <div class="cart-item-details">
        <h4>${esc(p.name)}</h4>
        <small>${money(p.price)} each</small>
        <div class="qty-controls">
          <button type="button" data-action="decrease" data-id="${esc(id)}" aria-label="Decrease quantity of ${esc(p.name)}">−</button>
          <b>${q}</b>
          <button type="button" data-action="increase" data-id="${esc(id)}" ${atMax ? "disabled" : ""} aria-label="Increase quantity of ${esc(p.name)}">+</button>
        </div>
      </div>
      <div class="cart-item-side">
        <strong>${money(p.price * q)}</strong>
        <button class="remove-item" type="button" data-action="remove" data-id="${esc(id)}">Remove</button>
      </div>
    </div>`;
  }).join("");
}

/* ---------- cart operations ---------- */
function addToCart(id) {
  const p = products[id];
  if (!p || p.stock <= 0) return toast("This product is out of stock");
  if ((cart[id] || 0) >= maxFor(p)) return toast(`Maximum of ${maxFor(p)} per order for this item`);
  cart[id] = (cart[id] || 0) + 1;
  persistCart();
  toast(`${p.name} added to your cart`);
}
function updateQty(id, action) {
  if (!cart[id] || !products[id]) return;
  if (action === "increase" && cart[id] < maxFor(products[id])) cart[id]++;
  if (action === "decrease") cart[id]--;
  if (action === "remove" || cart[id] <= 0) delete cart[id];
  persistCart();
}
function applyPromo() {
  const code = $("promoInput").value.trim().toUpperCase();
  if (!code) { promoCode = ""; store.set("ZionPromo", ""); renderCart(); return; }
  if (!ZION_CONFIG.promos[code]) return toast("That promo code is not valid");
  promoCode = code; store.set("ZionPromo", code); renderCart();
  toast("Promo code applied");
}
function openCart() { drawer?.classList.add("open"); backdrop?.classList.add("open"); drawer?.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
function closeCart() { drawer?.classList.remove("open"); backdrop?.classList.remove("open"); drawer?.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }

/* ---------- WhatsApp + checkout ---------- */
function sendWhatsApp(message) {
  const n = waNumber();
  if (!n) return toast("Set a valid Ghana WhatsApp number in script.js"), false;
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  return true;
}
function validPhone(v) { return v.replace(/\D/g, "").length >= 9; }
function checkout() {
  const entries = Object.entries(cart);
  if (!entries.length) return toast("Your cart is empty");
  readCustomer();
  const c = customer;
  if (!c.name) return $("coName").focus(), toast("Please enter your name");
  if (!validPhone(c.phone)) return $("coPhone").focus(), toast("Please enter a valid phone number");
  if (c.method === "Delivery" && !c.location) return $("coLocation").focus(), toast("Please enter your delivery location");

  const t = totals();
  const ref = "ZT-" + localDate().replace(/-/g, "").slice(2) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const lines = entries.map(([id, q]) => `• ${products[id].name} × ${q} — ${money(products[id].price * q)}`);
  const message = [
    `Hello Zion Technologie, I would like to place an order. Ref: ${ref}`, "",
    ...lines, "",
    `Subtotal: ${money(t.sub)}`,
    t.discount ? `Promo ${promoCode}: −${money(t.discount)}` : null,
    `${c.method === "Pickup" ? "Pickup" : "Delivery (estimate)"}: ${t.free ? "Free" : money(t.delivery)}`,
    `Estimated total: ${money(t.total)}`, "",
    `Name: ${c.name}`, `Phone: ${c.phone}`,
    `Method: ${c.method}`,
    c.method === "Delivery" ? `Location: ${c.location}` : null,
    `Payment preference: ${c.payment}`,
    c.note ? `Note: ${c.note}` : null, "",
    "Please confirm stock, delivery fee and payment details."
  ].filter(x => x !== null).join("\n");

  if (!sendWhatsApp(message)) return;
  const orders = store.get("ZionOrders", []);
  orders.unshift({ ref, date: new Date().toISOString(), items: { ...cart }, total: t.total });
  store.set("ZionOrders", orders.slice(0, 20));
  cart = {}; promoCode = ""; $("promoInput").value = "";
  store.set("ZionPromo", "");
  persistCart(); closeCart();
  toast(`Order ${ref} sent. Complete it in WhatsApp.`);
}

/* ---------- filter / search / sort ---------- */
function applyFilters() {
  const term = searchTerm.toLowerCase();
  let shown = 0;
  cards.forEach(card => {
    const okCat = activeFilter === "All" ? true
      : activeFilter === "Saved" ? wishlist.includes(card.dataset.id)
      : card.dataset.category === activeFilter;
    const okSearch = !term || `${card.dataset.name} ${card.dataset.category} ${card.textContent}`.toLowerCase().includes(term);
    card.hidden = !(okCat && okSearch);
    if (!card.hidden) shown++;
  });
  emptyMsg.hidden = shown > 0;
  if (!shown && activeFilter === "Saved" && !term) emptyMsg.textContent = "You have no saved items yet. Tap the heart on any product to save it.";
  else emptyMsg.textContent = "No products match your search or filter. Try another word or choose All products.";
}
function setFilter(cat, scroll = true) {
  if (!cat) return;
  activeFilter = cat;
  document.querySelectorAll(".filter-chip").forEach(b => b.classList.toggle("active", b.dataset.filter === cat));
  applyFilters();
  if (scroll) $("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function sortProducts(v) {
  [...cards].sort((a, b) => {
    const pa = +a.dataset.price || 0, pb = +b.dataset.price || 0;
    if (v === "low") return pa - pb;
    if (v === "high") return pb - pa;
    if (v === "az") return (a.dataset.name || "").localeCompare(b.dataset.name || "");
    return (+a.dataset.id.replace(/\D/g, "")) - (+b.dataset.id.replace(/\D/g, ""));
  }).forEach(c => productGrid.appendChild(c));
}

/* ---------- search panel + menu ---------- */
function openSearch() { searchPanel?.classList.add("open"); searchPanel?.setAttribute("aria-hidden", "false"); searchInput?.focus(); }
function closeSearch() { searchPanel?.classList.remove("open"); searchPanel?.setAttribute("aria-hidden", "true"); }
function closeMenu() { mainNav?.classList.remove("open"); menuToggle?.setAttribute("aria-expanded", "false"); }

/* ---------- booking form ---------- */
const bookingDate = $("bookingDate");
if (bookingDate) bookingDate.min = localDate();
bookingForm?.addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(bookingForm), g = k => String(f.get(k) ?? "").trim();
  if (!g("name") || !g("phone") || !g("service") || !g("location")) return toast("Please complete all required booking fields");
  if (!validPhone(g("phone"))) return toast("Please enter a valid phone number");
  sendWhatsApp([
    "Hello Zion Technologie, I would like to request a service booking.", "",
    `Name: ${g("name")}`, `Phone: ${g("phone")}`, `Service: ${g("service")}`,
    `Town / area: ${g("location")}`, `Preferred date: ${g("date") || "Flexible"}`,
    `Job details: ${g("details") || "Not provided"}`, "",
    "Please contact me to confirm availability, quotation and appointment."
  ].join("\n"));
});

/* ---------- contact links + year ---------- */
const cw = $("contactWhatsapp"), n = waNumber();
if (cw) {
  if (n) { cw.href = `https://wa.me/${n}?text=${encodeURIComponent("Hello Zion Technologie, I would like to enquire about your products and services.")}`; cw.target = "_blank"; cw.rel = "noopener noreferrer"; }
  else cw.addEventListener("click", e => { e.preventDefault(); toast("Set a valid WhatsApp number in script.js"); });
}
if ($("contactEmail")) $("contactEmail").href = `mailto:${ZION_CONFIG.email}`;
if ($("footerEmail")) { $("footerEmail").href = `mailto:${ZION_CONFIG.email}`; $("footerEmail").textContent = ZION_CONFIG.email; }
if ($("year")) $("year").textContent = new Date().getFullYear();

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const add = t.closest(".add-cart");        if (add && !add.disabled) addToCart(add.dataset.id);
  const wish = t.closest("[data-wish]");     if (wish) toggleWish(wish.dataset.wish);
  const act = t.closest("#cartItems [data-action]"); if (act && !act.disabled) updateQty(act.dataset.id, act.dataset.action);
  const chip = t.closest(".filter-chip");    if (chip) setFilter(chip.dataset.filter);
  const cat = t.closest("[data-category-link]");
  if (cat) { e.preventDefault(); setFilter(cat.dataset.categoryLink); }
  const svc = t.closest("[data-service]");   if (svc && $("serviceSelect")) $("serviceSelect").value = svc.dataset.service;
  if (searchPanel?.classList.contains("open") && !t.closest("#searchPanel") && !t.closest("#searchTrigger")) closeSearch();
});
$("cartTrigger")?.addEventListener("click", openCart);
$("closeCart")?.addEventListener("click", closeCart);
backdrop?.addEventListener("click", closeCart);
$("checkoutBtn")?.addEventListener("click", checkout);
$("promoBtn")?.addEventListener("click", applyPromo);
$("promoInput")?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } });
$("clearCart")?.addEventListener("click", () => { if (confirm("Remove all items from your cart?")) { cart = {}; persistCart(); } });
["coName", "coPhone", "coMethod", "coPayment", "coLocation", "coNote"].forEach(id => $(id)?.addEventListener("input", renderCart));
$("searchTrigger")?.addEventListener("click", openSearch);
$("closeSearch")?.addEventListener("click", closeSearch);
searchInput?.addEventListener("input", e => { searchTerm = e.target.value.trim(); applyFilters(); });
$("sortSelect")?.addEventListener("change", e => sortProducts(e.target.value));
menuToggle?.addEventListener("click", () => menuToggle.setAttribute("aria-expanded", String(mainNav.classList.toggle("open"))));
mainNav?.addEventListener("click", e => { if (e.target.closest("a")) closeMenu(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeCart(); closeSearch(); closeMenu(); } });
window.addEventListener("storage", e => { if (e.key === "ZionGhanaCart") { cart = store.get("ZionGhanaCart", {}); renderCart(); } });

/* ---------- init ---------- */
renderWishlist();
renderCart();
applyFilters();