import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export function createChapter() {
  let root, svgOuter, svg, width, height, radius;
  let color, pie, arc;
  let datasets = new Map();
  const decades = ["1980s","1990s","2000s","2010s"];
  let currentDecade = "1980s";

  function init(container, ctx) {
    const { chapterData } = ctx;

    root = d3.select(container);
    width = root.node().clientWidth;
    height = root.node().clientHeight || 600;

    svgOuter = root.append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg = svgOuter.append("g");

    color = d3.scaleOrdinal()
      .domain(["q1","q2","q3","q4","q5"])
      .range(["#9aa4b2","#b0b8c4","#c6cdd6","#dce1e7","#f2f5f8"]);

    pie = d3.pie()
      .value(d => d.mean_value)
      .sort(null);

    arc = d3.arc().innerRadius(0);

    const raw = chapterData["data/wiid_asia_quintiles_decades.csv"];
    raw.forEach(d => d.mean_value = +d.mean_value);
    datasets = d3.group(raw, d => d.decade);

    resize(width, height);
    updateChart(datasets.get(currentDecade), true);
  }

  function resize(w, h) {
    width = w;
    height = h ?? height;

    svgOuter
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const chartSize = Math.min(width, height) * 0.70;
    radius = chartSize / 2;

    arc.outerRadius(radius);
    svg.attr("transform", `translate(${width/2}, ${height/2})`);

    updateChart(datasets.get(currentDecade) ?? datasets.get("1980s"), true);
  }

  function onStepEnter(stepId) {
    const idx = stepId.endsWith("01") ? 0 :
                stepId.endsWith("02") ? 1 :
                stepId.endsWith("03") ? 2 :
                stepId.endsWith("04") ? 3 : 0;
    currentDecade = decades[idx];
    updateChart(datasets.get(currentDecade), false);
  }

  function updateChart(data, immediate=false) {
    if (!data) return;
    const pieData = pie(data);
    const t = svgOuter.transition().duration(immediate ? 0 : 700);

    const slices = svg.selectAll("path.slice")
      .data(pieData, d => d.data.quintile);

    slices.join(
      enter => enter.append("path")
        .attr("class","slice")
        .attr("fill", d => color(d.data.quintile))
        .each(function(d){ this._current = d; })
        .attr("d", arc),
      update => update,
      exit => exit.remove()
    )
    .transition(t)
    .attrTween("d", function(d) {
      const i = d3.interpolate(this._current, d);
      this._current = i(1);
      return tt => arc(i(tt));
    });

    const labels = svg.selectAll("text.pie-label")
      .data(pieData, d => d.data.quintile);

    labels.join(
      enter => enter.append("text").attr("class","pie-label"),
      update => update,
      exit => exit.remove()
    )
    .transition(t)
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .text(d => `${d.data.quintile.toUpperCase()}: ${(+d.data.mean_value).toFixed(1)}%`);

    const decadeLabel = svgOuter.selectAll("text.decade-label").data([currentDecade]);
    decadeLabel.join("text")
      .attr("class","decade-label")
      .attr("x", 22)
      .attr("y", height - 22)
      .attr("fill", "#e9eef7")
      .attr("font-size", 14)
      .attr("opacity", 0.5)
      .text(d => d);
  }

  return { init, resize, onStepEnter };
}
