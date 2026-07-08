(() => {
  "use strict";

  const PAGE_SIZE = 12; // vídeos por lote en el scroll infinito

  const state = {
    videos: [],
    categories: [],
    tools: [],
    activeCats: new Set(),
    activeTools: new Set(),
    query: "",
    sortDir: "desc", // desc = más nuevo primero (lo último, arriba)
    hideScifi: true, // por defecto sci-fi / fantasy EXCLUIDO
    filtered: [],
    rendered: 0,
  };

  const els = {
    grid: document.getElementById("grid"),
    filters: document.getElementById("filters"),
    tools: document.getElementById("tools"),
    search: document.getElementById("search"),
    sort: document.getElementById("sort"),
    count: document.getElementById("count"),
    footCount: document.getElementById("footCount"),
    title: document.getElementById("siteTitle"),
    subtitle: document.getElementById("siteSubtitle"),
    tpl: document.getElementById("cardTpl"),
  };

  init();

  async function init() {
    try {
      const res = await fetch("videos.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      state.videos = Array.isArray(data.videos) ? data.videos : [];
      state.categories = data.categories || derive("categories");
      state.tools = uniqueTools(state.videos);

      if (data.meta?.title) els.title.textContent = data.meta.title;
      if (data.meta?.subtitle) els.subtitle.textContent = data.meta.subtitle;
    } catch (err) {
      els.grid.innerHTML = `<div class="empty">No se pudo cargar videos.json — ${escapeHtml(
        err.message
      )}</div>`;
      return;
    }

    buildChips(els.filters, state.categories, "chip", state.activeCats);
    buildChips(els.tools, state.tools, "chip chip--tool", state.activeTools);
    bindEvents();
    render();
    setupInfiniteScroll();
  }

  function uniqueTools(videos) {
    return [...new Set(videos.map((v) => v.tool).filter(Boolean))].sort();
  }

  function derive(key) {
    if (key === "categories") {
      return [...new Set(state.videos.flatMap((v) => v.categories || []))].sort();
    }
    return [];
  }

  function buildChips(container, items, cls, activeSet) {
    container.innerHTML = "";
    items.forEach((label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = cls;
      btn.textContent = label;
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", () => {
        if (activeSet.has(label)) activeSet.delete(label);
        else activeSet.add(label);
        btn.setAttribute("aria-pressed", activeSet.has(label) ? "true" : "false");
        render();
      });
      container.appendChild(btn);
    });
  }

  function bindEvents() {
    els.search.addEventListener("input", (e) => {
      state.query = e.target.value.trim().toLowerCase();
      render();
    });
    els.sort.addEventListener("click", () => {
      state.sortDir = state.sortDir === "desc" ? "asc" : "desc";
      els.sort.dataset.dir = state.sortDir;
      els.sort.textContent = state.sortDir === "desc" ? "FECHA ↓" : "FECHA ↑";
      render();
    });

    const seg = document.getElementById("viewSeg");
    if (seg) {
      seg.addEventListener("click", (e) => {
        const btn = e.target.closest(".view-seg__btn");
        if (!btn) return;
        const cols = btn.dataset.cols;
        els.grid.classList.remove("grid--cols1", "grid--cols2", "grid--cols4");
        els.grid.classList.add("grid--cols" + cols);
        seg
          .querySelectorAll(".view-seg__btn")
          .forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      });
    }

    const genre = document.getElementById("genreToggle");
    if (genre) {
      genre.addEventListener("click", () => {
        state.hideScifi = !state.hideScifi;
        const included = !state.hideScifi;
        // aria-pressed = true cuando sci-fi/fantasy está INCLUIDO (relleno dorado)
        genre.setAttribute("aria-pressed", included ? "true" : "false");
        // el verbo es la ACCIÓN disponible: si están excluidos -> "Incluir"
        genre.querySelector(".genre-toggle__verb").textContent = state.hideScifi
          ? "Incluir"
          : "Excluir";
        render();
      });
    }
  }

  function matches(v) {
    // Toggle sci-fi / fantasy
    if (state.hideScifi && v.scifiFantasy) return false;
    // Categorías: el vídeo debe tener TODAS las categorías activas
    for (const c of state.activeCats) {
      if (!(v.categories || []).includes(c)) return false;
    }
    // Herramientas: OR entre las activas
    if (state.activeTools.size && !state.activeTools.has(v.tool)) return false;
    // Búsqueda de texto
    if (state.query) {
      const hay = `${v.title} ${v.director} ${v.tool} ${(v.categories || []).join(" ")}`.toLowerCase();
      if (!hay.includes(state.query)) return false;
    }
    return true;
  }

  function render() {
    // Vídeos sin fecha se van al final; el resto por fecha (lo último, arriba)
    state.filtered = state.videos.filter(matches).sort((a, b) => {
      const da = a.date || "";
      const db = b.date || "";
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return state.sortDir === "desc" ? db.localeCompare(da) : da.localeCompare(db);
    });

    els.count.textContent = `${state.filtered.length}/${state.videos.length}`;
    els.footCount.textContent = `${state.filtered.length} VÍDEOS`;

    els.grid.innerHTML = "";
    state.rendered = 0;

    if (!state.filtered.length) {
      els.grid.innerHTML = `<div class="empty">Sin resultados con estos filtros</div>`;
      return;
    }

    appendPage();
  }

  function appendPage() {
    const next = state.filtered.slice(state.rendered, state.rendered + PAGE_SIZE);
    if (!next.length) return;
    const frag = document.createDocumentFragment();
    next.forEach((v) => frag.appendChild(card(v)));
    els.grid.appendChild(frag);
    state.rendered += next.length;
  }

  function setupInfiniteScroll() {
    const sentinel = document.getElementById("sentinel");
    if (!sentinel || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) appendPage();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(sentinel);
  }

  function card(v) {
    const node = els.tpl.content.firstElementChild.cloneNode(true);
    const thumb = node.querySelector(".thumb");
    const img = node.querySelector(".thumb__img");

    img.src = `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`;
    img.alt = v.title || "";
    thumb.setAttribute("aria-label", `Reproducir: ${v.title || ""}`);
    thumb.addEventListener("click", () => playInline(thumb, v.youtubeId));

    const dateBadge = node.querySelector(".thumb__date");
    if (v.date) {
      dateBadge.textContent = fmtDate(v.date);
    } else {
      dateBadge.textContent = "FECHA S/D";
      dateBadge.classList.add("thumb__date--empty");
    }

    node.querySelector(".card__title").textContent = v.title || "Sin título";
    node.querySelector(".card__dir").textContent = v.director || "—";
    node.querySelector(".card__date").textContent = fmtDate(v.date);

    const body = node.querySelector(".card__body");

    if (v.highlight) {
      const hi = document.createElement("span");
      hi.className = "card__highlight";
      hi.textContent = v.highlight;
      body.insertBefore(hi, body.querySelector(".card__tags"));
    }

    const tools = node.querySelector(".card__tool");
    if (v.tool) tools.textContent = v.tool;
    else tools.remove();

    const tags = node.querySelector(".card__tags");
    (v.categories || []).forEach((c) => {
      const t = document.createElement("span");
      t.className = "tag";
      t.textContent = c;
      tags.appendChild(t);
    });

    if (v.description) {
      const desc = document.createElement("p");
      desc.className = "card__desc";
      desc.textContent = v.description;
      body.appendChild(desc);
    }

    if (v.source) {
      const link = document.createElement("a");
      link.className = "card__source";
      link.href = v.source;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "VER FUENTE ↗";
      body.appendChild(link);
    }

    return node;
  }

  function playInline(thumb, ytId) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`;
    iframe.title = "YouTube";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    thumb.replaceChildren(iframe);
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    if (!y) return iso;
    return `${d || "01"}.${m || "01"}.${y}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }
})();
