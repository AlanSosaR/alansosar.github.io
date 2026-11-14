/* ==========================================================================
   CAFÉ CORTERO — Módulo de Maquila y Tueste (Vanilla JS ES6+)
   Gestión de Selección de Etapas, Nivel de Tueste, Molienda,
   Cálculo en Tiempo Real, Sincronización de Barra Inferior y Carrito
   ========================================================================== */

(function () {
  'use strict';

  // PRECIOS POR LIBRA (Lempiras)
  const PRICING = {
    trillado: 3.00,
    tostado: 7.00,
    molido: 3.00
  };

  // CATÁLOGO OFICIAL DE SERVICIOS EN SUPABASE (UUIDs de la tabla products)
  const SERVICE_CATALOG = {
    trillado: {
      id: '00000000-0000-4000-8000-000000000001',
      baseName: 'Servicio de Trillado',
      img: '/imagenes/clasificacion.png',
      price: 3.00,
      grind: 'En grano'
    },
    tostado: {
      id: '00000000-0000-4000-8000-000000000002',
      baseName: 'Servicio de Tostado',
      img: '/imagenes/machine.png',
      price: 7.00,
      grind: 'En grano'
    },
    molido: {
      id: '00000000-0000-4000-8000-000000000003',
      baseName: 'Servicio de Molido',
      img: '/imagenes/smart-factory.png',
      price: 3.00,
      grind: 'Molido'
    }
  };

  // ESTADO INTERNO DEL MÓDULO
  const state = {
    services: {
      trillado: false,
      tostado: true,   // Activo por defecto
      molido: false
    },
    suboptions: {
      tueste: 'Medio',             // Claro | Medio | Oscuro
      molienda: 'Filtro / V60'     // Filtro / V60 | Prensa Francesa | Espresso
    },
    pounds: 1,                     // 1 lb por defecto
    activeTab: 'cafes'             // 'cafes' | 'maquila'
  };

  /* ==========================================================================
     HELPERS DEL DOM
     ========================================================================== */
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  function formatMoney(amount) {
    return `L ${Number(amount || 0).toFixed(2)}`;
  }

  function isCurrentUserAdmin() {
    try {
      const u = window.currentUser || JSON.parse(localStorage.getItem('cortero_user') || 'null');
      return Boolean(u && u.rol === 'admin');
    } catch {
      return false;
    }
  }

  function showSnackMessage(msg, isWarn = false) {
    const snackbar = $('snackbar');
    if (!snackbar) {
      alert(msg);
      return;
    }
    snackbar.textContent = msg;
    snackbar.className = `snackbar show ${isWarn ? 'warn' : 'success'}`;
    setTimeout(() => {
      snackbar.classList.remove('show', 'warn', 'success');
    }, 3500);
  }

  /* ==========================================================================
     CÁLCULO Y RESUMEN DINÁMICO
     ========================================================================== */
  function calculateTotal() {
    let ratePerLb = 0;
    const stages = [];

    if (state.services.trillado) {
      ratePerLb += PRICING.trillado;
      stages.push('Trillado');
    }

    if (state.services.tostado) {
      ratePerLb += PRICING.tostado;
      stages.push(`Tostado (${state.suboptions.tueste})`);
    }

    if (state.services.molido) {
      ratePerLb += PRICING.molido;
      stages.push(`Molido (${state.suboptions.molienda})`);
    }

    const total = ratePerLb * state.pounds;
    return {
      ratePerLb,
      total,
      stages,
      stagesText: stages.length ? stages.join(' + ') : 'Sin etapas seleccionadas'
    };
  }

  function updateUI() {
    const { total, stagesText } = calculateTotal();

    // 1. Selector de peso: valor y estado del botón menos
    const weightDisplay = $('weight-display');
    if (weightDisplay) {
      weightDisplay.textContent = `${state.pounds} lb`;
    }
    const btnMinus = $('weight-minus');
    if (btnMinus) {
      btnMinus.disabled = state.pounds <= 1;
    }

    // 2. Presets de peso activos
    $$('.weight-preset-pill').forEach((pill) => {
      const lbs = parseInt(pill.dataset.lbs, 10);
      pill.classList.toggle('active', lbs === state.pounds);
    });

    // 3. Resumen en Tarjeta de Peso (Desktop)
    const summaryStages = $('maquila-stages-summary');
    if (summaryStages) {
      summaryStages.textContent = `${stagesText} · ${state.pounds} lb`;
    }

    const totalDisplay = $('maquila-total-display');
    if (totalDisplay) {
      totalDisplay.textContent = formatMoney(total);
    }

    // 4. Sincronización con la Barra Fija Inferior (Móvil)
    const barWeight = $('bar-maquila-weight-pill');
    if (barWeight) {
      barWeight.textContent = `${state.pounds} lb`;
    }

    const barStages = $('bar-maquila-stages-text');
    if (barStages) {
      barStages.textContent = stagesText;
    }

    const barPrice = $('bar-maquila-price');
    const barLabel = $('bar-maquila-label');
    const barDot = $('bar-maquila-dot');
    const qtyBox = $('maquila-qty-box');
    const actionsBar = $('maquila-actions');
    const isAdmin = isCurrentUserAdmin();

    if (qtyBox) {
      qtyBox.style.display = isAdmin ? 'inline-flex' : 'none';
    }
    if (actionsBar) {
      actionsBar.classList.toggle('guest-mode', !isAdmin);
    }

    if (isAdmin) {
      if (barLabel) barLabel.innerHTML = 'Agregar';
      if (barDot) barDot.style.display = '';
      if (barPrice) {
        barPrice.style.display = '';
        barPrice.textContent = formatMoney(total);
      }
    } else {
      if (barLabel) {
        barLabel.innerHTML = '<i class="fa-brands fa-whatsapp" style="font-size:1.15rem;margin-right:6px;vertical-align:-1px;"></i>Solicitar servicio por WhatsApp';
      }
      if (barDot) barDot.style.display = 'none';
      if (barPrice) barPrice.style.display = 'none';
    }

    // 5. Estado de tarjetas
    ['trillado', 'tostado', 'molido'].forEach((key) => {
      const card = $(`card-${key}`);
      if (card) {
        const isSelected = Boolean(state.services[key]);
        card.classList.toggle('selected', isSelected);
        const checkbox = card.querySelector('.maquila-step-badge');
        if (checkbox) {
          checkbox.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        }
      }
    });

    // 6. Subopciones visibles
    const subTostado = $('suboptions-tostado');
    if (subTostado) {
      subTostado.style.display = state.services.tostado ? 'flex' : 'none';
    }

    const subMolido = $('suboptions-molido');
    if (subMolido) {
      subMolido.style.display = state.services.molido ? 'flex' : 'none';
    }
  }

  /* ==========================================================================
     INTERACCIONES CON TARJETAS Y CHIPS
     ========================================================================== */
  function initCardsAndChips() {
    // Click en Tarjetas (Toggle de Etapas)
    ['trillado', 'tostado', 'molido'].forEach((key) => {
      const card = $(`card-${key}`);
      if (!card) return;

      card.addEventListener('click', (e) => {
        // Evitar toggle si se clickea un chip de subopción directamente
        if (e.target.closest('.maquila-chip')) return;

        const willBeActive = !state.services[key];

        // Validar que al menos una etapa quede seleccionada
        if (!willBeActive) {
          const otherActive = Object.keys(state.services).some(
            (k) => k !== key && state.services[k]
          );
          if (!otherActive) {
            showSnackMessage('Debes seleccionar al menos una etapa para el servicio.', true);
            return;
          }
        }

        state.services[key] = willBeActive;
        updateUI();
      });
    });

    // Chips de Tueste
    $$('#suboptions-tostado .maquila-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const level = chip.dataset.tueste;
        if (!level) return;

        state.suboptions.tueste = level;
        $$('#suboptions-tostado .maquila-chip').forEach((c) => {
          c.classList.toggle('active', c.dataset.tueste === level);
          c.setAttribute('aria-checked', c.dataset.tueste === level ? 'true' : 'false');
        });
        updateUI();
      });
    });

    // Chips de Molienda
    $$('#suboptions-molido .maquila-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const grind = chip.dataset.molienda;
        if (!grind) return;

        state.suboptions.molienda = grind;
        $$('#suboptions-molido .maquila-chip').forEach((c) => {
          c.classList.toggle('active', c.dataset.molienda === grind);
          c.setAttribute('aria-checked', c.dataset.molienda === grind ? 'true' : 'false');
        });
        updateUI();
      });
    });
  }

  /* ==========================================================================
     STEPPER Y PRESETS DE PESO
     ========================================================================== */
  function initWeightControls() {
    const btnMinus = $('weight-minus');
    const btnPlus = $('weight-plus');

    btnMinus?.addEventListener('click', () => {
      if (state.pounds > 1) {
        state.pounds = Math.max(1, state.pounds - 1);
        updateUI();
      }
    });

    btnPlus?.addEventListener('click', () => {
      if (state.pounds < 500) {
        state.pounds = Math.min(500, state.pounds + 1);
        updateUI();
      }
    });

    $$('.weight-preset-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const lbs = parseInt(pill.dataset.lbs, 10);
        if (lbs && lbs > 0) {
          state.pounds = lbs;
          updateUI();
        }
      });
    });
  }

  /* ==========================================================================
     CAMBIO DE PESTAÑAS (NUESTROS CAFÉS / MAQUILA Y TUESTE)
     ========================================================================== */
  function switchTab(target) {
    const tabCafes = $('tab-cafes');
    const tabMaquila = $('tab-maquila');
    const sectionCafes = $('productos');
    const sectionRelated = document.querySelector('.related');
    const sectionMaquila = $('maquila-section');
    const maquilaBottomBar = $('maquila-bottom-bar');

    if (target === 'maquila') {
      state.activeTab = 'maquila';
      window.__activeHomeTab = 'maquila';

      tabMaquila?.classList.add('active');
      tabMaquila?.setAttribute('aria-selected', 'true');
      tabCafes?.classList.remove('active');
      tabCafes?.setAttribute('aria-selected', 'false');

      sectionCafes?.classList.add('hidden');
      sectionRelated?.classList.add('hidden');
      sectionMaquila?.classList.remove('hidden');

      document.body.classList.add('maquila-tab-active');
      maquilaBottomBar?.classList.add('active');

      // Scroll suave hacia la sección
      sectionMaquila?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      state.activeTab = 'cafes';
      window.__activeHomeTab = 'cafes';

      tabCafes?.classList.add('active');
      tabCafes?.setAttribute('aria-selected', 'true');
      tabMaquila?.classList.remove('active');
      tabMaquila?.setAttribute('aria-selected', 'false');

      sectionCafes?.classList.remove('hidden');
      sectionRelated?.classList.remove('hidden');
      sectionMaquila?.classList.add('hidden');

      document.body.classList.remove('maquila-tab-active');
      maquilaBottomBar?.classList.remove('active');

      // Scroll suave hacia productos
      sectionCafes?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Re-evaluar visibilidad de barra sticky
    if (typeof window.updateStickyBarVisibility === 'function') {
      window.updateStickyBarVisibility();
    }
  }

  function initTabNavigation() {
    $('tab-cafes')?.addEventListener('click', () => switchTab('cafes'));
    $('tab-maquila')?.addEventListener('click', () => switchTab('maquila'));

    // Sincronizar si la URL trae hash
    if (window.location.hash === '#maquila' || window.location.hash === '#tueste') {
      setTimeout(() => switchTab('maquila'), 400);
    }
  }

  /* ==========================================================================
     ACCIÓN PRINCIPAL (ADMIN: AGREGAR AL CARRITO | CLIENTE/INVITADO: WHATSAPP)
     ========================================================================== */
  function requestMaquilaWhatsApp() {
    const { stages } = calculateTotal();
    const stagesSummary = stages.length ? stages.join(', ') : 'Maquila y Tueste';
    const customMsg = `Hola Café Cortero, deseo solicitar el servicio de: ${stagesSummary}.`;

    const sheet = $('wa-sheet');
    const backdrop = $('wa-sheet-backdrop');
    const opt1 = $('wa-opt-1');
    const opt2 = $('wa-opt-2');

    if (opt1 && opt1.href) {
      const base1 = opt1.href.split('?')[0];
      opt1.href = `${base1}?text=${encodeURIComponent(customMsg)}`;
    }
    if (opt2 && opt2.href) {
      const base2 = opt2.href.split('?')[0];
      opt2.href = `${base2}?text=${encodeURIComponent(customMsg)}`;
    }

    if (sheet && backdrop) {
      sheet.classList.add('open');
      backdrop.classList.add('open');
      sheet.setAttribute('aria-hidden', 'false');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.classList.add('no-scroll');
    } else {
      window.open(`https://wa.me/50496670613?text=${encodeURIComponent(customMsg)}`, '_blank');
    }
  }

  function handleMaquilaPrimaryAction() {
    if (isCurrentUserAdmin()) {
      addMaquilaToCart();
    } else {
      requestMaquilaWhatsApp();
    }
  }

  function addMaquilaToCart() {
    const { stages } = calculateTotal();

    if (!stages.length) {
      showSnackMessage('Selecciona al menos una etapa del servicio.', true);
      return;
    }

    const activeStagesList = Object.keys(state.services).filter(
      (k) => state.services[k]
    );

    // 1. Obtener carrito actual y limpiar IDs antiguos no-UUID si existieran
    let cart = [];
    try {
      cart = JSON.parse(localStorage.getItem('cafecortero_cart')) || [];
    } catch {
      cart = [];
    }
    cart = cart.filter((it) => !String(it.product_id || '').startsWith('service_maquila_'));

    // 2. Por cada etapa activa, agregar o incrementar su producto oficial en BD
    activeStagesList.forEach((stageKey) => {
      const meta = SERVICE_CATALOG[stageKey];
      if (!meta) return;

      let itemName = meta.baseName;
      let itemGrind = meta.grind;

      if (stageKey === 'tostado') {
        itemName = `${meta.baseName} (${state.suboptions.tueste})`;
        itemGrind = `Tueste ${state.suboptions.tueste}`;
      } else if (stageKey === 'molido') {
        itemName = `${meta.baseName} (${state.suboptions.molienda})`;
        itemGrind = state.suboptions.molienda;
      }

      const existing = cart.find(
        (it) => it.product_id === meta.id && it.name === itemName
      );

      if (existing) {
        existing.qty = Number(existing.qty || 0) + state.pounds;
        existing.presentation = `${existing.qty} lb`;
      } else {
        cart.push({
          product_id: meta.id,
          type: 'service',
          name: itemName,
          price: meta.price,
          price_original: meta.price,
          discount_percent: 0,
          img: meta.img,
          image_url: meta.img,
          qty: state.pounds,
          category: 'Servicios',
          presentation: `${state.pounds} lb`,
          grind: itemGrind,
          metadata: {
            service_type: 'maquila',
            stage: stageKey,
            tueste: stageKey === 'tostado' ? state.suboptions.tueste : null,
            molienda: stageKey === 'molido' ? state.suboptions.molienda : null
          }
        });
      }
    });

    // 3. Guardar en localStorage
    localStorage.setItem('cafecortero_cart', JSON.stringify(cart));

    // 4. Notificar a toda la aplicación (header, badge, drawer)
    window.dispatchEvent(new Event('cartUpdated'));

    // 5. Animación del badge del carrito
    if (typeof window.animateCartBadge === 'function') {
      window.animateCartBadge();
    }

    // 6. Feedback al usuario
    showSnackMessage(`¡Servicio (${state.pounds} lb) agregado al pedido!`);
  }

  function initCartButtons() {
    // Botón en tarjeta Desktop
    $('maquila-desktop-add-btn')?.addEventListener('click', handleMaquilaPrimaryAction);

    // Botón en Barra de Acción Unificada
    $('bar-maquila-add')?.addEventListener('click', handleMaquilaPrimaryAction);

    // Actualizar automáticamente si cambia la sesión (login / logout)
    document.addEventListener('userLoggedIn', updateUI);
    document.addEventListener('userLoggedOut', updateUI);
    document.addEventListener('auth:ready', updateUI);
    window.addEventListener('storage', (e) => {
      if (e.key === 'cortero_user' || e.key === 'cortero_logged') {
        updateUI();
      }
    });
  }

  /* ==========================================================================
     MONITOREO DE SCROLL PARA LA BARRA MÓVIL
     ========================================================================== */
  function initStickyBarObserver() {
    const handleScroll = () => {
      if (window.innerWidth > 768) return;

      const maquilaSec = $('maquila-section');
      const aboutSec = $('nosotros') || document.querySelector('.about');

      if (!maquilaSec || maquilaSec.classList.contains('hidden')) return;

      const rect = maquilaSec.getBoundingClientRect();
      const reachedMaquila = rect.top <= 250;

      let reachedAbout = false;
      if (aboutSec) {
        const aboutRect = aboutSec.getBoundingClientRect();
        reachedAbout = aboutRect.top <= window.innerHeight - 50;
      }

      const shouldShow = reachedMaquila && !reachedAbout;
      const bar = $('maquila-bottom-bar');

      if (shouldShow) {
        document.body.classList.add('sticky-bar-visible');
        bar?.classList.add('active');
      } else {
        bar?.classList.remove('active');
        if (state.activeTab === 'maquila') {
          document.body.classList.remove('sticky-bar-visible');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    window.updateStickyBarVisibility = handleScroll;
  }

  /* ==========================================================================
     INICIALIZACIÓN AL CARGAR EL DOM
     ========================================================================== */
  function init() {
    initCardsAndChips();
    initWeightControls();
    initTabNavigation();
    initCartButtons();
    initStickyBarObserver();
    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exportar al objeto global para hooks externos si se requiere
  window.CafeCorteroMaquila = {
    state,
    calculateTotal,
    switchTab,
    addMaquilaToCart
  };
})();
