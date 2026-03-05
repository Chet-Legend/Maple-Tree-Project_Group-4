import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

async function initHero() {
  const root = d3.select("#scrolly-root");
  const heroSection = root
    .append("section")
    .attr("class", "hero")
    .attr("id", "hero");

  const mount = heroSection.append("div").attr("class", "hero-mount").node();

  const mod = await import("./hero/hero.js");
  if (typeof mod.createHero !== "function") {
    throw new Error("Missing export createHero() in hero/hero.js");
  }

  const hero = mod.createHero();
  hero.init(mount);

  // optional: resize hook
  window.addEventListener("resize", () => hero.resize?.(mount.clientWidth, mount.clientHeight));
}


const CHAPTERS_DIR = "./chapters";
const scroller = scrollama();

const state = {
  shared: {},
  stepToChapterId: new Map(),
  chapters: new Map(), // chapterId -> { folder, manifest, api, visNode }
};

async function loadShared() {
  return {
    config: {
      defaultVisHeight: 520
    }
  };
}

async function loadChapterFolderList() {
  const idx = await d3.json(`${CHAPTERS_DIR}/index.json`);
  if (!idx?.chapters?.length) throw new Error("chapters/index.json missing/empty");
  return idx.chapters;
}

async function loadManifests(folders) {
  const ms = await Promise.all(
    folders.map(async (folder) => {
      const manifest = await d3.json(`${CHAPTERS_DIR}/${folder}/manifest.json`);
      return { folder, manifest };
    })
  );

  const seenSteps = new Set();
  for (const { folder, manifest } of ms) {
    if (!manifest?.id || !manifest?.title || manifest?.order == null || !manifest?.namespace) {
      throw new Error(`Missing required manifest fields in ${folder}/manifest.json`);
    }
    if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) {
      throw new Error(`Manifest steps missing/empty in ${folder}/manifest.json`);
    }
    for (const s of manifest.steps) {
      if (!s?.id) throw new Error(`Step missing id in ${folder}/manifest.json`);
      if (seenSteps.has(s.id)) throw new Error(`Duplicate step id "${s.id}"`);
      seenSteps.add(s.id);
      if (!s.id.startsWith(`${manifest.namespace}-`)) {
        throw new Error(`Step "${s.id}" must start with "${manifest.namespace}-"`);
      }
    }
  }

  ms.sort((a, b) => a.manifest.order - b.manifest.order);
  return ms;
}

function injectChapterCSS(folder, manifest) {
  const id = `css-${manifest.id}`;
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `${CHAPTERS_DIR}/${folder}/chapter.css`;
  document.head.appendChild(link);
}

function buildPageScaffold(loaded) {
  const root = d3.select("#scrolly-root");
  if (root.empty()) throw new Error('Missing <main id="scrolly-root"></main>');

  for (const { folder, manifest } of loaded) {
    const section = root
      .append("section")
      .attr("class", `chapter ${manifest.namespace}`)
      .attr("data-chapter", manifest.namespace)
      .attr("id", manifest.id);

    const visCol = section.append("div").attr("class", "chapter-vis");
    const visMount = visCol.append("div").attr("class", "vis-mount").node();

    const overlay = section.append("div").attr("class", "chapter-overlay");

    const stepSel = overlay
      .selectAll("div.step")
      .data(manifest.steps)
      .join("div")
      .attr("class", "step")
      .attr("data-step", d => d.id)
      .attr("data-chapter-id", manifest.id);

    const card = stepSel.append("div").attr("class", "step-card");
    card.append("h3").text(d => d.label ?? d.id);
    card.append("p").text(d => d.text ?? "");

    manifest.steps.forEach(s => state.stepToChapterId.set(s.id, manifest.id));
    state.chapters.set(manifest.id, { folder, manifest, api: null, visNode: visMount });

    injectChapterCSS(folder, manifest);
  }
}

async function loadChapterData(folder, manifest) {
  const files = Array.isArray(manifest.dataFiles) ? manifest.dataFiles : [];
  const out = {};
  for (const relPath of files) {
    const full = `${CHAPTERS_DIR}/${folder}/${relPath}`;
    if (relPath.toLowerCase().endsWith(".csv")) out[relPath] = await d3.csv(full, d3.autoType);
    else if (relPath.toLowerCase().endsWith(".json")) out[relPath] = await d3.json(full);
    else throw new Error(`Unsupported data file type: ${relPath}`);
  }
  return out;
}

async function initChapters() {
  for (const ch of state.chapters.values()) {
    const moduleUrl = `${CHAPTERS_DIR}/${ch.folder}/chapter.js`;
    const mod = await import(moduleUrl);

    if (typeof mod.createChapter !== "function") {
      throw new Error(`Missing export createChapter() in ${ch.folder}/chapter.js`);
    }

    const api = mod.createChapter();
    if (typeof api.init !== "function" || typeof api.resize !== "function" || typeof api.onStepEnter !== "function") {
      throw new Error(`Incomplete chapter API in ${ch.folder}/chapter.js`);
    }

    const chapterData = await loadChapterData(ch.folder, ch.manifest);

    api.init(ch.visNode, { shared: state.shared, manifest: ch.manifest, chapterData });
    api.resize(ch.visNode.clientWidth, ch.visNode.clientHeight || 600);

    ch.api = api;
  }
}

function setupScrollama() {
  scroller
    .setup({ step: ".step", offset: 0.65, debug: false })
    .onStepEnter(({ element, direction }) => {
      const stepId = element.getAttribute("data-step");
      const chapterId = state.stepToChapterId.get(stepId);
      const ch = state.chapters.get(chapterId);
      if (!ch?.api) return;

      ch.api.onStepEnter(stepId, direction);
      d3.select(element).classed("is-active", true);
    })
    .onStepExit(({ element }) => d3.select(element).classed("is-active", false));

  window.addEventListener("resize", () => {
    scroller.resize();
    for (const ch of state.chapters.values()) {
      if (!ch.api) continue;
      ch.api.resize(ch.visNode.clientWidth, ch.visNode.clientHeight || 600);
    }
  });
}

async function main() {
  state.shared = await loadShared();
  await initHero();
  const folders = await loadChapterFolderList();
  const loaded = await loadManifests(folders);
  buildPageScaffold(loaded);
  await initChapters();
  setupScrollama();
}

main().catch(err => {
  console.error(err);
  const root = document.getElementById("scrolly-root");
  if (root) root.innerHTML = `<pre style="max-width:980px;margin:24px auto;padding:16px;border:2px solid #111;background:#fff;color:#111;white-space:pre-wrap;">${String(err.stack || err.message || err)}</pre>`;
});
