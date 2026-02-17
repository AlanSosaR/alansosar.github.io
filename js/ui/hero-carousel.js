/* =========================================
   HERO CAROUSEL — Logic (Premium)
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const carousel = document.getElementById("heroCarousel");
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll(".hero-slide"));

  // New Controls
  const prevBtn = carousel.querySelector(".nav-arrow.prev");
  const nextBtn = carousel.querySelector(".nav-arrow.next");
  const currentSlideEl = carousel.querySelector(".current-slide");
  const totalSlidesEl = carousel.querySelector(".total-slides");
  const progressFill = carousel.querySelector(".progress-fill");

  if (!slides.length) return;

  // Config
  const INTERVAL_MS = 6000;
  let currentIndex = 0;
  let timerId = null;
  let isPaused = false;

  // Init Logic
  function init() {
    // Set Total Slides Count
    if (totalSlidesEl) {
      totalSlidesEl.textContent = formatNumber(slides.length);
    }

    // Show first slide
    showSlide(0);

    // Start AutoPlay
    startAutoPlay();

    // Listeners for Arrows
    if (nextBtn) nextBtn.addEventListener("click", () => {
      stopAutoPlay(); // Pause interaction
      nextSlide();
      startAutoPlay(); // Restart
    });

    if (prevBtn) prevBtn.addEventListener("click", () => {
      stopAutoPlay();
      prevSlide();
      startAutoPlay();
    });

    // Pause on Hover / Touch
    carousel.addEventListener("mouseenter", () => isPaused = true);
    carousel.addEventListener("mouseleave", () => isPaused = false);
    carousel.addEventListener("touchstart", () => isPaused = true, { passive: true });
    carousel.addEventListener("touchend", () => isPaused = false);
  }

  // Helper: 01, 02...
  function formatNumber(num) {
    return num < 10 ? `0${num}` : num;
  }

  function showSlide(index) {
    // Wrap index
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;

    // Update State
    currentIndex = index;

    // Visual Update (Slides)
    slides.forEach((slide, i) => {
      if (i === currentIndex) {
        slide.classList.add("active");
      } else {
        slide.classList.remove("active");
      }
    });

    // Visual Update (Controls)
    updateControls();
  }

  function updateControls() {
    const realIndex = currentIndex + 1; // 1-based

    // 1. Update Number "01"
    if (currentSlideEl) {
      currentSlideEl.textContent = formatNumber(realIndex);
    }

    // 2. Update Progress Bar Width
    if (progressFill) {
      const percentage = (realIndex / slides.length) * 100;
      progressFill.style.width = `${percentage}%`;
    }
  }

  function nextSlide() {
    showSlide(currentIndex + 1);
  }

  function prevSlide() {
    showSlide(currentIndex - 1);
  }

  // Auto Play Logic
  function startAutoPlay() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (!isPaused) {
        nextSlide();
      }
    }, INTERVAL_MS);
  }

  function stopAutoPlay() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  // --- SWIPE SUPPORT (Touch) ---
  let touchStartX = 0;
  let touchEndX = 0;

  carousel.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  carousel.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const threshold = 50;
    if (touchEndX < touchStartX - threshold) {
      // Swipe Left -> Next
      stopAutoPlay();
      nextSlide();
      startAutoPlay();
    }
    if (touchEndX > touchStartX + threshold) {
      // Swipe Right -> Prev
      stopAutoPlay();
      prevSlide();
      startAutoPlay();
    }
  }

  // Run
  init();
});
