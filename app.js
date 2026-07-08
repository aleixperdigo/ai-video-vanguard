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
    sortMode: "date", // "date" | "likes"
    sortDir: "desc", // desc = más nuevo primero (lo último, arriba)
    hideScifi: true, // por defecto sci-fi / fantasy EXCLUIDO (OUT)
    hideAds: false, // por defecto ads INCLUIDOS (IN)
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
    const sortLikes = document.getElementById("sortLikes");
    const updateSortActive = () => {
      els.sort.setAttribute("aria-pressed", state.sortMode === "date" ? "true" : "false");
      if (sortLikes)
        sortLikes.setAttribute("aria-pressed", state.sortMode === "likes" ? "true" : "false");
    };

    els.sort.addEventListener("click", () => {
      if (state.sortMode !== "date") {
        state.sortMode = "date"; // volver a orden temporal
      } else {
        state.sortDir = state.sortDir === "desc" ? "asc" : "desc";
      }
      els.sort.dataset.dir = state.sortDir;
      els.sort.textContent = state.sortDir === "desc" ? "FECHA ↓" : "FECHA ↑";
      updateSortActive();
      render();
    });

    if (sortLikes) {
      sortLikes.addEventListener("click", () => {
        state.sortMode = "likes";
        updateSortActive();
        render();
      });
    }

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
        // aria-pressed / relleno dorado = INCLUIDO (IN)
        genre.setAttribute("aria-pressed", included ? "true" : "false");
        genre.querySelector(".filter-toggle__state").textContent = included ? "IN" : "OUT";
        render();
      });
    }

    const ads = document.getElementById("adsToggle");
    if (ads) {
      ads.addEventListener("click", () => {
        state.hideAds = !state.hideAds;
        const included = !state.hideAds;
        ads.setAttribute("aria-pressed", included ? "true" : "false");
        ads.querySelector(".filter-toggle__state").textContent = included ? "IN" : "OUT";
        render();
      });
    }
  }

  function matches(v) {
    // Toggle sci-fi / fantasy
    if (state.hideScifi && v.scifiFantasy) return false;
    // Toggle ads
    if (state.hideAds && v.ads) return false;
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
    // Comparador de fecha: sin fecha al final; newest-first en desc
    const byDate = (a, b, dir) => {
      const da = a.date || "";
      const db = b.date || "";
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return dir === "asc" ? da.localeCompare(db) : db.localeCompare(da);
    };

    state.filtered = state.videos.filter(matches).sort((a, b) => {
      if (state.sortMode === "likes") {
        const diff = getLikes(b.id) - getLikes(a.id); // más likes primero
        if (diff !== 0) return diff;
        return byDate(a, b, "desc"); // la fecha queda en segundo término
      }
      return byDate(a, b, state.sortDir);
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

    const like = document.createElement("button");
    like.className = "card__like";
    like.type = "button";
    like.setAttribute("aria-label", "Me gusta");
    like.innerHTML =
      '<svg class="card__like-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 1.9 5 5.4 5c2 0 3.4 1.1 4.6 2.6C11.2 6.1 12.6 5 14.6 5 18.1 5 19.6 8.6 22 11.8 19.5 16.4 12 21 12 21z"/></svg>' +
      '<span class="card__like-count">' + getLikes(v.id) + "</span>";
    like.addEventListener("click", () => {
      const n = addLike(v.id);
      like.querySelector(".card__like-count").textContent = n;
      like.classList.remove("is-pop");
      void like.offsetWidth; // reinicia la animación
      like.classList.add("is-pop");
      // si ordenamos por likes, re-render para reflejar el nuevo orden
      if (state.sortMode === "likes") render();
    });
    body.appendChild(like);

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

  // ---- Likes (localStorage; sin backend, cada like suma 1) ----
  const LIKES_KEY = "videoLikes";
  function getLikesMap() {
    try {
      return JSON.parse(localStorage.getItem(LIKES_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  function getLikes(id) {
    return getLikesMap()[id] || 0;
  }
  function addLike(id) {
    const map = getLikesMap();
    map[id] = (map[id] || 0) + 1;
    try {
      localStorage.setItem(LIKES_KEY, JSON.stringify(map));
    } catch (e) {}
    return map[id];
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
