// ---------------------------------------------------------------
// Árbol de la Flor del Ceibo — mujeres indígenas por provincia
// ---------------------------------------------------------------
// Hoy las flores son círculos placeholder (SVG). El día que tengas
// las flores pintadas, cada provincia puede sumar un campo "imagen"
// (ej: "assets/flores/salta.png") y en createFlower() se reemplaza
// el <circle> por un <image> apuntando a ese archivo, sin tocar
// el resto de la lógica.
// ---------------------------------------------------------------

const SVG_NS = "http://www.w3.org/2000/svg";
const CANOPY_CENTER = { x: 500, y: 300 };
const RADIUS_RANGE = [14, 46];   // tamaño mínimo/máximo de flor en px
const PUEBLOS_VISIBLES = 8;      // cuántos pueblos mostrar en el panel (el resto se agrupa)

let currentData = null;
let selectedFlowerEl = null;

init();

async function init() {
  try {
    const res = await fetch("data/data.json");
    currentData = await res.json();
  } catch (err) {
    console.error("No se pudo cargar data/data.json —  ¿estás sirviendo el sitio con Live Server?", err);
    return;
  }
  drawTrunk();
  drawFlowers(currentData.provincias);
  setupPanelClose();
}

// ---------- Tronco y ramas (decorativo, simplificado) ----------
function drawTrunk() {
  const layer = document.getElementById("trunk-layer");
  const trunk = document.createElementNS(SVG_NS, "path");
  trunk.setAttribute(
    "d",
    "M500,800 L500,520 C500,480 470,440 440,420 M500,520 C500,480 530,440 560,420 M500,600 C500,570 460,540 420,530 M500,600 C500,570 540,540 580,530"
  );
  trunk.setAttribute("stroke", "#2F4B3C");
  trunk.setAttribute("stroke-width", "10");
  trunk.setAttribute("stroke-linecap", "round");
  trunk.setAttribute("fill", "none");
  trunk.setAttribute("opacity", "0.85");
  layer.appendChild(trunk);
}

// ---------- Flores ----------
function drawFlowers(provincias) {
  const layer = document.getElementById("flowers-layer");
  const values = provincias.map((p) => p.mujeres_indigenas);
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Distribución tipo espiral de phyllotaxis: da un look de "copa de árbol" orgánico
  const golden = Math.PI * (3 - Math.sqrt(5));
  const ordered = [...provincias].sort((a, b) => b.mujeres_indigenas - a.mujeres_indigenas);

  ordered.forEach((prov, i) => {
    const t = i / (ordered.length - 1);
    const dist = 40 + t * 230; // más grandes cerca del centro, más chicas hacia afuera
    const angle = i * golden;
    const x = CANOPY_CENTER.x + Math.cos(angle) * dist;
    const y = CANOPY_CENTER.y + Math.sin(angle) * dist * 0.85; // achatado para look de copa

    const radius = mapRange(prov.mujeres_indigenas, min, max, RADIUS_RANGE[0], RADIUS_RANGE[1]);
    const el = createFlower(prov, x, y, radius);
    layer.appendChild(el);
  });
}

function createFlower(prov, x, y, radius) {
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("class", "flower");
  g.setAttribute("tabindex", "0");
  g.setAttribute("role", "button");
  g.setAttribute("aria-label", `${prov.provincia}: ${formatNumber(prov.mujeres_indigenas)} mujeres indígenas`);
  g.dataset.provincia = prov.provincia;

  // pétalos simples (5 círculos alrededor del núcleo) — placeholder hasta tener la ilustración
  const petalColor = "#D9695C";
  for (let p = 0; p < 5; p++) {
    const pa = (p / 5) * Math.PI * 2;
    const px = x + Math.cos(pa) * radius * 0.55;
    const py = y + Math.sin(pa) * radius * 0.55;
    const petal = document.createElementNS(SVG_NS, "circle");
    petal.setAttribute("cx", px);
    petal.setAttribute("cy", py);
    petal.setAttribute("r", radius * 0.5);
    petal.setAttribute("fill", petalColor);
    petal.setAttribute("opacity", "0.9");
    g.appendChild(petal);
  }

  const core = document.createElementNS(SVG_NS, "circle");
  core.setAttribute("class", "flower-core");
  core.setAttribute("cx", x);
  core.setAttribute("cy", y);
  core.setAttribute("r", radius * 0.45);
  core.setAttribute("fill", "#E8A33D");
  g.appendChild(core);

  g.addEventListener("click", () => selectFlower(g, prov));
  g.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectFlower(g, prov);
    }
  });

  return g;
}

function selectFlower(el, prov) {
  if (selectedFlowerEl) selectedFlowerEl.classList.remove("selected");
  el.classList.add("selected");
  selectedFlowerEl = el;
  renderPanel(prov);
}

// ---------- Panel lateral ----------
function renderPanel(prov) {
  const panel = document.getElementById("panel");
  const content = document.getElementById("panel-content");
  panel.classList.add("has-content");
  panel.setAttribute("aria-hidden", "false");

  const visibles = prov.pueblos.slice(0, PUEBLOS_VISIBLES);
  const resto = prov.pueblos.slice(PUEBLOS_VISIBLES);
  const restoTotal = resto.reduce((acc, p) => acc + p.mujeres, 0);

  let html = `
    <h2 class="panel-provincia">${prov.provincia}</h2>
    <p class="panel-total"><strong>${formatNumber(prov.mujeres_indigenas)}</strong> mujeres indígenas
    <br>${prov.pct_nacional}% del total nacional</p>
    <div class="pueblos-list">
  `;

  for (const pueblo of visibles) {
    html += buildPuebloRow(pueblo.pueblo, pueblo.mujeres, pueblo.pct_provincia);
  }
  if (resto.length > 0) {
    const pctResto = Math.round((restoTotal / prov.mujeres_indigenas) * 1000) / 10;
    html += buildPuebloRow(`Otros ${resto.length} pueblos`, restoTotal, pctResto);
  }

  html += `</div>`;
  content.innerHTML = html;
}

function buildPuebloRow(nombre, valor, pct) {
  return `
    <div class="pueblo-row">
      <div class="pueblo-row-top">
        <span class="pueblo-nombre">${nombre}</span>
        <span class="pueblo-valor">${formatNumber(valor)} · ${pct}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${Math.min(pct, 100)}%"></div>
      </div>
    </div>
  `;
}

function setupPanelClose() {
  document.getElementById("panel-close").addEventListener("click", () => {
    const panel = document.getElementById("panel");
    panel.classList.remove("has-content");
    panel.setAttribute("aria-hidden", "true");
    document.getElementById("panel-content").innerHTML =
      '<p class="panel-hint">Elegí una flor del árbol para explorar los pueblos indígenas presentes en esa provincia.</p>';
    if (selectedFlowerEl) selectedFlowerEl.classList.remove("selected");
    selectedFlowerEl = null;
  });
}

// ---------- Utils ----------
function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return (outMin + outMax) / 2;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function formatNumber(n) {
  return n.toLocaleString("es-AR");
}
