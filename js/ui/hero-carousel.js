/* =========================================
   HERO CAROUSEL — Logic (Premium)
   Renderiza slides desde site_settings
   ========================================= */

async function initHeroCarousel() {
  const carousel = document.getElementById("heroCarousel");
  if (!carousel) return;

  const wrapper = carousel.querySelector(".hero-slides-wrapper");
  const heroContent = carousel.querySelector(".hero-content");
  const totalSlidesEl = carousel.querySelector(".total-slides");
  const currentSlideEl = carousel.querySelector(".current-slide");
  const progressFill = carousel.querySelector(".progress-fill");
  const prevBtn = carousel.querySelector(".nav-arrow.prev");
  const nextBtn = carousel.querySelector(".nav-arrow.next");

  // Cargar settings
  const settings = await window.loadSiteSettings();
  const slides = settings.hero_slides || [];

  // Renderizar slides
  wrapper.innerHTML = "";
  slides.forEach((slide, i) => {
    const div = document.createElement("div");
    div.className = "hero-slide" + (i === 0 ? " active" : "");
    div.innerHTML = `
      <img src="${slide.url}" alt="${slide.titulo || 'Slide ' + (i + 1)}" loading="${i === 0 ? 'eager' : 'lazy'}">
      <div class="hero-overlay-gradient"></div>
    `;
    wrapper.appendChild(div);
  });

  // Mostrar título/subtítulo del primer slide
  if (heroContent && slides.length > 0) {
    const first = slides[0];
    const h1 = heroContent.querySelector("h1");
    const p = heroContent.querySelector("p");
    if (h1) h1.textContent = first.titulo || "La esencia de Honduras en cada sorbo";
    if (p) p.textContent = first.subtitulo || "Café de altura cultivado a 1100 msnm, fresco y directo de la finca.";

    // Actualizar título/subtítulo al cambiar slide
    const origShowSlide = showSlide;
    const _origUpdate = updateControls;
  }

  const slidesArray = Array.from(wrapper.querySelectorAll(".hero-slide"));
  if (!slidesArray.length) return;

  // Config
  const INTERVAL_MS = 6000;
  let currentIndex = 0;
  let timerId = null;
  let isPaused = false;

  function formatNumber(num) {
    return num < 10 ? `0${num}` : num;
  }

  function showSlide(index) {
    if (index >= slidesArray.length) index = 0;
    if (index < 0) index = slidesArray.length - 1;
    currentIndex = index;

    slidesArray.forEach((slide, i) => {
      slide.classList.toggle("active", i === currentIndex);
    });

    // Actualizar hero content con título/subtítulo del slide actual
    if (heroContent && slides[currentIndex]) {
      const s = slides[currentIndex];
      const h1 = heroContent.querySelector("h1");
      const p = heroContent.querySelector("p");
      if (h1) h1.textContent = s.titulo || "La esencia de Honduras en cada sorbo";
      if (p) p.textContent = s.subtitulo || "Café de altura cultivado a 1100 msnm, fresco y directo de la finca.";
    }

    updateControls();
  }

  function updateControls() {
    const realIndex = currentIndex + 1;
    if (currentSlideEl) currentSlideEl.textContent = formatNumber(realIndex);
    if (totalSlidesEl) totalSlidesEl.textContent = formatNumber(slidesArray.length);
    if (progressFill) {
      const percentage = (realIndex / slidesArray.length) * 100;
      progressFill.style.width = `${percentage}%`;
    }
  }

  function nextSlide() { showSlide(currentIndex + 1); }
  function prevSlide() { showSlide(currentIndex - 1); }

  function startAutoPlay() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => { if (!isPaused) nextSlide(); }, INTERVAL_MS);
  }

  function stopAutoPlay() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  // Init
  if (totalSlidesEl) totalSlidesEl.textContent = formatNumber(slidesArray.length);
  showSlide(0);
  startAutoPlay();

  if (nextBtn) nextBtn.addEventListener("click", () => { stopAutoPlay(); nextSlide(); startAutoPlay(); });
  if (prevBtn) prevBtn.addEventListener("click", () => { stopAutoPlay(); prevSlide(); startAutoPlay(); });

  carousel.addEventListener("mouseenter", () => isPaused = true);
  carousel.addEventListener("mouseleave", () => isPaused = false);
  carousel.addEventListener("touchstart", () => isPaused = true, { passive: true });
  carousel.addEventListener("touchend", () => isPaused = false);

  // Swipe
  let touchStartX = 0, touchEndX = 0;
  carousel.addEventListener("touchstart", (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  carousel.addEventListener("touchend", (e) => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); }, { passive: true });

  function handleSwipe() {
    const threshold = 50;
    if (touchEndX < touchStartX - threshold) { stopAutoPlay(); nextSlide(); startAutoPlay(); }
    if (touchEndX > touchStartX + threshold) { stopAutoPlay(); prevSlide(); startAutoPlay(); }
  }
}

// Auto-init cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initHeroCarousel());
} else {
  initHeroCarousel();
}
