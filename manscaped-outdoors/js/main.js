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
     mailto body carries them today and a real backend can consume them later. */
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

  /* ---------- Contact form (mailto fallback) ----------
     Works with no backend on static hosting. Future: point this at Resend /
     a Formspree endpoint and drop the mailto build. File uploads require the
     real backend — mailto cannot attach files, so we only list filenames. */
  var form = document.getElementById("estimateForm");
  var note = document.getElementById("formNote");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var to = form.getAttribute("data-mailto");
      // Read fields defensively so this works whether the form uses a single
      // "name" field or split "firstName" / "lastName" fields.
      function fieldVal(nm) {
        var el = form.elements[nm];
        return el ? el.value.trim() : "";
      }
      var name =
        (fieldVal("firstName") + " " + fieldVal("lastName")).trim() ||
        fieldVal("name");

      // Collect any attached file names (can't attach via mailto).
      var mediaEl = form.elements["media"];
      var fileNames = "";
      if (mediaEl && mediaEl.files && mediaEl.files.length) {
        var names = [];
        for (var i = 0; i < mediaEl.files.length; i++) names.push(mediaEl.files[i].name);
        fileNames = names.join(", ");
      }

      var data = {
        name: name,
        email: fieldVal("email"),
        phone: fieldVal("phone"),
        location: fieldVal("location"),
        service: fieldVal("service"),
        budget: fieldVal("budget"),
        timeline: fieldVal("timeline"),
        message: fieldVal("message"),
      };

      var subject =
        "New project inquiry: " + data.service + " (" + data.name + ")";
      var lines = [
        "Name: " + data.name,
        "Email: " + data.email,
        "Phone: " + (data.phone || "-"),
        "Location / nearest community: " + (data.location || "-"),
        "Project type: " + data.service,
        "Approximate budget: " + (data.budget || "-"),
        "Desired timeline: " + (data.timeline || "-"),
        "",
        "Project description:",
        data.message,
        "",
        fileNames
          ? "Photos/video selected (please attach when your email opens): " + fileNames
          : "Photos/video: none attached",
        "",
        "--- Lead source ---",
        "Landing page: " + (fieldVal("landingPage") || "-"),
        "Referrer: " + (fieldVal("referrer") || "-"),
        "UTM source: " + (fieldVal("utmSource") || "-"),
        "UTM medium: " + (fieldVal("utmMedium") || "-"),
        "UTM campaign: " + (fieldVal("utmCampaign") || "-"),
      ];
      var body = lines.join("\n") + "\n";

      var href =
        "mailto:" + to +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      window.location.href = href;

      if (note) {
        note.textContent =
          "Thanks for reaching out. We're opening your email app to send the request. " +
          "We'll review your details and follow up with the best next step. If nothing " +
          "happens, email us at " + to + ".";
        note.className = "form-note is-success";
      }
    });
  }
})();
