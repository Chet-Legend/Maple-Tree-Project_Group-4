import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createChapter() {
  // internal state
  let root, svgOuter, svg, g;
  let width = 900, height = 560;
  const margin = { top: 28, right: 24, bottom: 56, left: 64 };
  let currentStepId = null;

  // Keep track of image info
  const main_img = {x: 425, y: 200, height: 550};
  const smallPic = {x: 20, y: 20, dim: 175, gap: 20};
  const images = ["tree", "house", "filter", "boiling", "filter", "syrup", "eat"];
  const imgPath = "chapters/chapter-04/Maple-Images/";
// KCB
// I added this so each step knows what kind of flag should show up on the center image
  const imageFlagsByStep = {
    1: ["contamination"],
    2: ["contamination"],
    3: ["removal"],
    4: ["contamination", "removal"],
    5: ["removal"],
    6: [],
    7: []
  };

  // I added this for the arrows once everything moves to the center in step 9
  const arrowFlags = [
    "contamination",
    "contamination",
    "removal",
    "contamination",
    "removal",
    "removal"
  ];

  // I just kept the colors/labels here so it is easier to change later if needed
  const flagStyles = {
    contamination: {
      fill: "#d84b4b",
      stroke: "#a52f2f",
      label: "Contam."
    },
    removal: {
      fill: "#65b96f",
      stroke: "#3f8c49",
      label: "Removal"
    }
  };
//KCB
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
  // KCB
  // I added this so old center-image flags disappear before the new ones draw
  function clearMainFlags() {
    g.selectAll(".main-flag").remove();
  }

  // I added this so the step 9 arrow flags can be cleared when scrolling back up
  function clearArrowFlags() {
    g.selectAll(".arrow-flag").remove();
  }

  // I made one small helper for drawing the flag shape so I did not repeat the same code a bunch of times
  function drawBadge({ x, y, type, cssClass }) {
    const style = flagStyles[type];
    if (!style) return;

    const badge = g.append("g")
      .attr("class", cssClass)
      .attr("transform", `translate(${x},${y})`);

    badge.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 24)
      .attr("stroke", "#555")
      .attr("stroke-width", 2);

    badge.append("path")
      .attr("d", "M0,0 L58,0 L46,16 L58,32 L0,32 Z")
      .attr("fill", style.fill)
      .attr("stroke", style.stroke)
      .attr("stroke-width", 1.5);

    badge.append("text")
      .attr("x", 28)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", 700)
      .attr("fill", "#fff")
      .text(style.label);
  }

  // I added this so the center image gets flagged on the steps where it is supposed to
  function drawMainImageFlags(step) {
    clearMainFlags();

    const flags = imageFlagsByStep[step] || [];
    if (!flags.length) return;

    flags.forEach((type, i) => {
      drawBadge({
        x: main_img.x + 140 + i * 72,
        y: main_img.y + 12,
        type,
        cssClass: "main-flag"
      });
    });
  }

  // I added this for step 9 so the arrows get tagged once they move into the center layout
  function drawArrowFlagsStep9() {
    clearArrowFlags();

    const arrowY = smallPic.y + 300 + smallPic.dim / 2;

    arrowFlags.forEach((type, i) => {
      const x1 = smallPic.x + i * (smallPic.dim + smallPic.gap) + smallPic.dim;
      const x2 = smallPic.x + (i + 1) * (smallPic.dim + smallPic.gap);
      const midX = (x1 + x2) / 2 - 28;

      drawBadge({
        x: midX,
        y: arrowY - 44,
        type,
        cssClass: "arrow-flag"
      });
    });
  }

  //KCB 

  // General function that shows the new step in the middle and moves the previous step to the top
  function changeMainImage(step) {
    // Manage history (the small pics at the top)
    const historyData = images.slice(0, step - 1);
    const smallPics = g.selectAll("image.small-pic")
      .data(historyData, (d, i) => i);

    // Handles the undo when scrolling back up
    smallPics.exit().remove();

    smallPics.enter()
      .append("image")
      .attr("class", "small-pic")
      .attr("xlink:href", d => imgPath + d + ".svg")
      .merge(smallPics)
      .transition()
      .duration(600)
      .attr("x", (d, i) => smallPic.x + i * (smallPic.dim + smallPic.gap))
      .attr("y", smallPic.y)
      .attr("width", smallPic.dim)
      .attr("height", smallPic.dim)
      .attr("opacity", 1);

    // Manage current main image
    const mainData = (step > 0 && step <= images.length) ? [images[step - 1]] : [];
    const mainPic = g.selectAll("image.main-pic").data(mainData, d => d);

    mainPic.exit().remove();

    if (step < 8) {
      mainPic.enter()
        .append("image")
        .attr("class", "main-pic")
        .attr("xlink:href", d => imgPath + d + ".svg")
        .attr("x", main_img.x)
        .attr("y", main_img.y)
        .attr("height", main_img.height)
        .attr("opacity", 0)
        .transition()
        .duration(600)
        .attr("opacity", 1);
    }

    // TODO: Flag the images as contaminant/removal here probably
    //KCB
     // I put the center-image flags here since this is where each new main image gets shown
    drawMainImageFlags(step);

    // I clear arrow flags here so they only show during step 9
    clearArrowFlags();
    //KCB

    drawArrows(step);
  }

  function drawArrows(step) {
    if (step < 2) {
      g.selectAll("line.arrow").remove();
      return;
    }
  
    const arrowCount = Math.max(0, step - 2);
    const arrowData = d3.range(arrowCount);

    const arrows = g.selectAll("line.arrow")
      .data(arrowData, d => d);

    arrows.exit().remove();

    arrows.enter()
      .append("line")
      .attr("class", "arrow")
      .attr("stroke", "#666")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)")
      .merge(arrows)
      .transition()
      .duration(600)
      .attr("x1", (d) => smallPic.x + d * (smallPic.dim + smallPic.gap) + smallPic.dim)
      .attr("y1", smallPic.y + smallPic.dim / 2)
      .attr("x2", (d) => smallPic.x + (d + 1) * (smallPic.dim + smallPic.gap))
      .attr("y2", smallPic.y + smallPic.dim / 2)
      .attr("opacity", 1);
  }

  // Step behaviors
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
    // Ensure all images are in the history state first
    changeMainImage(8);

    // Shift images down to the middle of the screen
    g.selectAll("image.small-pic")
      .transition()
      .duration(600)
      .attr("x", (d, i) => smallPic.x + i * (smallPic.dim + smallPic.gap))
      .attr("y", smallPic.y + 300)
      .attr("width", smallPic.dim)
      .attr("height", smallPic.dim);

    // Shift arrows too
    g.selectAll("line.arrow")
    .transition()
    .duration(600)
    .attr("y1", smallPic.y + 300 + smallPic.dim / 2)
    .attr("y2", smallPic.y + 300 + smallPic.dim / 2);

   
 // TODO: Whoever is tagging the arrows can do that here.
  // TODO: Also should probably label each image here: tree -> house -> filter, etc.

  // KCB
  // I added the arrow flags here because this is the step where the arrows move into the middle
  setTimeout(() => {
    if (currentStepId === "c04-step-09") {
      drawArrowFlagsStep9();
    }
  }, 620);
  // KCB
}
  // Conclusion
  function step10() {

// KCB
    clearMainFlags();
    clearArrowFlags();
//KCB

    // I added a placeholder pancake svg -> i think it would be awesome if we could somehow animate the syrup pouring onto the pancakes but that might be untrealistic...
    g.append("image")
    .attr("class", "main-pic")                     
    .attr("xlink:href", "chapters/chapter-04/Maple-Images/pancakes.svg")
    .attr("x", main_img.x)                         
    .attr("y", main_img.y)
    .attr("height", main_img.height)               
    .attr("width", main_img.height * 1.2)          
    .attr("preserveAspectRatio", "xMidYMid meet") 
    .attr("opacity", 0)                            
    .transition()
    .duration(600)
    .attr("opacity", 1);
  }


  function applyStep(stepId) {
    currentStepId = stepId;

    // Scrolling back up -> reset
    const stepNum = parseInt(stepId.split('-').pop());
    if (stepNum < 9) {
      g.selectAll("image.small-pic").attr("y", smallPic.y);
      g.selectAll("line.arrow").attr("y1", smallPic.y + smallPic.dim / 2).attr("y2", smallPic.y + smallPic.dim / 2);
    //KCB
     clearArrowFlags();
    //KCB
    }

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
