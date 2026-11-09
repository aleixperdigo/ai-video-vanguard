// Logo que "se genera": ruido -> nítido en pasos, como un modelo de difusión.
(() => {
  const logo = document.getElementById("siteTitle");
  if (!logo) return;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.innerHTML = '<filter id="denoise" x="-5%" y="-20%" width="110%" height="140%">' +
    '<feTurbulence id="dnTurb" type="fractalNoise" baseFrequency="0.9 0.35" numOctaves="1" seed="1"/>' +
    '<feDisplacementMap id="dnDisp" in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
  document.body.appendChild(svg);
  const turb = svg.querySelector("#dnTurb"), disp = svg.querySelector("#dnDisp");

  const tag = document.createElement("span");
  tag.className = "logo-seed";
  tag.setAttribute("aria-hidden", "true");
  logo.parentElement.insertAdjacentElement("afterend", tag);

  const STEPS = 12, STEP_MS = 70;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let seed = 0, busy = false;
  const newSeed = () => (seed = 10000 + Math.floor(Math.random() * 89999));
  const idle = () => (tag.textContent = `seed ${seed} · ${STEPS}/${STEPS} steps`);

  function generate() {
    if (busy || reduce) return;
    busy = true;
    newSeed();
    logo.style.filter = "url(#denoise)";
    let i = 0;
    const tick = () => {
      const left = 1 - i / STEPS;                 // 1 -> 0
      turb.setAttribute("seed", seed + i);        // ruido distinto en cada paso
      disp.setAttribute("scale", (60 * left * left).toFixed(1));
      tag.textContent = `denoising ${String(i).padStart(2, "0")}/${STEPS}`;
      if (i++ < STEPS) return setTimeout(tick, STEP_MS);
      logo.style.filter = "";
      idle();
      busy = false;
    };
    tick();
  }

  // Selector de tema: Paper (por defecto: negro + naranja) / Dark (negro original con azul)
  const root = document.documentElement, sw = document.getElementById("themeSwitch");
  const sheet = document.getElementById("themeArchivo");
  if (sw && sheet) {
    const label = () => (sw.textContent = sheet.disabled ? "Paper" : "Dark");
    label();
    sw.addEventListener("click", () => {
      sheet.disabled = !sheet.disabled;
      root.classList.toggle("classic", sheet.disabled);
      try { localStorage.setItem("theme", sheet.disabled ? "classic" : "archive"); } catch (e) {}
      label();
      generate();
    });
  }

  // Al salir la cabecera de pantalla, el título entra en la barra de controles
  const bar = document.querySelector(".controls"), head = document.querySelector(".masthead");
  if (bar && head && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => bar.classList.toggle("controls--titled", !e.isIntersecting)).observe(head);
  }

  newSeed(); idle();
  if (!reduce) {
    setTimeout(generate, 300);                    // al cargar
    setInterval(generate, 14000);                 // de vez en cuando, sin agobiar
    logo.addEventListener("mouseenter", generate);
  }
})();
