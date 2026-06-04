/* ============================================================
   FINANZAS — REGISTRAR | CAFÉ CORTERO
   ============================================================ */

console.log("✏️ finanzas/registrar.js — INIT");

(() => {
  const sb = window.supabaseClient;
  if (!sb) throw new Error("❌ Supabase no inicializado");

  const CATEGORIAS = {
    ingreso: [
      { icon: "local_cafe", label: "Café Trillado" },
      { icon: "blender", label: "Café Molido" },
      { icon: "local_fire_department", label: "Café Tostado" },
      { icon: "all_inclusive", label: "Todo en Uno" },
      { icon: "orders", label: "Pedidos en Línea" },
    ],
    egreso: [
      { icon: "local_gas_station", label: "Gasolina" },
      { icon: "oil_barrel", label: "Aceite motor" },
      { icon: "groups", label: "Mano de obra" },
      { icon: "whatshot", label: "Gas tostadora" },
      { icon: "eco", label: "Insumos" },
      { icon: "build", label: "Mantenimiento" },
      { icon: "inventory_2", label: "Empaque" },
      { icon: "shopping_bag", label: "Tienda" },
      { icon: "more_horiz", label: "Otros" },
    ],
  };

  const CATEGORIAS_DEFAULT = new Set(
    Object.values(CATEGORIAS).flatMap((c) => c.map((x) => x.label))
  );
  const CATEGORIAS_CUSTOM = []; // { tipo, label }

  function fmtMonto(n) {
    const num = Number(n) || 0;
    const fixed = num.toFixed(2);
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `HNL ${parts.join(".")}`;
  }

  function showSnackbar(msg) {
    let sb = document.querySelector(".fin-snackbar");
    if (!sb) {
      sb = document.createElement("div");
      sb.className = "fin-snackbar";
      document.body.appendChild(sb);
    }
    sb.textContent = msg;
    sb.classList.add("open");
    clearTimeout(sb._timer);
    sb._timer = setTimeout(() => sb.classList.remove("open"), 3000);
  }

  function initUnifiedForm() {
    const user = JSON.parse(localStorage.getItem("cortero_user") || "null");
    if (!user || user.rol !== "admin") return;

    let tipo = "ingreso";
    let categoriaSeleccionada = null;
    let metodoPago = "Efectivo";
    let montoValor = 0;

    const montoInput = document.getElementById("fin-monto-input");
    const conceptoInput = document.getElementById("fin-concepto");
    const trigger = document.getElementById("fin-cat-trigger");
    const menu = document.getElementById("fin-cat-menu");
    const mpTrigger = document.getElementById("fin-metodo-pago-trigger");
    const mpMenu = document.getElementById("fin-metodo-pago-menu");
    const fechaInput = document.getElementById("fin-fecha");
    const fechaDisplay = document.getElementById("fin-fecha-display");
    const fechaWrapper = document.getElementById("fin-fecha-wrapper");
    const guardarBtn = document.getElementById("fin-guardar-btn");
    const toggleBtns = document.querySelectorAll(".fin-tipo-btn");

    // Default date
    if (fechaInput && fechaDisplay) {
      const hoy = new Date();
      const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
      fechaInput.value = iso;
      fechaDisplay.value = hoy.toLocaleDateString("es-HN", { day: "2-digit", month: "long", year: "numeric" });

      function abrirDatePicker() {
        if (window.initM3DatePicker) {
          window.initM3DatePicker({
            inputDisplay: fechaDisplay,
            inputHidden: fechaInput,
            onSelect: () => validarForm()
          });
        }
      }

      fechaWrapper?.addEventListener("click", abrirDatePicker);
    }

    // Load edit data
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("id");
    if (editId) {
      (async () => {
        const { data, error } = await sb.from("finanzas_movimientos").select("*").eq("id", editId).single();
        if (error || !data) return;
        document.querySelector(".fin-title").textContent = "Editar Registro";
        tipo = data.tipo;
        updateTipo(data.tipo);
        montoInput.value = Number(data.monto).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        montoValor = data.monto;
        conceptoInput.value = data.concepto;
        fechaInput.value = data.fecha;
        fechaDisplay.value = new Date(data.fecha + "T" + (data.hora || "00:00:00")).toLocaleDateString("es-HN", { day: "2-digit", month: "long", year: "numeric" });
        guardarBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">save</span> Actualizar ${data.tipo === "ingreso" ? "Ingreso" : "Egreso"}`;
        metodoPago = data.metodo_pago || "Efectivo";
        const mpLabel = mpTrigger?.querySelector(".fin-cat-trigger-label");
        if (mpLabel) mpLabel.textContent = metodoPago;
        setTimeout(() => {
          const cats = CATEGORIAS[data.tipo] || [];
          const match = cats.find(c => c.label === data.categoria);
          if (match) {
            categoriaSeleccionada = data.categoria;
            updateTrigger(data.categoria, match.icon || "category");
            mostrarAcciones(data.categoria);
            validarForm();
          }
        }, 50);
      })();
    }

    // Save
    if (guardarBtn) {
      guardarBtn.addEventListener("click", async () => {
        guardarBtn.disabled = true;
        console.log("🔵 Save clicked, editId:", editId, "tipo:", tipo, "categoria:", categoriaSeleccionada, "monto:", montoValor);

        try {
          const concepto = (conceptoInput?.value || "").trim();
          if (!concepto || !categoriaSeleccionada || montoValor <= 0) {
            guardarBtn.disabled = false;
            return;
          }

          const ahora = new Date();
          const payloadBase = {
            tipo,
            concepto,
            categoria: categoriaSeleccionada,
            monto: montoValor,
            fecha: fechaInput?.value || ahora.toISOString().split("T")[0],
            metodo_pago: metodoPago,
          };
          const payload = editId
            ? payloadBase
            : { ...payloadBase, hora: ahora.toTimeString().slice(0, 8), notas: null };
          console.log("📦 Payload:", payload, "editId:", editId);

          const { error } = editId
            ? await sb.from("finanzas_movimientos").update(payload).eq("id", editId)
            : await sb.from("finanzas_movimientos").insert(payload);

          if (error) {
            console.error("❌ Error al guardar:", error);
            showSnackbar("Error al guardar. Intentalo de nuevo.");
            guardarBtn.disabled = false;
            return;
          }

          console.log("✅ Guardado OK");

          if (error) {
            console.error("❌ Error al guardar:", error);
            showSnackbar("Error al guardar. Intentalo de nuevo.");
            guardarBtn.disabled = false;
            return;
          }

          console.log("✅ Guardado OK");
          showSnackbar(editId ? "✓ Movimiento actualizado" : "✓ Movimiento guardado");

          setTimeout(() => {
            if (editId) {
              const destino = tipo === "ingreso" ? "ingresos" : "egresos";
              window.location.href = `/pages/admin/finanzas/${destino}.html?_=${Date.now()}`;
            } else {
              window.location.href = "/pages/admin/finanzas/index.html";
            }
          }, 800);
        } catch (err) {
          console.error("❌ Excepción al guardar:", err);
          showSnackbar("Error inesperado. Revisa la consola.");
          guardarBtn.disabled = false;
        }
      });
    }

    function closeMenu() {
      trigger.classList.remove("open");
      menu.classList.remove("open");
    }

    function openMenu() {
      trigger.classList.add("open");
      menu.classList.add("open");
    }

    function toggleMenu() {
      if (menu.classList.contains("open")) {
        closeMenu();
      } else {
        renderCategorias(tipo);
        openMenu();
      }
    }

    trigger?.addEventListener("click", toggleMenu);

    document.addEventListener("click", (e) => {
      const dd = document.querySelector(".fin-cat-dropdown");
      if (dd && !dd.contains(e.target)) {
        closeMenu();
      }
    });

    // --- Método de pago dropdown ---
    const METODOS_PAGO = ["Efectivo", "Transferencia"];

    function closeMpMenu() {
      mpTrigger?.classList.remove("open");
      mpMenu?.classList.remove("open");
    }

    function openMpMenu() {
      mpTrigger?.classList.add("open");
      mpMenu?.classList.add("open");
    }

    mpTrigger?.addEventListener("click", () => {
      if (mpMenu?.classList.contains("open")) {
        closeMpMenu();
      } else {
        renderMpMenu();
        openMpMenu();
      }
    });

    document.addEventListener("click", (e) => {
      const dd = document.getElementById("fin-metodo-pago-chips");
      if (dd && !dd.contains(e.target)) {
        closeMpMenu();
      }
    });

    function renderMpMenu() {
      if (!mpMenu) return;
      mpMenu.innerHTML = METODOS_PAGO.map(mp => {
        const selected = mp === metodoPago;
        return `<button class="fin-cat-menu-item${selected ? ' selected' : ''}" data-metodo="${mp}">
          <span class="fin-cat-menu-item-text">${mp}</span>
          <span class="material-symbols-outlined fin-cat-menu-item-check">check</span>
        </button>`;
      }).join("");
      mpMenu.querySelectorAll(".fin-cat-menu-item").forEach(item => {
        item.addEventListener("click", () => {
          metodoPago = item.dataset.metodo;
          const mpLabel = mpTrigger?.querySelector(".fin-cat-trigger-label");
          if (mpLabel) mpLabel.textContent = metodoPago;
          closeMpMenu();
        });
      });
    }
    // --- Fin método de pago ---

    function renderCategorias(t) {
      if (!menu) return;
      const cats = CATEGORIAS[t];
      let html = cats
        .map(
          (c) => {
            const selected = c.label === categoriaSeleccionada;
            return `<button class="fin-cat-menu-item${selected ? ' selected' : ''}" data-categoria="${c.label}">
              <span class="material-symbols-outlined fin-cat-menu-item-icon">${c.icon}</span>
              <span class="fin-cat-menu-item-text">${c.label}</span>
              <span class="material-symbols-outlined fin-cat-menu-item-check">check</span>
            </button>`;
          }
        )
        .join("");

      html += `
        <div class="fin-cat-menu-divider"></div>
        <button class="fin-cat-menu-item fin-cat-menu-item-create" id="btn-crear-categoria">
          <span class="material-symbols-outlined fin-cat-menu-item-icon">add</span>
          <span class="fin-cat-menu-item-text">Crear categoría</span>
        </button>`;

      menu.innerHTML = html;

      menu.querySelectorAll(".fin-cat-menu-item:not(#btn-crear-categoria)").forEach((item) => {
        item.addEventListener("click", () => {
          const label = item.dataset.categoria;
          categoriaSeleccionada = label;
          const icon = item.querySelector(".fin-cat-menu-item-icon")?.textContent || "category";
          updateTrigger(label, icon);
          mostrarAcciones(label);
          validarForm();
          closeMenu();
        });
      });

      document.getElementById("btn-crear-categoria")?.addEventListener("click", () => {
        closeMenu();
        mostrarFormCrear(t);
      });
    }

    function updateTrigger(label, icon) {
      const triggerIcon = trigger?.querySelector(".fin-cat-trigger-icon");
      const triggerLabel = trigger?.querySelector(".fin-cat-trigger-label");
      if (triggerIcon) triggerIcon.textContent = icon;
      if (triggerLabel) {
        triggerLabel.textContent = label;
        triggerLabel.classList.remove("fin-cat-trigger-placeholder");
      }
    }

    function mostrarFormCrear(t) {
      const existing = document.querySelector(".fin-cat-inline-form");
      if (existing) existing.remove();

      const form = document.createElement("div");
      form.className = "fin-cat-inline-form open";
      form.innerHTML = `
        <input type="text" class="fin-cat-inline-input" id="input-nueva-categoria" placeholder="Nueva categoría" autofocus>
        <button class="fin-cat-inline-btn fin-cat-inline-btn-primary" id="btn-confirmar-categoria">OK</button>
        <button class="fin-cat-inline-btn fin-cat-inline-btn-text" id="btn-cancelar-categoria">Cancelar</button>
      `;

      const dd = document.querySelector(".fin-cat-dropdown");
      dd?.appendChild(form);

      const input = document.getElementById("input-nueva-categoria");
      const okBtn = document.getElementById("btn-confirmar-categoria");
      const cancelBtn = document.getElementById("btn-cancelar-categoria");

      input?.focus();

      function confirmar() {
        const label = input.value.trim();
        if (!label) {
          form.remove();
          return;
        }
        CATEGORIAS[t].push({ icon: "add_circle", label });
        CATEGORIAS_CUSTOM.push({ tipo: t, label });
        categoriaSeleccionada = label;
        updateTrigger(label, "add_circle");
        mostrarAcciones(label);
        validarForm();
        form.remove();
      }

      okBtn?.addEventListener("click", confirmar);
      input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") confirmar();
        if (e.key === "Escape") form.remove();
      });
      cancelBtn?.addEventListener("click", () => form.remove());
    }

    function mostrarAcciones(label) {
      const accionDiv = document.getElementById("acciones-categoria");
      if (!accionDiv) return;
      const esCustom = CATEGORIAS_CUSTOM.some(x => x.tipo === tipo && x.label === label);
      if (!esCustom) {
        accionDiv.innerHTML = "";
        return;
      }
      accionDiv.innerHTML = `
        <button class="fin-chip" id="btn-editar-categoria" style="display:flex;align-items:center;gap:4px;">
          <span class="material-symbols-outlined" style="font-size:16px;">edit</span> Editar
        </button>
        <button class="fin-chip" id="btn-eliminar-categoria" style="display:flex;align-items:center;gap:4px;color:var(--md-error);border-color:var(--md-error);">
          <span class="material-symbols-outlined" style="font-size:16px;">delete</span> Eliminar
        </button>
        <input type="text" id="input-editar-categoria" placeholder="Nuevo nombre"
          style="display:none;flex:1;padding:8px 12px;border:1px solid var(--md-outline);border-radius:var(--md-shape-full);font:var(--md-label-lg);background:transparent;outline:none;">
        <button id="btn-confirmar-editar" style="display:none;padding:8px 12px;border:none;border-radius:var(--md-shape-full);background:var(--md-primary);color:var(--md-on-primary);font:var(--md-label-lg);cursor:pointer;">OK</button>
      `;

      document.getElementById("btn-eliminar-categoria")?.addEventListener("click", () => {
        const idx = CATEGORIAS[tipo].findIndex(c => c.label === label);
        if (idx !== -1) CATEGORIAS[tipo].splice(idx, 1);
        const cIdx = CATEGORIAS_CUSTOM.findIndex(x => x.tipo === tipo && x.label === label);
        if (cIdx !== -1) CATEGORIAS_CUSTOM.splice(cIdx, 1);
        if (categoriaSeleccionada === label) {
          categoriaSeleccionada = null;
          const triggerIcon = trigger?.querySelector(".fin-cat-trigger-icon");
          const triggerLabel = trigger?.querySelector(".fin-cat-trigger-label");
          if (triggerIcon) triggerIcon.textContent = "category";
          if (triggerLabel) {
            triggerLabel.textContent = "Seleccionar categoría";
            triggerLabel.classList.add("fin-cat-trigger-placeholder");
          }
          accionDiv.innerHTML = "";
        }
        validarForm();
      });

      document.getElementById("btn-editar-categoria")?.addEventListener("click", () => {
        const editInput = document.getElementById("input-editar-categoria");
        const confirmBtn = document.getElementById("btn-confirmar-editar");
        editInput.style.display = "block";
        confirmBtn.style.display = "block";
        editInput.value = label;
        editInput.focus();
      });

      document.getElementById("btn-confirmar-editar")?.addEventListener("click", () => {
        const editInput = document.getElementById("input-editar-categoria");
        const nuevo = editInput.value.trim();
        if (!nuevo) return;
        const cat = CATEGORIAS[tipo].find(c => c.label === label);
        if (cat) cat.label = nuevo;
        const cItem = CATEGORIAS_CUSTOM.find(x => x.tipo === tipo && x.label === label);
        if (cItem) cItem.label = nuevo;
        if (categoriaSeleccionada === label) {
          categoriaSeleccionada = nuevo;
          updateTrigger(nuevo, cat?.icon || "add_circle");
        }
        validarForm();
      });

      document.getElementById("input-editar-categoria")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.getElementById("btn-confirmar-editar")?.click();
        if (e.key === "Escape") {
          document.getElementById("input-editar-categoria").style.display = "none";
          document.getElementById("btn-confirmar-editar").style.display = "none";
        }
      });
    }

    function resetCategoria() {
      categoriaSeleccionada = null;
      const triggerIcon = trigger?.querySelector(".fin-cat-trigger-icon");
      const triggerLabel = trigger?.querySelector(".fin-cat-trigger-label");
      if (triggerIcon) triggerIcon.textContent = "category";
      if (triggerLabel) {
        triggerLabel.textContent = "Seleccionar categoría";
        triggerLabel.classList.add("fin-cat-trigger-placeholder");
      }
      const accionDiv = document.getElementById("acciones-categoria");
      if (accionDiv) accionDiv.innerHTML = "";
    }

    function updateTipo(t) {
      tipo = t;
      resetCategoria();
      toggleBtns.forEach((btn) => {
        const isActive = btn.dataset.tipo === t;
        btn.classList.toggle("active", isActive);
        if (isActive) {
          btn.classList.add(t === "ingreso" ? "primary" : "error");
          btn.classList.remove(t === "ingreso" ? "error" : "primary");
          const span = btn.querySelector("span:last-child");
          if (span) span.style.fontWeight = "700";
        } else {
          btn.classList.remove("primary", "error");
          const span = btn.querySelector("span:last-child");
          if (span) span.style.fontWeight = "";
        }
      });
      renderCategorias(t);
      if (guardarBtn) {
        guardarBtn.className = `fin-btn-filled ${t === "ingreso" ? "primary" : "error"}`;
        guardarBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">save</span> Guardar ${t === "ingreso" ? "Ingreso" : "Egreso"}`;
      }
      const montoColor = t === "ingreso" ? "var(--verde)" : "var(--md-error)";
      const montoInput = document.getElementById("fin-monto-input");
      if (montoInput) montoInput.style.color = montoColor;
      const hnlLabel = document.getElementById("fin-hnl-label");
      if (hnlLabel) hnlLabel.style.color = "var(--marron)";
      validarForm();
    }

    // Monto
    if (montoInput) {
      montoInput.addEventListener("focus", () => {
        if (montoInput.value === "0.00") montoInput.value = "";
      });
      montoInput.addEventListener("blur", () => {
        const raw = montoInput.value.replace(/[^0-9.]/g, "");
        const num = parseFloat(raw) || 0;
        montoInput.value = num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      });
      montoInput.addEventListener("input", () => {
        const raw = montoInput.value.replace(/[^0-9.]/g, "");
        montoValor = parseFloat(raw) || 0;
        validarForm();
      });
    }

    // Concepto
    if (conceptoInput) {
      conceptoInput.addEventListener("input", validarForm);
    }

    function validarForm() {
      if (!guardarBtn) return;
      const conceptoVal = (conceptoInput?.value || "").trim();
      const ok = montoValor > 0 && categoriaSeleccionada && conceptoVal.length > 0;
      guardarBtn.disabled = !ok;
    }

    // Toggle
    toggleBtns.forEach((btn) => {
      btn.addEventListener("click", () => updateTipo(btn.dataset.tipo));
    });

    // Init default (ingreso)
    updateTipo("ingreso");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.classList.contains("page-fin-unified-registro")) {
      initUnifiedForm();
    }
  });
})();
