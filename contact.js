/* ZION TECHNOLOGIE — CONTACT PAGE INTERACTIONS */
(() => {
  "use strict";

  const WHATSAPP_NUMBER = "233595856187";

  const menuButton = document.getElementById("mobileMenu");
  const nav = document.getElementById("navigation");
  const navWrap = document.querySelector(".header-nav");

  if (menuButton && navWrap) {
    menuButton.addEventListener("click", () => {
      const isOpen = navWrap.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      menuButton.textContent = isOpen ? "×" : "☰";
    });

    nav?.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navWrap.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation");
        menuButton.textContent = "☰";
      });
    });
  }

  const tabs = [...document.querySelectorAll("[data-form-tab]")];
  const panels = [...document.querySelectorAll("[data-form-panel]")];

  function activateForm(type, updateUrl = false) {
    tabs.forEach(tab => {
      const active = tab.dataset.formTab === type;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    panels.forEach(panel => {
      const active = panel.dataset.formPanel === type;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("type", type);
      window.history.replaceState({}, "", url);
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => activateForm(tab.dataset.formTab, true));
  });

  const params = new URLSearchParams(window.location.search);
  const requestedType = params.get("type");
  activateForm(requestedType === "booking" ? "booking" : "request");

  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = localToday;
  });

  function fieldValue(form, name) {
    const field = form.elements.namedItem(name);
    return field ? String(field.value).trim() : "";
  }

  function buildMessage(form, type) {
    const lines = [
      "Hello Zion Technologie,",
      "",
      type === "booking" ? "I would like to book a service." : "I would like to request a service.",
      "",
      `Name: ${fieldValue(form, "name")}`,
      `Phone: ${fieldValue(form, "phone")}`,
      `Email: ${fieldValue(form, "email") || "Not provided"}`,
      `Location: ${fieldValue(form, "location")}`,
      `Service: ${fieldValue(form, "service")}`
    ];

    if (type === "booking") {
      lines.push(
        `Preferred date: ${fieldValue(form, "date")}`,
        `Preferred time: ${fieldValue(form, "time")}`
      );
    }

    const details = fieldValue(form, "details");
    if (details) lines.push(`Additional details: ${details}`);

    lines.push("", "Please contact me regarding this request.", "Thank you.");
    return lines.join("\n");
  }

  panels.forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      const type = form.dataset.formPanel;
      const message = buildMessage(form, type);
      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    });
  });

  const year = document.getElementById("currentYear");
  if (year) year.textContent = new Date().getFullYear();
})();

