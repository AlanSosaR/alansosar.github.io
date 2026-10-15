/* ============================================================
   FINANZAS — REGISTRAR | CAFÉ CORTERO
   ============================================================ */

console.log("✏️ finanzas/registrar.js — INIT");

(() => {
  const sb = window.supabaseClient;
  if (!sb) throw new Error("❌ Supabase no inicializado");

  const CATEGORIAS = {
    ingreso: [
      { icon: "point_of_sale", label: "Pedido POS · Café Convencional" },
      { icon: "local_shipping", label: "Venta Mayorista · Grano Oro" },
      { icon: "local_cafe", label: "Café Trillado" },
      { icon: "blender", label: "Café Molido" },
      { icon: "local_fire_department", label: "Café Tostado" },
      { icon: "all_inclusive", label: "Todo en Uno" },
      { icon: "workspace_premium", label: "Café Finca La Rosa" },
      { icon: "orders", label: "Pedidos en Línea" },
      { icon: "payments", label: "Otros Ingresos de Finca" },
    ],
    ahorro: [
      { icon: "savings", label: "Ahorro General" },
      { icon: "savings", label: "Fondo de Reserva Cosecha" },
      { icon: "precision_manufacturing", label: "Mantenimiento Beneficio" },
      { icon: "park", label: "Inversión Renovación Lotes" },
      { icon: "account_balance", label: "Ahorro Bancario Cortero" },
      { icon: "account_balance", label: "Fondo de Emergencia" },
      { icon: "flag", label: "Meta de Ahorro" },
    ],
    egreso: [
      { icon: "groups", label: "Pago de Jornales · Corte" },
      { icon: "science", label: "Fertilizantes e Insumos" },
      { icon: "inventory_2", label: "Empaque y Bolsas 1 lb" },
      { icon: "local_gas_station", label: "Transporte y Combustible" },
      { icon: "local_gas_station", label: "Gasolina" },
      { icon: "oil_barrel", label: "Aceite motor" },
      { icon: "groups", label: "Mano de obra" },
      { icon: "whatshot", label: "Gas tostadora" },
      { icon: "eco", label: "Insumos" },
      { icon: "build", label: "Mantenimiento" },
      { icon: "shopping_bag", label: "Tienda" },
      { icon: "more_horiz", label: "Otros" },
    ],
  };

  const CATEGORIAS_DEFAULT = new Set(
    Object.values(CATEGORIAS).flatMap((c) => c.map((x) => x.label))
  );
  const CATEGORIAS_CUSTOM = []; // { tipo, label }

  const PRECIOS_CAFE = {
    "Café Molido": 5,
    "Café Trillado": 8,
    "Café Tostado": 9,
    "Todo en Uno": 22,
  };

  const PRECIOS_FINCA = {
    "Premium": 150,
    "Tradicional": 100,
  };

  const CATEGORIA_FINCA = "Café Finca La Rosa";

  function isCategoriaCafe(label) {
    return label in PRECIOS_CAFE;
  }

  function isCategoriaFinca(label) {
    return label === CATEGORIA_FINCA;
  }

  function fmtMonto(n) {
    const num = Number(n) || 0;
    const fixed = num.toFixed(2);
    const parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `HNL ${parts.join(".")}`;
  }

  function showSnackbar(msg, type = "success") {
    const el = document.getElementById("snackbar");
    if (!el) return;
    el.textContent = msg;
    el.className = "snackbar show";
    if (type) el.classList.add(type);
    setTimeout(() => el.classList.remove("show", "success", "error", "warn"), 3500);
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
    const cafeFields = document.getElementById("fin-cafe-fields");
    const cantidadInput = document.getElementById("fin-cantidad-libras");
    const precioInput = document.getElementById("fin-precio-libra");
    const fincaFields = document.getElementById("fin-finca-fields");
    const unidadesInput = document.getElementById("fin-unidades-vendidas");
    let tamanoSeleccionado = "";
    const tamTrigger = document.getElementById("fin-tamano-trigger");
    const tamMenu = document.getElementById("fin-tamano-menu");
    let presentacionSeleccionada = "";
    let tipoCafeSeleccionado = "";
    const presTrigger = document.getElementById("fin-presentacion-trigger");
    const presMenu = document.getElementById("fin-presentacion-menu");
    const tipoTrigger = document.getElementById("fin-tipo-cafe-trigger");
    const tipoMenu = document.getElementById("fin-tipo-cafe-menu");
    const variedadSection = document.getElementById("fin-variedad-section");
    const pagoVarWrapper = document.getElementById("fin-pago-variedad-wrapper");
    let variedadSeleccionada = "";
    const varTrigger = document.getElementById("fin-variedad-trigger");
    const varMenu = document.getElementById("fin-variedad-menu");

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
        guardarBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">save</span> Actualizar ${data.tipo === "ingreso" ? "Ingreso" : data.tipo === "ahorro" ? "Ahorro" : "Gasto"}`;
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
            actualizarCamposEspeciales(data.categoria);
            if (isCategoriaCafe(data.categoria)) {
              if (data.cantidad_libras != null) cantidadInput.value = Number(data.cantidad_libras).toFixed(2);
              if (data.precio_por_libra != null) precioInput.value = Number(data.precio_por_libra).toFixed(2);
              recalcularMontoCafe();
            }
            if (isCategoriaFinca(data.categoria)) {
              if (data.product_id) {
                (async () => {
                  const { data: prod } = await sb.from("products").select("presentation,grind_type,variedad").eq("id", data.product_id).single();
                  if (prod) {
                    presentacionSeleccionada = prod.presentation || "";
                    tipoCafeSeleccionado = prod.grind_type || "";
                    variedadSeleccionada = prod.variedad || "";
                    // Update dropdown UI labels
                    const presLabel = presTrigger?.querySelector(".fin-cat-trigger-label");
                    if (presLabel) {
                      const presOpt = PRESENTACION_OPTS.find(o => o.value === presentacionSeleccionada);
                      presLabel.textContent = presOpt ? presOpt.label : presentacionSeleccionada;
                      presLabel.classList.remove("fin-cat-trigger-placeholder");
                    }
                    const tipoLabel = tipoTrigger?.querySelector(".fin-cat-trigger-label");
                    if (tipoLabel) {
                      tipoLabel.textContent = tipoCafeSeleccionado;
                      tipoLabel.classList.remove("fin-cat-trigger-placeholder");
                    }
                    const varLabel = varTrigger?.querySelector(".fin-cat-trigger-label");
                    if (varLabel) {
                      varLabel.textContent = variedadSeleccionada;
                      varLabel.classList.remove("fin-cat-trigger-placeholder");
                    }
                  }
                })();
              }
              if (data.tamano) {
                tamanoSeleccionado = data.tamano;
                const tamLabel = tamTrigger?.querySelector(".fin-cat-trigger-label");
                if (tamLabel) {
                  tamLabel.textContent = data.tamano;
                  tamLabel.classList.remove("fin-cat-trigger-placeholder");
                }
              }
            }
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
          if (montoValor <= 0) {
            const heroCard = document.getElementById("amount-hero-card") || document.querySelector(".fin-hero-monto-card");
            if (heroCard) {
              heroCard.classList.remove("shake-alert");
              void heroCard.offsetWidth;
              heroCard.classList.add("shake-alert");
            }
            showSnackbar("Ingresa un monto o toca +100 / +500", "warn");
            montoInput?.focus();
            guardarBtn.disabled = false;
            return;
          }
          if (!concepto || !categoriaSeleccionada) {
            guardarBtn.disabled = false;
            return;
          }

          const ahora = new Date();
          const esFinca = isCategoriaFinca(categoriaSeleccionada);
          let product_id = null;

          if (esFinca) {
            const presentationVal = presentacionSeleccionada ? presentacionSeleccionada.split(" ")[0] : null;
            const tipoCafeVal = tipoCafeSeleccionado;
            const variedadVal = variedadSeleccionada;

            if (presentationVal && tipoCafeVal && variedadVal) {
              const { data, error } = await sb.from("products").select("id").eq("finca", "La Rosa")
                .eq("presentation", presentationVal)
                .eq("grind_type", tipoCafeVal)
                .eq("variedad", variedadVal)
                .limit(1).maybeSingle();
              
              if (!error && data) {
                product_id = data.id;
              }
            }
          }

          const payloadBase = {
            tipo,
            concepto,
            categoria: categoriaSeleccionada,
            monto: montoValor,
            fecha: fechaInput?.value || ahora.toISOString().split("T")[0],
            metodo_pago: metodoPago,
            product_id: product_id,
            tamano: tamanoSeleccionado || null,
          };

          const payload = editId
            ? payloadBase
            : { ...payloadBase, hora: ahora.toTimeString().slice(0, 8) };
          
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

          showSnackbar(editId ? "✓ Movimiento actualizado" : "✓ Movimiento guardado");

          setTimeout(() => {
            if (editId) {
              const destino = tipo === "ingreso" ? "ingresos" : tipo === "ahorro" ? "ahorros" : "egresos";
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

    function openCategorySheet() {
      renderCategorias(tipo);
      const scrim = document.getElementById("cat-sheet-scrim");
      const panel = document.getElementById("cat-sheet-panel");
      if (scrim) scrim.classList.add("open");
      if (panel) panel.classList.add("open");
    }

    function closeCategorySheet() {
      const scrim = document.getElementById("cat-sheet-scrim");
      const panel = document.getElementById("cat-sheet-panel");
      if (scrim) scrim.classList.remove("open");
      if (panel) panel.classList.remove("open");
    }

    trigger?.addEventListener("click", openCategorySheet);
    document.getElementById("cat-sheet-scrim")?.addEventListener("click", closeCategorySheet);
    document.getElementById("cat-sheet-close-btn")?.addEventListener("click", closeCategorySheet);
    document.getElementById("cat-sheet-handle")?.addEventListener("click", closeCategorySheet);

    // --- Método de pago dropdown ---
    const METODOS_PAGO = ["Efectivo", "Transferencia", "POS Tarjeta", "Por cobrar"];

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

    const CATEGORIAS_OCULTAS = new Set(["Pedidos en Línea"]);

    function renderCategorias(t) {
      const grid = document.getElementById("cat-options-grid");
      const cats = CATEGORIAS[t].filter(c => !CATEGORIAS_OCULTAS.has(c.label));
      const themeColor = t === "ingreso" ? "#377b4c" : t === "ahorro" ? "#512615" : "#C62828";
      const tintBg = t === "ingreso" ? "#EBF5EE" : t === "ahorro" ? "#F3ECE9" : "#FDECEC";

      if (grid) {
        grid.innerHTML = cats.map((c) => {
          const isCurrent = c.label === categoriaSeleccionada;
          const iconHtml = c.label === CATEGORIA_FINCA
            ? `<img src="/imagenes/field.png" style="width:20px;height:20px;object-fit:contain;">`
            : `<span class="material-symbols-outlined" style="font-size:18px;">${c.icon}</span>`;

          return `
            <button type="button" class="cat-sheet-item ${isCurrent ? 'selected' : ''}" data-categoria="${c.label}" style="${isCurrent ? `border-color:${themeColor} !important; background:${tintBg} !important;` : ''}">
              <span class="cat-sheet-item-icon" style="${isCurrent ? `background:${themeColor}; color:#FFFFFF; border-color:${themeColor};` : `color:${themeColor};`}">
                ${iconHtml}
              </span>
              <span class="cat-sheet-item-text" style="${isCurrent ? `color:${themeColor}; font-weight:700;` : ''}">
                ${c.label}
              </span>
            </button>
          `;
        }).join("");

        grid.querySelectorAll(".cat-sheet-item").forEach((item) => {
          item.addEventListener("click", () => {
            const label = item.dataset.categoria;
            categoriaSeleccionada = label;
            const found = cats.find(c => c.label === label);
            const icon = label === CATEGORIA_FINCA ? "img-finca" : (found?.icon || "category");
            updateTrigger(label, icon);
            mostrarAcciones(label);
            actualizarCamposEspeciales(label);
            validarForm();
            closeCategorySheet();
          });
        });
      }

      document.getElementById("btn-crear-categoria")?.addEventListener("click", () => {
        closeCategorySheet();
        mostrarFormCrear(t);
      });
    }

    function updateTrigger(label, icon) {
      const triggerIcon = trigger?.querySelector(".fin-cat-trigger-icon");
      const triggerLabel = trigger?.querySelector(".fin-cat-trigger-label");
      if (triggerIcon) {
        if (label === CATEGORIA_FINCA) {
          if (triggerIcon.tagName !== "IMG") {
            const img = document.createElement("img");
            img.src = "/imagenes/field.png";
            img.alt = "Finca";
            img.className = "fin-cat-trigger-icon";
            img.style.cssText = "width:24px;height:24px;object-fit:contain;";
            triggerIcon.replaceWith(img);
          }
        } else {
          if (triggerIcon.tagName === "IMG") {
            const span = document.createElement("span");
            span.className = "material-symbols-outlined fin-cat-trigger-icon";
            span.textContent = icon || "category";
            triggerIcon.replaceWith(span);
          } else {
            triggerIcon.textContent = icon || "category";
          }
        }
      }
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
        actualizarCamposEspeciales(label);
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

    function actualizarCamposEspeciales(label) {
      const esCafe = isCategoriaCafe(label);
      const esFinca = isCategoriaFinca(label);
      cafeFields.style.display = esCafe ? "" : "none";
      fincaFields.style.display = esFinca ? "" : "none";

      if (esFinca) {
        if (pagoVarWrapper) {
          pagoVarWrapper.style.display = "grid";
          pagoVarWrapper.style.gridTemplateColumns = "1fr 1fr";
          pagoVarWrapper.style.gap = "12px";
        }
        if (variedadSection) variedadSection.style.display = "";
      } else {
        if (pagoVarWrapper) pagoVarWrapper.style.display = "";
        if (variedadSection) variedadSection.style.display = "none";
      }
      if (!esFinca) {
        variedadSeleccionada = "";
        const varLabel = varTrigger?.querySelector(".fin-cat-trigger-label");
        if (varLabel) {
          varLabel.textContent = "Seleccionar";
          varLabel.classList.add("fin-cat-trigger-placeholder");
        }
      }
      if (esCafe) {
        const precioDefault = PRECIOS_CAFE[label];
        precioInput.value = precioDefault.toFixed(2);
        cantidadInput.value = "";
        montoInput.readOnly = true;
        montoInput.style.opacity = "0.7";
        recalcularMontoCafe();
      } else if (esFinca) {
        unidadesInput.value = "";
        presentacionSeleccionada = "";
        tipoCafeSeleccionado = "";
        tamanoSeleccionado = "";
        const presLabel = presTrigger?.querySelector(".fin-cat-trigger-label");
        if (presLabel) {
          presLabel.textContent = "Seleccionar";
          presLabel.classList.add("fin-cat-trigger-placeholder");
        }
        const tipoLabel = tipoTrigger?.querySelector(".fin-cat-trigger-label");
        if (tipoLabel) {
          tipoLabel.textContent = "Seleccionar";
          tipoLabel.classList.add("fin-cat-trigger-placeholder");
        }
        const tamLabel = tamTrigger?.querySelector(".fin-cat-trigger-label");
        if (tamLabel) {
          tamLabel.textContent = "Seleccionar";
          tamLabel.classList.add("fin-cat-trigger-placeholder");
        }
        montoInput.readOnly = true;
        montoInput.style.opacity = "0.7";
        recalcularMontoFinca();
      } else {
        cantidadInput.value = "";
        precioInput.value = "";
        unidadesInput.value = "";
        presentacionSeleccionada = "";
        tipoCafeSeleccionado = "";
        tamanoSeleccionado = "";
        const presLabel = presTrigger?.querySelector(".fin-cat-trigger-label");
        if (presLabel) {
          presLabel.textContent = "Seleccionar";
          presLabel.classList.add("fin-cat-trigger-placeholder");
        }
        const tipoLabel = tipoTrigger?.querySelector(".fin-cat-trigger-label");
        if (tipoLabel) {
          tipoLabel.textContent = "Seleccionar";
          tipoLabel.classList.add("fin-cat-trigger-placeholder");
        }
        const tamLabel = tamTrigger?.querySelector(".fin-cat-trigger-label");
        if (tamLabel) {
          tamLabel.textContent = "Seleccionar";
          tamLabel.classList.add("fin-cat-trigger-placeholder");
        }
      montoInput.readOnly = false;
        montoInput.style.opacity = "";
      }
    }

    function recalcularMontoCafe() {
      const rawCant = cantidadInput.value.replace(/[^0-9.]/g, "");
      const rawPrec = precioInput.value.replace(/[^0-9.]/g, "");
      const cant = parseFloat(rawCant) || 0;
      const prec = parseFloat(rawPrec) || 0;
      const total = cant * prec;
      montoValor = total;
      montoInput.value = total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      validarForm();
    }

    function recalcularMontoFinca() {
      const rawUnidades = unidadesInput.value.replace(/[^0-9.]/g, "");
      const unidades = parseFloat(rawUnidades) || 0;
      const precioPresentacion = PRECIOS_FINCA[presentacionSeleccionada] || 0;
      const total = unidades * precioPresentacion;
      montoValor = total;
      montoInput.value = total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      validarForm();
    }

    function resetCategoria() {
      categoriaSeleccionada = null;
      const triggerIcon = trigger?.querySelector(".fin-cat-trigger-icon");
      const triggerLabel = trigger?.querySelector(".fin-cat-trigger-label");
      if (triggerIcon) {
        if (triggerIcon.tagName === "IMG") {
          const span = document.createElement("span");
          span.className = "material-symbols-outlined fin-cat-trigger-icon";
          span.textContent = "category";
          triggerIcon.replaceWith(span);
        } else {
          triggerIcon.textContent = "category";
        }
      }
      if (triggerLabel) {
        triggerLabel.textContent = "Seleccionar categoría";
        triggerLabel.classList.add("fin-cat-trigger-placeholder");
      }
      const accionDiv = document.getElementById("acciones-categoria");
      if (accionDiv) accionDiv.innerHTML = "";
      actualizarCamposEspeciales(null);
    }

    // --- Presentación dropdown ---
    const PRESENTACION_OPTS = [
      { value: "Premium", label: "Premium (150 HNL)" },
      { value: "Tradicional", label: "Tradicional (100 HNL)" },
    ];

    function closePresMenu() {
      presTrigger?.classList.remove("open");
      presMenu?.classList.remove("open");
    }

    function openPresMenu() {
      presTrigger?.classList.add("open");
      presMenu?.classList.add("open");
    }

    presTrigger?.addEventListener("click", () => {
      if (presMenu?.classList.contains("open")) {
        closePresMenu();
      } else {
        renderPresMenu();
        openPresMenu();
      }
    });

    document.addEventListener("click", (e) => {
      const dd = document.getElementById("fin-presentacion-dropdown");
      if (dd && !dd.contains(e.target)) closePresMenu();
    });

    function renderPresMenu() {
      if (!presMenu) return;
      presMenu.innerHTML = PRESENTACION_OPTS.map(o => {
        const selected = o.value === presentacionSeleccionada;
        return `<button class="fin-cat-menu-item${selected ? ' selected' : ''}" data-value="${o.value}">
          <span class="fin-cat-menu-item-text">${o.label}</span>
          <span class="material-symbols-outlined fin-cat-menu-item-check">check</span>
        </button>`;
      }).join("");
      presMenu.querySelectorAll(".fin-cat-menu-item").forEach(item => {
        item.addEventListener("click", () => {
          presentacionSeleccionada = item.dataset.value;
          const label = item.querySelector(".fin-cat-menu-item-text")?.textContent || presentacionSeleccionada;
          const presLabel = presTrigger?.querySelector(".fin-cat-trigger-label");
          if (presLabel) {
            presLabel.textContent = label;
            presLabel.classList.remove("fin-cat-trigger-placeholder");
          }
          closePresMenu();
          recalcularMontoFinca();
        });
      });
    }

    // --- Tipo de café dropdown ---
    const TIPO_CAFE_OPTS = [
      { value: "Molido", label: "Molido" },
      { value: "En grano", label: "En grano" },
    ];

    function closeTipoMenu() {
      tipoTrigger?.classList.remove("open");
      tipoMenu?.classList.remove("open");
    }

    function openTipoMenu() {
      tipoTrigger?.classList.add("open");
      tipoMenu?.classList.add("open");
    }

    tipoTrigger?.addEventListener("click", () => {
      if (tipoMenu?.classList.contains("open")) {
        closeTipoMenu();
      } else {
        renderTipoMenu();
        openTipoMenu();
      }
    });

    document.addEventListener("click", (e) => {
      const dd = document.getElementById("fin-tipo-cafe-dropdown");
      if (dd && !dd.contains(e.target)) closeTipoMenu();
    });

    function renderTipoMenu() {
      if (!tipoMenu) return;
      tipoMenu.innerHTML = TIPO_CAFE_OPTS.map(o => {
        const selected = o.value === tipoCafeSeleccionado;
        return `<button class="fin-cat-menu-item${selected ? ' selected' : ''}" data-value="${o.value}">
          <span class="fin-cat-menu-item-text">${o.label}</span>
          <span class="material-symbols-outlined fin-cat-menu-item-check">check</span>
        </button>`;
      }).join("");
      tipoMenu.querySelectorAll(".fin-cat-menu-item").forEach(item => {
        item.addEventListener("click", () => {
          tipoCafeSeleccionado = item.dataset.value;
          const label = item.querySelector(".fin-cat-menu-item-text")?.textContent || tipoCafeSeleccionado;
          const tipoLabel = tipoTrigger?.querySelector(".fin-cat-trigger-label");
          if (tipoLabel) {
            tipoLabel.textContent = label;
            tipoLabel.classList.remove("fin-cat-trigger-placeholder");
          }
          closeTipoMenu();
        });
      });
    }

    // --- Variedad dropdown (Parainema / Geisha) ---
    const VARIEDAD_OPTS = [
      { value: "Parainema", label: "Parainema" },
      { value: "Geisha", label: "Geisha" },
    ];

    function closeVarMenu() {
      varTrigger?.classList.remove("open");
      varMenu?.classList.remove("open");
    }

    function openVarMenu() {
      varTrigger?.classList.add("open");
      varMenu?.classList.add("open");
    }

    varTrigger?.addEventListener("click", () => {
      if (varMenu?.classList.contains("open")) {
        closeVarMenu();
      } else {
        renderVarMenu();
        openVarMenu();
      }
    });

    document.addEventListener("click", (e) => {
      const dd = document.getElementById("fin-variedad-dropdown");
      if (dd && !dd.contains(e.target)) closeVarMenu();
    });

    function renderVarMenu() {
      if (!varMenu) return;
      varMenu.innerHTML = VARIEDAD_OPTS.map(o => {
        const selected = o.value === variedadSeleccionada;
        return `<button class="fin-cat-menu-item${selected ? ' selected' : ''}" data-value="${o.value}">
          <span class="fin-cat-menu-item-text">${o.label}</span>
          <span class="material-symbols-outlined fin-cat-menu-item-check">check</span>
        </button>`;
      }).join("");
      varMenu.querySelectorAll(".fin-cat-menu-item").forEach(item => {
        item.addEventListener("click", () => {
          variedadSeleccionada = item.dataset.value;
          const label = item.querySelector(".fin-cat-menu-item-text")?.textContent || variedadSeleccionada;
          const varLabel = varTrigger?.querySelector(".fin-cat-trigger-label");
          if (varLabel) {
            varLabel.textContent = label;
            varLabel.classList.remove("fin-cat-trigger-placeholder");
          }
          closeVarMenu();
        });
      });
    }

    // --- Tamaño dropdown (Libra / Media Libra / Cuarto) ---
    const TAMANO_OPTS = [
      { value: "1 Libra", label: "1 Libra" },
      { value: "1/2 Libra", label: "1/2 Libra" },
    ];

    function closeTamMenu() {
      tamTrigger?.classList.remove("open");
      tamMenu?.classList.remove("open");
    }

    function openTamMenu() {
      tamTrigger?.classList.add("open");
      tamMenu?.classList.add("open");
    }

    tamTrigger?.addEventListener("click", () => {
      if (tamMenu?.classList.contains("open")) {
        closeTamMenu();
      } else {
        renderTamMenu();
        openTamMenu();
      }
    });

    document.addEventListener("click", (e) => {
      const dd = document.getElementById("fin-tamano-dropdown");
      if (dd && !dd.contains(e.target)) closeTamMenu();
    });

    function renderTamMenu() {
      if (!tamMenu) return;
      tamMenu.innerHTML = TAMANO_OPTS.map(o => {
        const selected = o.value === tamanoSeleccionado;
        return `<button class="fin-cat-menu-item${selected ? ' selected' : ''}" data-value="${o.value}">
          <span class="fin-cat-menu-item-text">${o.label}</span>
          <span class="material-symbols-outlined fin-cat-menu-item-check">check</span>
        </button>`;
      }).join("");
      tamMenu.querySelectorAll(".fin-cat-menu-item").forEach(item => {
        item.addEventListener("click", () => {
          tamanoSeleccionado = item.dataset.value;
          const label = item.querySelector(".fin-cat-menu-item-text")?.textContent || tamanoSeleccionado;
          const tamLabel = tamTrigger?.querySelector(".fin-cat-trigger-label");
          if (tamLabel) {
            tamLabel.textContent = label;
            tamLabel.classList.remove("fin-cat-trigger-placeholder");
          }
          closeTamMenu();
        });
      });
    }

    function updateTipo(t) {
      tipo = t;
      toggleBtns.forEach((btn) => {
        const isActive = btn.dataset.tipo === t;
        btn.classList.toggle("active", isActive);
        if (isActive) {
          const cls = t === "ingreso" ? "primary" : t === "ahorro" ? "secondary" : "error";
          btn.classList.add(cls);
          btn.classList.remove(t === "ingreso" ? "error" : t === "ahorro" ? "primary" : "primary", t === "ahorro" ? "error" : "secondary");
          const span = btn.querySelector(".fin-tipo-label") || btn.querySelector("span:last-child");
          if (span) span.style.fontWeight = "700";
        } else {
          btn.classList.remove("primary", "secondary", "error");
          const span = btn.querySelector(".fin-tipo-label") || btn.querySelector("span:last-child");
          if (span) span.style.fontWeight = "500";
        }
      });

      // Preseleccionar primera categoría por defecto para el tipo elegido (estilo Gemini)
      const catsForType = CATEGORIAS[t].filter(c => !CATEGORIAS_OCULTAS.has(c.label));
      const belongs = catsForType.some(c => c.label === categoriaSeleccionada);
      if (!belongs && catsForType.length > 0) {
        const firstCat = catsForType[0];
        categoriaSeleccionada = firstCat.label;
        const icon = firstCat.label === CATEGORIA_FINCA ? "img-finca" : firstCat.icon;
        updateTrigger(firstCat.label, icon);
        mostrarAcciones(firstCat.label);
        actualizarCamposEspeciales(firstCat.label);
      }
      renderCategorias(t);

      // Sincronizar colores oficiales:
      // Ingreso: #377b4c, Ahorro: #512615, Gasto: #C62828
      const themeColor = t === "ingreso" ? "#377b4c" : t === "ahorro" ? "#512615" : "#C62828";
      const label = t === "ingreso" ? "Ingreso" : t === "ahorro" ? "Ahorro" : "Gasto";
      const tintBg = t === "ingreso" ? "#E8F3EB" : t === "ahorro" ? "#F3ECE9" : "#FDECEC";

      // 1. Sincronizar Píldora superior de Modo y Botón Volver
      const modePill = document.getElementById("modeBadgePill");
      const modeText = document.getElementById("modeBadgeText");
      if (modePill && modeText) {
        modeText.textContent = `MODO ${label.toUpperCase()}`;
        modePill.className = `mode-badge-pill mode-${t === "egreso" ? "gasto" : t}`;
      }

      const backBtn = document.getElementById("btn-back-circle");
      if (backBtn) {
        backBtn.style.color = themeColor;
      }

      // 2. Sincronizar Borde Superior de la Tarjeta Hero
      const heroCard = document.getElementById("amount-hero-card") || document.querySelector(".fin-hero-monto-card");
      if (heroCard) {
        heroCard.style.borderTop = `5px solid ${themeColor}`;
      }

      // 3. Sincronizar Botón Guardar Inferior
      if (guardarBtn) {
        guardarBtn.className = `fin-btn-filled ${t === "ingreso" ? "primary" : t === "ahorro" ? "secondary" : "error"}`;
        guardarBtn.style.setProperty("background", themeColor, "important");
        guardarBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;">save</span> <span id="submit-btn-text">Guardar ${label}</span>`;
      }

      // 4. Sincronizar Labels flotantes
      document.querySelectorAll(".fin-cat-floating-label, .fin-field-label").forEach((lbl) => {
        lbl.style.color = themeColor;
      });

      // 5. Monto y Subrayado
      const montoInput = document.getElementById("fin-monto-input");
      if (montoInput) {
        montoInput.style.color = themeColor;
        adjustHeroInputWidth();
      }

      const heroWrap = document.querySelector(".fin-hero-input-wrap");
      if (heroWrap) {
        const dashedColor = t === "ingreso"
          ? "rgba(55, 123, 76, 0.45)"
          : t === "ahorro"
          ? "rgba(81, 38, 21, 0.45)"
          : "rgba(198, 40, 40, 0.45)";
        heroWrap.style.borderBottom = `2px dashed ${dashedColor}`;
      }

      const hnlLabel = document.getElementById("fin-hnl-label");
      if (hnlLabel) hnlLabel.style.color = "#512615";

      validarForm();
    }

    function adjustHeroInputWidth() {
      if (!montoInput) return;
      const text = montoInput.value || "0.00";
      const charWidth = 23;
      const calculatedWidth = Math.max(105, Math.min(260, text.length * charWidth));
      montoInput.style.width = calculatedWidth + "px";
    }

    function updateClearButton() {
      const clearBtn = document.getElementById("clear-amount-btn");
      if (!clearBtn) return;
      if (montoValor > 0) {
        clearBtn.style.display = "inline-flex";
      } else {
        clearBtn.style.display = "none";
      }
      adjustHeroInputWidth();
    }

    document.getElementById("clear-amount-btn")?.addEventListener("click", () => {
      montoValor = 0;
      if (montoInput) montoInput.value = "0.00";
      updateClearButton();
      adjustHeroInputWidth();
      validarForm();
    });

    // Chips Rápidos (+100, +500, +1,000, +1,900 POS, Limpiar)
    document.querySelectorAll(".fin-quick-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (chip.dataset.action === "clear") {
          montoValor = 0;
          if (montoInput) montoInput.value = "0.00";
        } else if (chip.dataset.add) {
          const addVal = parseFloat(chip.dataset.add) || 0;
          montoValor = Math.max(0, (montoValor || 0) + addVal);
          if (montoInput) {
            montoInput.value = montoValor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        }
        updateClearButton();
        adjustHeroInputWidth();
        validarForm();
      });
    });

    // Monto
    if (montoInput) {
      montoInput.addEventListener("focus", () => {
        if (montoInput.value === "0.00") montoInput.value = "";
        adjustHeroInputWidth();
      });
      montoInput.addEventListener("blur", () => {
        const raw = montoInput.value.replace(/[^0-9.]/g, "");
        const num = parseFloat(raw) || 0;
        montoValor = num;
        montoInput.value = num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        updateClearButton();
        adjustHeroInputWidth();
      });
      montoInput.addEventListener("input", () => {
        const raw = montoInput.value.replace(/[^0-9.]/g, "");
        montoValor = parseFloat(raw) || 0;
        updateClearButton();
        adjustHeroInputWidth();
        validarForm();
      });
    }

    // Concepto
    if (conceptoInput) {
      conceptoInput.addEventListener("input", validarForm);
    }

    // Cantidad / Precio café
    if (cantidadInput) {
      cantidadInput.addEventListener("input", recalcularMontoCafe);
      cantidadInput.addEventListener("blur", () => {
        const raw = cantidadInput.value.replace(/[^0-9.]/g, "");
        const num = parseFloat(raw) || 0;
        cantidadInput.value = num ? num.toFixed(2) : "";
      });
    }
    if (precioInput) {
      precioInput.addEventListener("input", recalcularMontoCafe);
      precioInput.addEventListener("blur", () => {
        const raw = precioInput.value.replace(/[^0-9.]/g, "");
        const num = parseFloat(raw) || 0;
        precioInput.value = num.toFixed(2);
      });
    }

    // Finca La Rosa
    if (unidadesInput) {
      unidadesInput.addEventListener("input", recalcularMontoFinca);
      unidadesInput.addEventListener("blur", () => {
        const raw = unidadesInput.value.replace(/[^0-9.]/g, "");
        const num = parseFloat(raw) || 0;
        unidadesInput.value = num ? num.toFixed(2) : "";
      });
    }

    function validarForm() {
      if (!guardarBtn) return;
      const conceptoVal = (conceptoInput?.value || "").trim();
      const esCafe = isCategoriaCafe(categoriaSeleccionada);
      const esFinca = isCategoriaFinca(categoriaSeleccionada);
      let inputOk = montoValor > 0 && categoriaSeleccionada && conceptoVal.length > 0;

      if (esCafe) {
        const rawCant = cantidadInput.value.replace(/[^0-9.]/g, "");
        const rawPrec = precioInput.value.replace(/[^0-9.]/g, "");
        inputOk = inputOk && parseFloat(rawCant) > 0 && parseFloat(rawPrec) > 0;
      } else if (esFinca) {
        inputOk = inputOk && unidadesInput.value.replace(/[^0-9.]/g, "") !== "";
      }
      
      guardarBtn.disabled = !inputOk;
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
