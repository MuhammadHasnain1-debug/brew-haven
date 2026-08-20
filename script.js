"use strict";

/* ---------- helpers ---------- */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;

/* ============================================================ NAV */
const nav = $("#nav");
const navLinks = $("#navLinks");
const navToggle = $("#navToggle");

function onScrollNav() {
  nav.classList.toggle("scrolled", window.scrollY > 40);
}
onScrollNav();

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  navToggle.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
});
$$(".nav-links a").forEach(a =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  })
);

/* ============================================================ ENTRANCE (hero) */
function playHero() {
  $$(".rise").forEach(el => {
    const d = parseInt(el.dataset.d || "0", 10) * 110;
    setTimeout(() => el.classList.add("in"), 120 + d);
  });
}
if (reduce) $$(".rise").forEach(el => el.classList.add("in"));
else requestAnimationFrame(playHero);
// fallback in case rAF is throttled
setTimeout(() => $$(".rise").forEach(el => el.classList.add("in")), 700);

/* ============================================================ REVEAL on scroll */
const revealEls = $$(".reveal");

function revealSweep() {
  const trigger = window.innerHeight * 0.9;
  revealEls.forEach(el => {
    if (el.classList.contains("in")) return;
    if (el.getBoundingClientRect().top < trigger) {
      el.classList.add("in");
      if (el.classList.contains("band")) {} // no-op
      maybeCount(el);
    }
  });
}

if (reduce) {
  revealEls.forEach(el => { el.classList.add("in"); maybeCount(el); });
} else if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        maybeCount(e.target);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
  revealEls.forEach(el => io.observe(el));
  // safety sweeps for panes that don't fire IO reliably
  window.addEventListener("scroll", revealSweep, { passive: true });
  setTimeout(revealSweep, 300);
  setTimeout(revealSweep, 900);
} else {
  window.addEventListener("scroll", revealSweep, { passive: true });
  revealSweep();
}

/* ============================================================ COUNT-UP stats */
function maybeCount(scope) {
  const nums = scope.matches?.(".stat") ? [scope.querySelector(".stat-num")]
             : $$(".stat-num", scope);
  nums.filter(Boolean).forEach(runCount);
}
function runCount(el) {
  if (el.dataset.done) return;
  el.dataset.done = "1";
  const target = parseFloat(el.dataset.count);
  const decimal = el.dataset.decimal === "1";
  const plain = el.dataset.plain === "1"; // year → no formatting
  if (reduce) { el.textContent = format(target, decimal, plain); return; }
  const dur = 1400, t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = format(target * eased, decimal, plain);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = format(target, decimal, plain);
  }
  requestAnimationFrame(tick);
}
function format(v, decimal, plain) {
  if (plain) return String(Math.round(v));
  if (decimal) return (v / 10).toFixed(1);   // 49 -> 4.9
  return String(Math.round(v));
}

/* ============================================================ PARALLAX */
const heroBg = $("#heroBg");
const bandBg = $("#bandBg");
const band = $("#band");
if (!reduce) {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (heroBg && y < window.innerHeight) heroBg.style.transform = `translateY(${y * 0.28}px)`;
      if (bandBg && band) {
        const r = band.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) {
          bandBg.style.transform = `translateY(${(r.top - window.innerHeight) * -0.08}px)`;
        }
      }
      ticking = false;
    });
  }, { passive: true });
}

/* ============================================================ 3D TILT (menu cards) */
if (finePointer && !reduce) {
  $$("[data-tilt]").forEach(card => {
    let raf = 0;
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform =
          `perspective(900px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg) translateY(-8px)`;
      });
    });
    card.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      card.style.transform = "";
    });
  });
}

/* ============================================================ ORDER form */
const drinks = $$(".drink");
const totalAmount = $("#totalAmount");
const btnTotal = $("#btnTotal");

function orderTotal() {
  let sum = 0;
  drinks.forEach(d => {
    const qty = parseInt($(".qty", d).textContent, 10) || 0;
    sum += qty * (parseInt(d.dataset.price, 10) || 0);
  });
  return sum;
}
function renderTotal() {
  const sum = orderTotal();
  const txt = "Rs " + sum.toLocaleString("en-US");
  totalAmount.textContent = txt;
  btnTotal.textContent = txt;
}

drinks.forEach(d => {
  const qtyEl = $(".qty", d);
  $$(".step", d).forEach(btn => {
    btn.addEventListener("click", () => {
      let q = parseInt(qtyEl.textContent, 10) || 0;
      q = Math.max(0, Math.min(20, q + parseInt(btn.dataset.step, 10)));
      qtyEl.textContent = q;
      d.classList.toggle("active", q > 0);
      renderTotal();
    });
  });
});

/* toast */
const toast = $("#toast");
let toastTimer;
function showToast(html) {
  toast.innerHTML = html;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
}

/* submit */
const form = $("#orderForm");
form.addEventListener("submit", e => {
  e.preventDefault();
  const total = orderTotal();
  const name = $("#oName");
  const phone = $("#oPhone");

  [name, phone].forEach(f => f.classList.remove("err"));

  if (total === 0) {
    showToast("Add at least one drink to your order ☕");
    $("#order").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    return;
  }
  let bad = false;
  if (!name.value.trim()) { name.classList.add("err"); bad = true; }
  if (!phone.value.trim()) { phone.classList.add("err"); bad = true; }
  if (bad) { showToast("Just need your name and phone to confirm."); return; }

  showToast(`Order placed — <b>Rs ${total.toLocaleString("en-US")}</b>. We'll ring you shortly! ☕`);
  form.reset();
  drinks.forEach(d => { $(".qty", d).textContent = "0"; d.classList.remove("active"); });
  renderTotal();
});

renderTotal();

/* keep nav in sync */
window.addEventListener("scroll", onScrollNav, { passive: true });
