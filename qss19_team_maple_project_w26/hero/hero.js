// hero/hero.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createHero() {
  let root, svg, w, h;

  // Layers / elements
  let bgRect;
  let hazeLayer, dots, particles;

  // Tree (SVG <image>)
  let treeImage;

  // Animation handles
  let hazeTimer = null;

  // HTML overlay
  let overlaySel = null;

  function init(container) {
    root = d3.select(container);
    w = root.node().clientWidth;
    h = root.node().clientHeight;

    // --- SVG scaffold ---
    svg = root.append("svg")
      .attr("width", w)
      .attr("height", h)
      .attr("viewBox", `0 0 ${w} ${h}`)
      .attr("role", "img")
      .attr("aria-label", "Hero background with PFAS haze and a tree illustration");

    // --- Background ---
    // NOTE: your previous file referenced url(#heroGrad) without defining it.
    // For now we keep a simple solid bg using CSS var(--bg).
    svg.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", w)
      .attr("height", h)
      .attr("fill", "var(--bg)");

    // Keep bgRect in case other parts of your code expect it
    bgRect = svg.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", w).attr("height", h)
      .attr("fill", "transparent");

    // --- PFAS HAZE layer (animated) ---
    hazeLayer = svg.append("g").attr("class", "pfas-haze");

    const n = 70;
    particles = d3.range(n).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1.2 + Math.random() * 2.2,
      speedX: 5 + Math.random() * 20,
      speedY: -2 + Math.random() * 4,
      alpha: 0.4 + Math.random() * 0.12
    }));

    dots = hazeLayer.selectAll("circle")
      .data(particles)
      .join("circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", d => d.r)
      .attr("fill", "#8693ab")
      .attr("opacity", d => d.alpha);

    // --- TREE (as SVG image) ---
    // This draws your exported SVG file inside the hero SVG.
    treeImage = svg.append("image")
      .attr("class", "hero-tree-img")
      .attr("href", "./hero/tree.svg")
      .attr("preserveAspectRatio", "xMidYMid meet");

    layoutTreeImage();

    // Ensure haze stays behind the tree
    hazeLayer.lower();

    // --- HTML overlay card ---
    // Append overlay to the hero section (container's parent), so it sits above the SVG.
    overlaySel = d3.select(container.parentNode)
      .append("div")
      .attr("class", "hero-overlay");

    const card = overlaySel.append("div").attr("class", "hero-card");
    card.append("h2").text("Maple Trees, PFAS, and Filtration");
    card.append("p").text("A modular scrollytelling build: each team contributes a chapter that plugs into one grand narrative.");
    card.append("div").attr("class", "scroll-cue").text("Scroll to begin ↓");

    // --- Animation loop for haze ---
    hazeTimer = d3.timer(() => {
      particles.forEach(p => {
        p.x += p.speedX / 60;
        p.y += p.speedY / 60;

        // wrap
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      });

      dots
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });
  }

  function layoutTreeImage() {
    // Center the tree, and keep it from colliding with the overlay card.
    // Feel free to tweak these numbers.
    const boxW = Math.min(w, h) * 0.99;
    const boxH = boxW * 0.95;

    const x0 = (w - boxW) / 2;
    const y0 = h * 0.14; // push down slightly to leave room for overlay

    treeImage
      .attr("x", x0)
      .attr("y", y0)
      .attr("width", boxW)
      .attr("height", boxH);
  }

  function resize(width, height) {
    w = width;
    h = height;

    svg
      .attr("width", w)
      .attr("height", h)
      .attr("viewBox", `0 0 ${w} ${h}`);

    bgRect
      .attr("width", w)
      .attr("height", h);

    // Keep particles within new bounds (quick clamp)
    particles.forEach(p => {
      p.x = Math.max(-20, Math.min(w + 20, p.x));
      p.y = Math.max(-20, Math.min(h + 20, p.y));
    });

    // Re-layout the tree image on resize
    layoutTreeImage();
  }

  function destroy() {
    if (hazeTimer) {
      hazeTimer.stop();
      hazeTimer = null;
    }
    if (overlaySel) {
      overlaySel.remove();
      overlaySel = null;
    }
    if (svg) {
      svg.remove();
    }
  }

  return { init, resize, destroy };
}