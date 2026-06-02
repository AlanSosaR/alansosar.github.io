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
    let montoValor = 0;

    const montoInput = document.getElementById("fin-monto-input");
    const conceptoInput = document.getElementById("fin-concepto");
    const categoriaContainer = document.getElementById("fin-categoria-chips");
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
        setTimeout(() => {
          const chips = categoriaContainer.querySelectorAll(".fin-cat-chip:not(#btn-crear-categoria)");
          const match = [...chips].find(c => c.dataset.categoria === data.categoria);
          if (match) {
            chips.forEach(c => c.classList.remove("active"));
            match.classList.add("active");
            categoriaSeleccionada = data.categoria;
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

          console.log("✅ Guardado OK — datos:", upData);
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

    function renderCategorias(t) {
      if (!categoriaContainer) return;
      const cats = CATEGORIAS[t];
      let html = cats
        .map(
          (c) =>
            `<button class="fin-cat-chip${CATEGORIAS_CUSTOM.some(x => x.tipo === t && x.label === c.label) ? ' custom' : ''}" data-categoria="${c.label}">
              <span class="material-symbols-outlined">${c.icon}</span>
              ${c.label}
            </button>`
        )
        .join("");

      html += `
        <div style="display:flex;align-items:center;gap:6px;width:100%;">
          <button class="fin-cat-chip" id="btn-crear-categoria" style="border-style:dashed;opacity:0.7;">
            <span class="material-symbols-outlined" style="font-size:18px;">add</span>
            Crear categoría
          </button>
          <input type="text" id="input-nueva-categoria" placeholder="Nueva categoría"
            style="display:none;flex:1;padding:8px 12px;border:1px solid var(--md-outline);border-radius:var(--md-shape-full);font:var(--md-label-lg);background:transparent;outline:none;">
          <button id="btn-confirmar-categoria" style="display:none;padding:8px 12px;border:none;border-radius:var(--md-shape-full);background:var(--md-primary);color:var(--md-on-primary);font:var(--md-label-lg);cursor:pointer;">OK</button>
        </div>
        <div id="acciones-categoria" style="display:flex;gap:8px;margin-top:4px;"></div>`;

      categoriaContainer.innerHTML = html;

      categoriaSeleccionada = null;
      const accionDiv = document.getElementById("acciones-categoria");
      categoriaContainer.querySelectorAll(".fin-cat-chip:not(#btn-crear-categoria)").forEach((chip) => {
        chip.addEventListener("click", () => {
          categoriaContainer.querySelectorAll(".fin-cat-chip:not(#btn-crear-categoria)").forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          categoriaSeleccionada = chip.dataset.categoria;
          mostrarAcciones(chip.dataset.categoria);
          validarForm();
        });
      });

      const btnCrear = document.getElementById("btn-crear-categoria");
      const inputNueva = document.getElementById("input-nueva-categoria");
      const btnConfirmar = document.getElementById("btn-confirmar-categoria");

      btnCrear?.addEventListener("click", () => {
        btnCrear.style.display = "none";
        inputNueva.style.display = "block";
        btnConfirmar.style.display = "block";
        inputNueva.focus();
      });

      btnConfirmar?.addEventListener("click", () => {
        const label = inputNueva.value.trim();
        if (!label) {
          inputNueva.style.display = "none";
          btnConfirmar.style.display = "none";
          btnCrear.style.display = "inline-flex";
          return;
        }
        CATEGORIAS[t].push({ icon: "add_circle", label });
        CATEGORIAS_CUSTOM.push({ tipo: t, label });
        inputNueva.value = "";
        inputNueva.style.display = "none";
        btnConfirmar.style.display = "none";
        btnCrear.style.display = "inline-flex";
        renderCategorias(t);
        setTimeout(() => {
          const chips = categoriaContainer.querySelectorAll(".fin-cat-chip:not(#btn-crear-categoria)");
          const last = chips[chips.length - 1];
          if (last) {
            chips.forEach((c) => c.classList.remove("active"));
            last.classList.add("active");
            categoriaSeleccionada = last.dataset.categoria;
            mostrarAcciones(last.dataset.categoria);
            validarForm();
          }
        }, 0);
      });

      inputNueva?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") btnConfirmar?.click();
        if (e.key === "Escape") {
          inputNueva.style.display = "none";
          btnConfirmar.style.display = "none";
          btnCrear.style.display = "inline-flex";
        }
      });
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
        renderCategorias(tipo);
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
        renderCategorias(tipo);
        setTimeout(() => {
          const chips = categoriaContainer.querySelectorAll(".fin-cat-chip:not(#btn-crear-categoria)");
          const match = [...chips].find(c => c.dataset.categoria === nuevo);
          if (match) {
            chips.forEach(c => c.classList.remove("active"));
            match.classList.add("active");
            categoriaSeleccionada = nuevo;
            mostrarAcciones(nuevo);
            validarForm();
          }
        }, 0);
      });

      document.getElementById("input-editar-categoria")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.getElementById("btn-confirmar-editar")?.click();
        if (e.key === "Escape") {
          document.getElementById("input-editar-categoria").style.display = "none";
          document.getElementById("btn-confirmar-editar").style.display = "none";
        }
      });
    }

    function updateTipo(t) {
      tipo = t;
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
