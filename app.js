(function () {
  "use strict";

  /* ---------------------------------------------------------------------------
   * EmailJS — https://dashboard.emailjs.com/admin
   *
   * Paste your real IDs in the three lines marked below (between the quotes).
   * In your EmailJS template, use: {{package_name}} {{booking_date}}
   * {{booking_time}} {{location}}
   * --------------------------------------------------------------------------- */

  // ▼▼▼ PASTE YOUR PUBLIC KEY HERE (Account → API keys → Public Key) ▼▼▼
  const EMAILJS_PUBLIC_KEY = "ZY7vg5-ClhpfVuyRx";
  // ▲▲▲ Replace your_public_key_here with your actual public key ▲▲▲

  // ▼▼▼ PASTE YOUR SERVICE ID HERE (Email Services → your service → Service ID) ▼▼▼
  const EMAILJS_SERVICE_ID = "service_mskmg51";
  // ▲▲▲ Replace your_service_id_here with your actual service ID ▲▲▲

  // ▼▼▼ PASTE YOUR TEMPLATE ID HERE (Email Templates → your template → Template ID) ▼▼▼
  const EMAILJS_TEMPLATE_ID = "template_s148cef";
  // ▲▲▲ Replace your_template_id_here with your actual template ID ▲▲▲

  const STORAGE_KEY = "filmy-bookings";

  /** @type {Array<{ id: string; package: string; date: string; time: string; address: string; createdAt: string }>} */
  let bookings = [];

  const form = document.getElementById("booking-form");
  const dateInput = document.getElementById("date");
  const formError = document.getElementById("form-error");
  const bookingsEmpty = document.getElementById("bookings-empty");
  const bookingsList = document.getElementById("bookings-list");
  const submitBtn = document.getElementById("submit-btn");
  const confirmation = document.getElementById("confirmation");
  const summaryPackage = document.getElementById("summary-package");
  const summaryDate = document.getElementById("summary-date");
  const summaryTime = document.getElementById("summary-time");
  const summaryAddress = document.getElementById("summary-address");

  const PACKAGE_LABELS = {
    starter: "Starter · iPhone",
    pro: "Pro · DSLR",
    elite: "Elite · Drone + cinematic",
  };

  function isEmailJsConfigured() {
    const pub = String(EMAILJS_PUBLIC_KEY || "").trim();
    const svc = String(EMAILJS_SERVICE_ID || "").trim();
    const tpl = String(EMAILJS_TEMPLATE_ID || "").trim();
    if (!pub || !svc || !tpl) return false;
    if (pub === "your_public_key_here") return false;
    if (svc === "your_service_id_here") return false;
    if (tpl === "your_template_id_here") return false;
    return true;
  }

  function initEmailJs() {
    if (typeof emailjs === "undefined") return;
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  /** Sends `emailjs.send(service, template, params)` with your template variable names. */
  function sendBookingEmail(booking) {
    const templateParams = {
      package_name: formatPackage(booking.package),
      booking_date: formatDisplayDate(booking.date),
      booking_time: formatDisplayTime(booking.time),
      location: booking.address,
    };
    return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
  }

  function isValidBooking(b) {
    if (!b || typeof b !== "object") return false;
    const id = String(b.id || "").trim();
    const date = String(b.date || "").trim();
    const time = String(b.time || "").trim();
    const address = String(b.address || "").trim();
    return id.length > 0 && date.length > 0 && time.length > 0 && address.length > 0;
  }

  function loadBookings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.filter(isValidBooking);
    } catch {
      return [];
    }
  }

  function saveBookings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch {
      /* quota or private mode */
    }
  }

  function setMinDate() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    dateInput.min = `${y}-${m}-${d}`;
  }

  function showError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  function clearError() {
    formError.textContent = "";
    formError.hidden = true;
  }

  function setFormDisabled(disabled) {
    const controls = form.querySelectorAll("input, textarea, button");
    controls.forEach((el) => {
      el.disabled = disabled;
    });
  }

  function setLoading(loading) {
    submitBtn.classList.toggle("is-loading", loading);
    submitBtn.setAttribute("aria-busy", loading ? "true" : "false");
    const label = submitBtn.querySelector(".btn__label");
    if (label) label.setAttribute("aria-hidden", loading ? "true" : "false");
  }

  function hideConfirmation() {
    confirmation.classList.remove("is-visible");
    confirmation.hidden = true;
  }

  function showConfirmation(booking) {
    summaryPackage.textContent = formatPackage(booking.package);
    summaryDate.textContent = formatDisplayDate(booking.date);
    summaryTime.textContent = formatDisplayTime(booking.time);
    summaryAddress.textContent = booking.address;

    confirmation.hidden = false;
    confirmation.offsetHeight;
    requestAnimationFrame(() => {
      confirmation.classList.add("is-visible");
    });

    const heading = document.getElementById("confirmation-heading");
    if (heading) heading.focus({ preventScroll: true });
    confirmation.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function normalizePackage(value) {
    if (value === "pro" || value === "elite") return value;
    return "starter";
  }

  function formatPackage(value) {
    return PACKAGE_LABELS[normalizePackage(value)] || PACKAGE_LABELS.starter;
  }

  function formatDisplayDate(isoDate) {
    const parts = isoDate.split("-").map(Number);
    const y = parts[0];
    const mo = parts[1];
    const da = parts[2];
    const date = new Date(y, mo - 1, da);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDisplayTime(time24) {
    const p = String(time24).split(":");
    const h = Number(p[0]);
    const min = p[1] || "00";
    if (Number.isNaN(h)) return time24;
    const d = new Date();
    d.setHours(h, Number(min), 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function sortedBookingsNewestFirst() {
    return bookings.slice().sort((a, b) => {
      const ta = Date.parse(a.createdAt) || 0;
      const tb = Date.parse(b.createdAt) || 0;
      return tb - ta;
    });
  }

  function renderBookings() {
    if (bookings.length === 0) {
      bookingsEmpty.hidden = false;
      bookingsList.hidden = true;
      bookingsList.innerHTML = "";
      return;
    }

    bookingsEmpty.hidden = true;
    bookingsList.hidden = false;

    bookingsList.innerHTML = sortedBookingsNewestFirst()
      .map(
        (b) =>
          `<li class="booking-card">
          <p class="booking-card__package">${escapeHtml(formatPackage(b.package))}</p>
          <p class="booking-card__when">${escapeHtml(formatDisplayDate(b.date))} <span class="booking-card__time">· ${escapeHtml(formatDisplayTime(b.time))}</span></p>
          <p class="booking-card__address">${escapeHtml(b.address)}</p>
        </li>`
      )
      .join("");
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function validateInputs(date, time, address) {
    if (!date || !time || !address) {
      return "Add your shoot date, call time, and location.";
    }
    const dateObj = new Date(`${date}T12:00:00`);
    if (Number.isNaN(dateObj.getTime())) {
      return "Choose a valid shoot date.";
    }
    const min = dateInput.min;
    if (min && date < min) {
      return "Shoot date can’t be in the past.";
    }
    if (!/^\d{1,2}:\d{2}/.test(time)) {
      return "Choose a valid call time.";
    }
    return "";
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError();

    if (typeof emailjs === "undefined") {
      showError("Email service didn’t load. Check your connection and refresh the page.");
      return;
    }

    if (!isEmailJsConfigured()) {
      showError(
        "Replace your_public_key_here, your_service_id_here, and your_template_id_here at the top of app.js (see paste comments)."
      );
      return;
    }

    const fd = new FormData(form);
    const pkg = normalizePackage(String(fd.get("package") || ""));
    const date = String(fd.get("date") || "").trim();
    const time = String(fd.get("time") || "").trim();
    const address = String(fd.get("address") || "").trim();

    const err = validateInputs(date, time, address);
    if (err) {
      showError(err);
      return;
    }

    const booking = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      package: pkg,
      date,
      time,
      address,
      createdAt: new Date().toISOString(),
    };

    hideConfirmation();
    setLoading(true);
    setFormDisabled(true);

    sendBookingEmail(booking)
      .then(() => {
        bookings.push(booking);
        saveBookings();
        renderBookings();

        form.reset();
        setMinDate();
        document.querySelector('input[name="package"][value="starter"]').checked = true;

        showConfirmation(booking);
      })
      .catch(() => {
        showError(
          "We couldn’t send the booking email. Check your EmailJS template and network, then try again."
        );
      })
      .finally(() => {
        setLoading(false);
        setFormDisabled(false);
      });
  });

  bookings = loadBookings();
  setMinDate();
  renderBookings();

  if (isEmailJsConfigured()) {
    initEmailJs();
  }
})();
