/* ============================================================
   M3 DATE PICKER — CAFÉ CORTERO
   Modal al estilo Material 3 Expressive
   ============================================================ */

(function () {
  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DAYS = ["Do","Lu","Ma","Mi","Ju","Vi","Sá"];

  window.initM3DatePicker = function ({ inputDisplay, inputHidden, onSelect }) {
    let fecha = inputHidden?.value ? new Date(inputHidden.value + "T12:00:00") : new Date();
    let viewYear = fecha.getFullYear();
    let viewMonth = fecha.getMonth();
    let selectedDate = new Date(fecha);

    const overlay = document.createElement("div");
    const dialog = document.createElement("div");

    function build() {
      overlay.className = "m3-dp-overlay";
      dialog.className = "m3-dp-dialog";
      dialog.innerHTML = `
        <div class="m3-dp-header">
          <div class="m3-dp-header-year">${selectedDate.getFullYear()}</div>
          <div class="m3-dp-header-date">${DAYS[selectedDate.getDay()]}, ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}</div>
        </div>
        <div class="m3-dp-body">
          <div class="m3-dp-nav">
            <button class="m3-dp-nav-btn" id="m3-dp-prev"><span class="material-symbols-outlined">chevron_left</span></button>
            <span class="m3-dp-nav-label">${MONTHS[viewMonth]} ${viewYear}</span>
            <button class="m3-dp-nav-btn" id="m3-dp-next"><span class="material-symbols-outlined">chevron_right</span></button>
          </div>
          <div class="m3-dp-weekdays">${DAYS.map(d => `<span>${d}</span>`).join("")}</div>
          <div class="m3-dp-grid" id="m3-dp-grid"></div>
        </div>
        <div class="m3-dp-actions">
          <button class="m3-dp-btn" id="m3-dp-cancel">Cancelar</button>
          <button class="m3-dp-btn m3-dp-btn-primary" id="m3-dp-ok">Aceptar</button>
        </div>
      `;

      document.body.appendChild(overlay);
      document.body.appendChild(dialog);

      requestAnimationFrame(() => {
        overlay.classList.add("open");
        dialog.classList.add("open");
      });

      renderGrid();

      document.getElementById("m3-dp-prev").addEventListener("click", () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderGrid(); });
      document.getElementById("m3-dp-next").addEventListener("click", () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderGrid(); });
      document.getElementById("m3-dp-cancel").addEventListener("click", close);
      document.getElementById("m3-dp-ok").addEventListener("click", () => {
        const iso = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
        if (inputHidden) inputHidden.value = iso;
        if (inputDisplay) inputDisplay.value = selectedDate.toLocaleDateString("es-HN", { day: "2-digit", month: "long", year: "numeric" });
        if (onSelect) onSelect(iso);
        close();
      });
      overlay.addEventListener("click", close);
    }

    function renderGrid() {
      const grid = document.getElementById("m3-dp-grid");
      const firstDay = new Date(viewYear, viewMonth, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      const selStr = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;

      let cells = [];
      for (let i = 0; i < firstDay; i++) cells.push(`<span></span>`);
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${viewYear}-${viewMonth}-${d}`;
        const isToday = dateStr === todayStr;
        const isSel = dateStr === selStr;
        cells.push(`<button class="m3-dp-day${isToday ? " today" : ""}${isSel ? " selected" : ""}" data-day="${d}">${d}</button>`);
      }
      grid.innerHTML = cells.join("");

      grid.querySelectorAll(".m3-dp-day").forEach(btn => {
        btn.addEventListener("click", () => {
          grid.querySelectorAll(".m3-dp-day").forEach(c => c.classList.remove("selected"));
          btn.classList.add("selected");
          selectedDate = new Date(viewYear, viewMonth, parseInt(btn.dataset.day));
          const headerYear = dialog.querySelector(".m3-dp-header-year");
          const headerDate = dialog.querySelector(".m3-dp-header-date");
          if (headerYear) headerYear.textContent = selectedDate.getFullYear();
          if (headerDate) headerDate.textContent = `${DAYS[selectedDate.getDay()]}, ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`;
        });
      });
    }

    function close() {
      overlay.classList.remove("open");
      dialog.classList.remove("open");
      setTimeout(() => { overlay.remove(); dialog.remove(); }, 300);
    }

    build();
  };
})();
