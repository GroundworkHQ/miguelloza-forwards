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

  /* ---------- Hero video: slow it down + respect reduced motion ----------
     The clip is a rotating aerial orbit; at full speed the rotation (and the
     boomerang direction change) is dizzying. Playing it slower reads as calm,
     ambient motion. Tune HERO_SPEED (0.5 = half speed) to taste. */
  var HERO_SPEED = 0.8;
  var heroVideo = document.querySelector("[data-hero-video]");
  if (heroVideo) {
    if (prefersReducedMotion) {
      // Show the poster frame only; don't autoplay motion.
      try {
        heroVideo.removeAttribute("autoplay");
        heroVideo.pause();
      } catch (e) {}
    } else {
      var applyHeroSpeed = function () {
        try { heroVideo.playbackRate = HERO_SPEED; } catch (e) {}
      };
      applyHeroSpeed();
      // playbackRate can reset if the element re-loads; reassert on key events.
      heroVideo.addEventListener("loadedmetadata", applyHeroSpeed);
      heroVideo.addEventListener("play", applyHeroSpeed);
    }
  }

  /* ---------- Reveal on scroll ---------- */
  var revealTargets = document.querySelectorAll(
    ".section__head, .service-card, .portfolio__item, .area__media, .area__text, .contact__form, .contact__intro"
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

  /* ---------- Contact form (mailto fallback) ----------
     Works with no backend on GitHub Pages. Future: point this
     at Resend / a Formspree endpoint and drop the mailto build. */
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
      var data = {
        name: name,
        email: fieldVal("email"),
        phone: fieldVal("phone"),
        service: fieldVal("service"),
        message: fieldVal("message"),
      };
      var subject = "Estimate request — " + data.service + " (" + data.name + ")";
      var body =
        "Name: " + data.name + "\n" +
        "Email: " + data.email + "\n" +
        "Phone: " + (data.phone || "-") + "\n" +
        "Project type: " + data.service + "\n\n" +
        data.message + "\n";
      var href =
        "mailto:" + to +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      window.location.href = href;

      if (note) {
        note.textContent =
          "Opening your email app to send the request. If nothing happens, email us at " + to + ".";
        note.className = "form-note is-success";
      }
    });
  }
})();
