/* ============================================================
   Manscaped Outdoors — interactions
   ============================================================ */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Footer year ---------- */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header scroll state ----------
     Subpages set data-solid on the header so it stays solid (never transparent),
     since they have no video hero behind it. */
  var header = document.querySelector("[data-header]");
  function onScroll() {
    if (!header) return;
    if (header.hasAttribute("data-solid")) {
      header.classList.add("is-scrolled");
      return;
    }
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Same-page hash links ----------
     The deployed copy carries <base href="/manscaped-outdoors/">, which makes
     bare "#id" links resolve against the base (the home page) instead of the
     current page — so the Services quick-nav would jump home. Reading the RAW
     href attribute and scrolling by id bypasses base-href resolution, so these
     links work identically with or without a <base> tag, and under cleanUrls. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (!a) return;
    var raw = a.getAttribute("href");
    if (!raw || raw.charAt(0) !== "#" || raw.length < 2) return;
    var target = document.getElementById(raw.slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    if (history.pushState) {
      history.pushState(null, "", window.location.pathname + window.location.search + raw);
    }
    if (typeof closeNav === "function") closeNav();
  });

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("primaryNav");
  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.classList.remove("is-active");
    navToggle.setAttribute("aria-expanded", "false");
  }
  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.classList.toggle("is-active", open);
      navToggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealTargets = document.querySelectorAll(
    ".section__head, .intro__inner, .philosophy__inner, .service-card, .portfolio__item, .area__media, .area__text, .about-story__media, .about-story__body, .about-value, .testimonial, .contact__form, .contact__intro"
  );
  revealTargets.forEach(function (el, i) {
    el.setAttribute("data-reveal", "");
    el.style.transitionDelay = (i % 4) * 80 + "ms";
  });

  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxClose = document.getElementById("lightboxClose");
  var lastFocused = null;

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lastFocused = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (lightboxClose) lightboxClose.focus();
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
    document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  var gallery = document.querySelector("[data-lightbox-gallery]");
  if (gallery) {
    gallery.addEventListener("click", function (e) {
      var item = e.target.closest(".portfolio__item");
      if (!item) return;
      var img = item.querySelector("img");
      openLightbox(item.getAttribute("data-full"), img ? img.alt : "");
    });
  }
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (lightbox && lightbox.classList.contains("is-open")) closeLightbox();
      closeNav();
    }
  });

  /* ---------- Before / After slider ---------- */
  document.querySelectorAll("[data-ba]").forEach(function (ba) {
    var range = ba.querySelector(".ba__range");
    if (!range) return;
    var beforeTag = ba.querySelector(".ba__tag--before");
    var afterTag = ba.querySelector(".ba__tag--after");
    function update() {
      var v = +range.value;
      ba.style.setProperty("--pos", v + "%");
      // Only show a label when its image is actually visible.
      // pos=100 => before fills the frame; pos=0 => after fills the frame.
      if (beforeTag) beforeTag.style.opacity = v < 8 ? "0" : "1";
      if (afterTag) afterTag.style.opacity = v > 92 ? "0" : "1";
    }
    range.addEventListener("input", update);
    update();
  });

  /* ---------- Lead-source tracking ----------
     Capture landing page, referrer, and UTM params into hidden fields so the
     webhook payload can carry them into GHL as the lead source. */
  (function captureLeadSource() {
    var form = document.getElementById("estimateForm");
    if (!form) return;
    var params = new URLSearchParams(window.location.search);
    function setHidden(id, val) {
      var el = document.getElementById(id);
      if (el) el.value = val || "";
    }
    setHidden("landingPage", window.location.href);
    setHidden("referrer", document.referrer);
    setHidden("utmSource", params.get("utm_source"));
    setHidden("utmMedium", params.get("utm_medium"));
    setHidden("utmCampaign", params.get("utm_campaign"));
  })();

  /* ---------- Success modal ----------
     Shown after the contact form posts successfully. Mirrors the lightbox
     pattern: is-open class, body scroll lock, focus restored on close. */
  var successModal = document.getElementById("successModal");
  var modalLastFocused = null;

  function openSuccessModal() {
    if (!successModal) return;
    modalLastFocused = document.activeElement;
    successModal.classList.add("is-open");
    successModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var closeBtn = successModal.querySelector(".modal__close");
    if (closeBtn && closeBtn.focus) closeBtn.focus();
  }

  function closeSuccessModal() {
    if (!successModal) return;
    successModal.classList.remove("is-open");
    successModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (modalLastFocused && modalLastFocused.focus) modalLastFocused.focus();
  }

  if (successModal) {
    successModal.addEventListener("click", function (e) {
      /* backdrop click, or either close control */
      if (e.target === successModal || e.target.closest("[data-modal-dismiss], .modal__close")) {
        closeSuccessModal();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && successModal.classList.contains("is-open")) {
        closeSuccessModal();
      }
    });
  }

  /* ---------- Contact form -> GoHighLevel inbound webhook ----------
     POSTs the qualification fields to a GHL workflow (Website Contact Form to
     Lead) that creates the contact, opens an opportunity in the Manscaped Sales
     pipeline, and emails the team. Keys must match the webhook's captured
     sample. */
  var GHL_WEBHOOK_URL =
    "https://services.leadconnectorhq.com/hooks/2MVEWGtchrrU6VUrsT1u/webhook-trigger/bc9b3995-11eb-42e7-b28f-7695e7c6296a";
  var form = document.getElementById("estimateForm");
  var note = document.getElementById("formNote");
  if (form) {
    var submitBtn = form.querySelector('[type="submit"]');
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      function fieldVal(nm) {
        var el = form.elements[nm];
        return el ? el.value.trim() : "";
      }

      var leadSource = [
        "Landing page: " + (fieldVal("landingPage") || "-"),
        "Referrer: " + (fieldVal("referrer") || "-"),
        "utm_source=" + (fieldVal("utmSource") || "-"),
        "utm_medium=" + (fieldVal("utmMedium") || "-"),
        "utm_campaign=" + (fieldVal("utmCampaign") || "-"),
      ].join(" | ");

      // Lower bound of the selected budget range, sent so GHL can set the
      // opportunity value to a conservative (minimum) forecast figure.
      var BUDGET_MIN = {
        "Under $10,000": 0,
        "$10,000-$25,000": 10000,
        "$25,000-$50,000": 25000,
        "$50,000-$100,000": 50000,
        "$100,000+": 100000,
        "Not Sure Yet": 0,
      };
      var budgetVal = fieldVal("budget");
      var budgetMin = BUDGET_MIN.hasOwnProperty(budgetVal) ? BUDGET_MIN[budgetVal] : 0;

      var payload = {
        first_name: fieldVal("firstName"),
        last_name: fieldVal("lastName"),
        email: fieldVal("email"),
        phone: fieldVal("phone"),
        project_type: fieldVal("service"),
        project_location: fieldVal("location"),
        budget_range: budgetVal,
        budget_min: budgetMin,
        desired_timeline: fieldVal("timeline"),
        project_description: fieldVal("message"),
        lead_source_detail: leadSource,
        source: "Website Contact Form",
      };

      if (submitBtn) submitBtn.disabled = true;
      if (note) {
        note.textContent = "Sending your request...";
        note.className = "form-note";
      }

      fetch(GHL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Bad response " + res.status);
          form.reset();
          if (note) {
            note.textContent = "";
            note.className = "form-note";
          }
          openSuccessModal();
        })
        .catch(function () {
          if (note) {
            note.textContent =
              "Something went wrong sending your request. Please call (706) 903-9564 " +
              "or email sales@manscapedoutdoors.com and we'll take care of you.";
            note.className = "form-note is-error";
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();
