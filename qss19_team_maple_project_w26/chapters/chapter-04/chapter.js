import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createChapter() {
  // --- internal state ---
  let root, svgOuter, svg, g;
  let width = 900, height = 560;
  const margin = { top: 28, right: 24, bottom: 56, left: 64 };
  let currentStepId = null;

  // Keep track of image info
  const main_img = {x: 425, y: 200, height: 550};
  const smallPic = {x: 20, y: 20, dim: 175, gap: 20};
  const images = ["tree", "house", "filter", "boiling", "filter", "syrup", "eat"];
  const imgPath = "chapters/chapter-04/Maple-Images/";



  function renderBase() {
    svg.selectAll("*").remove();

    svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("refX", 6)
    .attr("refY", 3)
    .attr("orient", "auto")
    .append("polygon")
    .attr("points", "0 0, 6 3, 0 6")
    .attr("fill", "#666");

    g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    
  }

  // General function that shows the new step in the middle and moves the previous step to the top
  function changeMainImage(step) {
    if (step != 1) {
      g.selectAll("image")
      .attr("class", "small-pic")
      .transition()
      .duration(600)
      .attr("x", (d, i) => smallPic.x + i * (smallPic.dim + smallPic.gap))
      .attr("y", smallPic.y)
      .attr("width", smallPic.dim)
      .attr("height", smallPic.dim);

      setTimeout(() => drawArrows(step), 300);
    }


    g.selectAll("image.main-pic").remove();

    if (step==8) return;

    g.append("image")
    .attr("class", "main-pic")
    .attr("xlink:href", imgPath + images[step-1] + ".svg")
    .attr("x", main_img.x)
    .attr("y", main_img.y)
    .attr("height", main_img.height)
    .attr("opacity", 0)
    .transition()
    .duration(600)
    .attr("opacity", 1);

    // TODO: Flag the images as contaminant/removal here probably
  }

  function drawArrows(step) {
    if (step < 2) return;
  
    const arrowLayer = g.selectAll("g.arrow-layer").data([null]);
    arrowLayer.join("g").attr("class", "arrow-layer");
  
    const arrows = g.select("g.arrow-layer")
      .selectAll("line.arrow")
      .data(d3.range(step - 2), d => d);
  
    arrows.join(
      enter => enter
        .append("line")
        .attr("class", "arrow")
        .attr("stroke", "#666")
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrowhead)"),
      update => update,
      exit => exit.remove()
    )
    .attr("x1", (d) => smallPic.x + d * (smallPic.dim + smallPic.gap) + smallPic.dim)
    .attr("y1", smallPic.y + smallPic.dim / 2)
    .attr("x2", (d) => smallPic.x + (d + 1) * (smallPic.dim + smallPic.gap))
    .attr("y2", smallPic.y + smallPic.dim / 2);
  }

  // --- Step behaviors ---
  function step01() {
    changeMainImage(1);
  }

  function step02() {
    changeMainImage(2);
  }

  function step03() {
    changeMainImage(3);
  }

  function step04() {
    changeMainImage(4);
  }

  function step05() {
    changeMainImage(5);
  }

  function step06() {
    changeMainImage(6);
  }

  function step07() {
    changeMainImage(7);
  }

  function step08() {
    changeMainImage(8);
  }

  function step09() {
    // Shift images down to the middle of the screen
    g.selectAll("image")
      .transition()
      .duration(600)
      .attr("x", (d, i) => smallPic.x + i * (smallPic.dim + smallPic.gap))
      .attr("y", smallPic.y + 300)
      .attr("width", smallPic.dim)
      .attr("height", smallPic.dim);

    // Shift arrows too!
    g.selectAll("line.arrow")
    .transition()
    .duration(600)
    .attr("y1", smallPic.y + 300 + smallPic.dim / 2)
    .attr("y2", smallPic.y + 300 + smallPic.dim / 2);

      // TODO: Whoever is tagging the arrows can do that here.
      // TODO: Also should probably label each image here: tree -> house -> filter, etc.
  }

  // Conclusion
  function step10() {
    // I added a placeholder pancake svg -> i think it would be awesome if we could somehow animate the syrup pouring onto the pancakes but that might be untrealistic...
  }


  function applyStep(stepId) {
    currentStepId = stepId;

    // You can match on exact ids from your manifest:
    // c02-step-01 ... c02-step-04
    // To add a new step, you must add it to the manifest, add it here, and then make the function
    if (stepId === "c04-step-01") return step01();
    if (stepId === "c04-step-02") return step02();
    if (stepId === "c04-step-03") return step03();
    if (stepId === "c04-step-04") return step04();
    if (stepId === "c04-step-05") return step05();
    if (stepId === "c04-step-06") return step06();
    if (stepId === "c04-step-07") return step07();
    if (stepId === "c04-step-08") return step08();
    if (stepId === "c04-step-09") return step09();
    if (stepId === "c04-step-10") return step10();

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

    renderBase();

    // Start at step 01 visuals by default (until first scroll event)
    applyStep("c04-step-01");
  }

  function resize(w, h) {
    width = w ?? width;
    height = h ?? height;

    svgOuter.attr("width", width).attr("height", height).attr("viewBox", `0 0 ${width} ${height}`);
    renderBase();
    applyStep(currentStepId ?? "c04-step-01");
  }

  function onStepEnter(stepId) {
    applyStep(stepId);
  }

  return { init, resize, onStepEnter };
}