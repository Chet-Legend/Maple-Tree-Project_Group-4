import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createChapter() {
  // --- internal state ---
  let root, svgOuter, svg, g;
  let width = 900, height = 560;

  let nodes = [];     // original data objects {id, value, group?, ...}
  let simNodes = [];  // positioned nodes after beeswarm simulation {x,y,value,...}

  let x;              // x-scale
  let innerW, innerH;
  const margin = { top: 28, right: 24, bottom: 56, left: 64 };

  // Keep track of current step so resize can re-apply it
  let currentStepId = null;

  // Convenience: pick a numeric column from incoming data
  function pickNumericColumn(rows) {
    if (!rows?.length) return null;
    const keys = Object.keys(rows[0]);
    // Prefer common names if they exist
    const preferred = ["pfas", "pfas_conc", "concentration", "value", "y"];
    for (const k of preferred) {
      if (k in rows[0] && typeof rows[0][k] === "number") return k;
    }
    // Otherwise first numeric key
    const numKey = keys.find((k) => typeof rows[0][k] === "number");
    return numKey ?? null;
  }

  // Convenience: pick a group column if present
  function pickGroupColumn(rows) {
    if (!rows?.length) return null;
    const keys = Object.keys(rows[0]);
    const preferred = ["group", "site", "treatment", "year"];
    for (const k of preferred) {
      if (keys.includes(k)) return k;
    }
    return null;
  }

  function buildPlaceholderData() {
    // nice spread with a couple high-ish outliers
    const base = d3.range(55).map((i) => ({
      id: i,
      value: Math.max(0, d3.randomNormal(40, 12)()),
      group: i % 2 === 0 ? "Site A" : "Site B"
    }));
    base.push({ id: 1001, value: 82, group: "Site A" });
    base.push({ id: 1002, value: 91, group: "Site B" });
    return base;
  }

  function computeLayout() {
    innerW = width - margin.left - margin.right;
    innerH = height - margin.top - margin.bottom;

    x = d3
      .scaleLinear()
      .domain(d3.extent(nodes, (d) => d.value))
      .nice()
      .range([0, innerW]);

    // Beeswarm via force simulation
    simNodes = nodes.map((d) => ({ ...d }));

    const sim = d3
      .forceSimulation(simNodes)
      .force("x", d3.forceX((d) => x(d.value)).strength(1))
      .force("y", d3.forceY(innerH / 2).strength(0.08))
      .force("collide", d3.forceCollide(7))
      .stop();

    for (let i = 0; i < 260; i++) sim.tick();
  }

  function renderBase() {
    svg.selectAll("*").remove();

    g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Axis (tagged so we can fade it in step 04 if you want)
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x));

    g.append("text")
      .attr("class", "x-label")
      .attr("x", innerW / 2)
      .attr("y", innerH + 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .text("PFAS concentration (or chosen numeric column)");

    // A layer for intervals (uncertainty whiskers) — empty until step 04
    g.append("g").attr("class", "interval-layer");

    // Dot layer
    g.append("g")
      .attr("class", "dot-layer")
      .selectAll("circle")
      .data(simNodes, (d) => d.id)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 6)
      .attr("opacity", 0.9)
      .attr("fill", "#6b7280"); // neutral gray
  }

  // --- Step behaviors ---

  function step01() {
    // reset to neutral dots
    g.select(".interval-layer").selectAll("*").remove();

    g.selectAll("circle.dot")
      .interrupt()
      .transition()
      .duration(450)
      .attr("r", 6)
      .attr("opacity", 0.9)
      .attr("fill", "#6b7280");

    g.selectAll(".x-axis").transition().duration(300).style("opacity", 1);
    g.selectAll(".x-label").transition().duration(300).style("opacity", 1);
  }

  function step02() {
    // color by group if we have it; otherwise do a gentle highlight sweep
    const hasGroup = simNodes.some((d) => d.group != null && `${d.group}`.length);

    g.select(".interval-layer").selectAll("*").remove();

    if (hasGroup) {
      const groups = Array.from(new Set(simNodes.map((d) => d.group)));
      const color = d3.scaleOrdinal().domain(groups).range(d3.schemeTableau10);

      g.selectAll("circle.dot")
        .interrupt()
        .transition()
        .duration(550)
        .attr("fill", (d) => color(d.group))
        .attr("opacity", 0.9)
        .attr("r", 6);
    } else {
      g.selectAll("circle.dot")
        .interrupt()
        .transition()
        .duration(550)
        .attr("fill", "#2563eb")
        .attr("opacity", 0.85)
        .attr("r", 6);
    }

    g.selectAll(".x-axis").transition().duration(300).style("opacity", 1);
    g.selectAll(".x-label").transition().duration(300).style("opacity", 1);
  }

  function step03() {
    // highlight top ~10% as "extremes"
    const values = simNodes.map((d) => d.value).filter(Number.isFinite).sort(d3.ascending);
    const cutoff = d3.quantile(values, 0.9);

    g.select(".interval-layer").selectAll("*").remove();

    g.selectAll("circle.dot")
      .interrupt()
      .transition()
      .duration(550)
      .attr("opacity", (d) => (d.value >= cutoff ? 1 : 0.25))
      .attr("r", (d) => (d.value >= cutoff ? 8 : 6))
      .attr("fill", (d) => (d.value >= cutoff ? "#ef4444" : "#6b7280"));

    g.selectAll(".x-axis").transition().duration(300).style("opacity", 1);
    g.selectAll(".x-label").transition().duration(300).style("opacity", 1);
  }

  function step04_uncertaintyIntervals() {
    // NYT-ish move: show dot + horizontal uncertainty interval for each point.
    // We'll compute an "error" in data units, then convert to pixels.
    //
    // You can later replace this with real measurement error (e.g., from replicate SD or lab-reported uncertainty).
    const domain = x.domain();
    const domainSpan = (domain[1] - domain[0]) || 1;

    // base uncertainty: 4% of the data span, with a small amount of heterogeneity
    // (kept subtle so it reads as measurement error, not chaos)
    function errFor(d) {
      const base = 0.04 * domainSpan;
      const wiggle = (0.02 * domainSpan) * (0.3 + 0.7 * Math.random());
      return Math.max(0, base + wiggle);
    }

    // Prepare per-node interval endpoints in pixel coordinates
    const intervals = simNodes.map((d) => {
      const e = errFor(d);
      const lo = d.value - e;
      const hi = d.value + e;
      return {
        id: d.id,
        y: d.y,
        x1: x(lo),
        x2: x(hi),
        cx: d.x,
        value: d.value,
        group: d.group
      };
    });

    // Fade dots slightly and shrink them a bit (but keep them!)
    g.selectAll("circle.dot")
      .interrupt()
      .transition()
      .duration(450)
      .attr("r", 4.5)
      .attr("opacity", 0.8)
      .attr("fill", "#111827"); // darker dot reads like "estimate"

    // Draw intervals behind dots (like NYT does)
    const layer = g.select(".interval-layer");

    // If you want group-colored intervals later, you can swap stroke color logic here.
    const lines = layer.selectAll("line.interval").data(intervals, (d) => d.id);

    lines
      .join(
        (enter) =>
          enter
            .append("line")
            .attr("class", "interval")
            .attr("x1", (d) => d.cx) // start collapsed at the dot
            .attr("x2", (d) => d.cx)
            .attr("y1", (d) => d.y)
            .attr("y2", (d) => d.y)
            .attr("stroke", "#9ca3af")
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round")
            .attr("opacity", 0.0)
            .call((sel) =>
              sel
                .transition()
                .duration(650)
                .attr("opacity", 0.9)
                .attr("x1", (d) => d.x1)
                .attr("x2", (d) => d.x2)
            ),
        (update) =>
          update.call((sel) =>
            sel
              .transition()
              .duration(650)
              .attr("opacity", 0.9)
              .attr("y1", (d) => d.y)
              .attr("y2", (d) => d.y)
              .attr("x1", (d) => d.x1)
              .attr("x2", (d) => d.x2)
          ),
        (exit) => exit.transition().duration(250).attr("opacity", 0).remove()
      );

    // Optional: slightly deemphasize axis to reinforce “approximate”
    g.selectAll(".x-axis").transition().duration(300).style("opacity", 0.6);
    g.selectAll(".x-label").transition().duration(300).style("opacity", 0.7);
  }

  function applyStep(stepId) {
    currentStepId = stepId;

    // You can match on exact ids from your manifest:
    // c02-step-01 ... c02-step-04
    if (stepId === "c02-step-01") return step01();
    if (stepId === "c02-step-02") return step02();
    if (stepId === "c02-step-03") return step03();
    if (stepId === "c02-step-04") return step04_uncertaintyIntervals();

    // fallback
    step01();
  }

  // --- Required chapter API ---
  function init(container, ctx) {
    root = d3.select(container);

    width = root.node().clientWidth || 900;
    height = root.node().clientHeight || 560;

    svgOuter = root
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg = svgOuter.append("g");

    // Load data if provided by main.js, else placeholder
    // ctx.chapterData is an object keyed by dataFiles entries
    const chapterData = ctx?.chapterData ?? null;

    let rows = null;
    if (chapterData && typeof chapterData === "object") {
      const firstKey = Object.keys(chapterData)[0];
      if (firstKey) rows = chapterData[firstKey];
    }

    if (Array.isArray(rows) && rows.length) {
      const numKey = pickNumericColumn(rows);
      const groupKey = pickGroupColumn(rows);

      if (numKey) {
        nodes = rows
          .map((d, i) => ({
            id: d.id ?? i,
            value: +d[numKey],
            group: groupKey ? d[groupKey] : undefined
          }))
          .filter((d) => Number.isFinite(d.value));
      } else {
        nodes = buildPlaceholderData();
      }
    } else {
      nodes = buildPlaceholderData();
    }

    computeLayout();
    renderBase();

    // Start at step 01 visuals by default (until first scroll event)
    applyStep("c02-step-01");
  }

  function resize(w, h) {
    width = w ?? width;
    height = h ?? height;

    svgOuter.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);

    // Recompute layout at new size
    computeLayout();
    renderBase();

    // Re-apply whatever step is active so intervals/outliers persist across resize
    applyStep(currentStepId ?? "c02-step-01");
  }

  function onStepEnter(stepId) {
    applyStep(stepId);
  }

  return { init, resize, onStepEnter };
}