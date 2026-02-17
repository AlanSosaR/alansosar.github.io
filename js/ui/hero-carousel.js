/* =========================================
   HERO CAROUSEL — Logic (Vanilla JS)
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  initM3HeroCarousel();
});

function initM3HeroCarousel() {
  const carousel = document.getElementById('heroCarousel');
  const slides = document.querySelectorAll('.hero-slide');
  const indicatorsContainer = document.querySelector('.carousel-indicators');

  if (!carousel || !slides.length) return;

  const INTERVAL_MS = 6000;
  let currentIndex = 0;
  let timerId = null;
  let isPaused = false;

  // 1. Build Indicators
  if (indicatorsContainer) {
    indicatorsContainer.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = `indicator-dot ${i === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Ir a slide ${i + 1}`);
      dot.onclick = () => goToSlide(i);
      indicatorsContainer.appendChild(dot);
    });
  }

  const dots = document.querySelectorAll('.indicator-dot');

  // 2. Navigation Logic
  function goToSlide(index) {
    // Loop
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;

    // Update UI
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    slides[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');

    currentIndex = index;
    resetAutoPlay();
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  // 3. Auto Play with Pause
  function startAutoPlay() {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      if (!isPaused) nextSlide();
    }, INTERVAL_MS);
  }

  function stopAutoPlay() {
    if (timerId) clearInterval(timerId);
  }

  function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  // Interaction Pause
  carousel.addEventListener('mouseenter', () => isPaused = true);
  carousel.addEventListener('mouseleave', () => isPaused = false);
  carousel.addEventListener('touchstart', () => isPaused = true, { passive: true });
  carousel.addEventListener('touchend', () => {
    isPaused = false;
    resetAutoPlay();
  }, { passive: true });

  // 4. Mobile Swipe Support
  let touchStartX = 0;
  let touchEndX = 0;

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const threshold = 50;
    if (touchEndX < touchStartX - threshold) {
      nextSlide(); // Left swipe -> Next
    } else if (touchEndX > touchStartX + threshold) {
      goToSlide(currentIndex - 1); // Right swipe -> Prev
    }
  }

  // Start
  startAutoPlay();
}
