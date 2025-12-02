let dataCsv = "./csv/Shows2025.csv";
let geoJsonData =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

let svg = d3.select("#my_dataviz");
let width = svg.node().parentNode.getBoundingClientRect().width;
let height = svg.node().parentNode.getBoundingClientRect().height;
let marginLeft = 50;
let marginBottom = 75;

// Apply the size to the SVG (needed for D3 to draw correctly)
svg
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", `0 0 ${width} ${height}`);

// Map and projection
let projection = d3
  .geoMercator()
  .center([0, 20]) // GPS of location to zoom on
  .scale(150) // This is like the zoom
  .translate([width / 2, height / 2]);

d3.queue()
  .defer(d3.json, geoJsonData) // World shape
  .defer(d3.csv, dataCsv) // Position of circles
  .await(drawMap);

function drawMap(error, dataGeo, data) {
  if (error) {
    console.error(error);
    return;
  }

  // Create a color scale
  let hapiness = d3
    .map(data, function (d) {
      return d.hapiness;
    })
    .keys();
  let color = d3.scaleOrdinal().domain(hapiness).range(d3.schemeAccent);

  // Add a scale for bubble size
  let valueExtent = d3.extent(data, function (d) {
    return +d.spotify;
  });

  let size = d3
    .scaleSqrt()
    .domain(valueExtent) // What's in the data
    .range([5, 15]); // Size in pixel

  // add rectangle to help with the zoom (captures pointer events)
  svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "transparent")
    .style("pointer-events", "all");

  // Draw the map group
  let mymap = svg.append("g").attr("class", "map-group");

  mymap
    .selectAll("path")
    .data(dataGeo.features)
    .enter()
    .append("path")
    .attr("fill", "var(--darkgray)")
    .attr("d", d3.geoPath().projection(projection))
    .style("stroke", "none");

  // --- Prepare the data subset we'll display (sorted + filtered) ---
  // NOTE: operate on a copy so we don't mutate original array unexpectedly
  let filtered = data
    .slice()
    .sort(function (a, b) {
      return +b.spotify - +a.spotify;
    })
    .filter(function (d, i) {
      return i < 1000;
    });

  // Give each node initial coordinates based on the projection
  filtered.forEach((d) => {
    const [px, py] = projection([, +d.l + d.lonat]);
    d.x = px;
    d.y = py;
  });

  // Compute country-level cluster centers using only filtered nodes
  let countryCenters = {};
  filtered.forEach((d) => {
    const [px, py] = projection([+d.lon, +d.lat]);
    if (!countryCenters[d.origin])
      countryCenters[d.origin] = { x: 0, y: 0, n: 0 };
    countryCenters[d.origin].x += px;
    countryCenters[d.origin].y += py;
    countryCenters[d.origin].n += 1;
  });
  Object.keys(countryCenters).forEach((key) => {
    const c = countryCenters[key];
    c.x = c.x / c.n;
    c.y = c.y / c.n;
  });

  // --- Create circles ONCE (single, reliable selection) ---
  // Use a class name for the selection to avoid surprises
  let circles = mymap
    .selectAll(".show-circle")
    .data(filtered, (d) => d.band + "|" + d.date) // key function (optional)
    .enter()
    .append("circle")
    .attr("class", "show-circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", (d) => size(+d.spotify))
    .style("fill", (d) => color(d.hapiness))
    .attr("stroke", (d) => (+d.n > 2000 ? "black" : "none"))
    .attr("stroke-width", 1)
    .attr("fill-opacity", 0.4)
    .style("cursor", "pointer");

  // --- Force simulation: cluster by country + collide ---
  // Use the filtered nodes array as simulation nodes
  let simulation = d3
    .forceSimulation(filtered)
    .force(
      "clusterX",
      d3
        .forceX((d) =>
          countryCenters[d.origin] ? countryCenters[d.origin].x : d.x
        )
        .strength(0.9)
    )
    .force(
      "clusterY",
      d3
        .forceY((d) =>
          countryCenters[d.origin] ? countryCenters[d.origin].y : d.y
        )
        .strength(0.5)
    )
    // collide radius: use the actual pixel radius (size) plus small padding
    .force(
      "collide",
      d3.forceCollide((d) => size(+d.spotify) + 2)
    )
    .stop();

  // Run a few ticks so layout is resolved immediately (no animation)
  for (let i = 0; i < 180; ++i) simulation.tick();

  // Apply the final positions to circles
  mymap
    .selectAll(".show-circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y);

  // --- Legend (kept same as before) ---
  // let legendText = svg
  //   .append("text")
  //   .attr("x", marginLeft)
  //   .attr("y", height - 50)
  //   .style("fill", "var(--white)")
  //   .style("font-size", 10);

  // legendText.append("tspan").style("font-weight", "bold").text("Bubbles: ");

  // legendText
  //   .append("tspan")
  //   .text(
  //     "Size: Number of monthly listeners on Spotify, Position: Country of origin"
  //   );

  // legendText.append("stpan").text("Position: Country of origin");

  let newleg = svg
    .append("foreignObject")
    .attr("x", marginLeft)
    .attr("y", height - marginBottom)
    .attr("width", 500)
    .attr("height", 30)
    .style("font-size", 10)
    .style("color", "var(--white)");

  newleg
    .append("xhtml:div")
    .html(
      "Size: Number of monthly listeners on Spotify </br> Position: Country of origin"
    );

  // Add legend: circles
  let valuesToShow = [10, 100000, 35000000];
  // let xCircle = 14;
  let xLabel = 90;

  svg
    .selectAll("legend")
    .data(valuesToShow)
    .enter()
    .append("circle")
    // .attr("cx", marginLeft)
    .attr("cx", function (d) {
      // calcular metade do círculo
      return marginLeft;
    })
    .attr("cy", function (d) {
      return height - size(d);
    })
    .attr("r", function (d) {
      return size(d);
    })
    .style("fill", "none")
    .attr("stroke", "var(--white)");

  // Add legend: segments
  svg
    .selectAll("legend")
    .data(valuesToShow)
    .enter()
    .append("line")
    .attr("x1", function (d) {
      return marginLeft + size(d);
    })
    .attr("x2", xLabel)
    .attr("y1", function (d) {
      return height - size(d);
    })
    .attr("y2", function (d) {
      return height - size(d);
    })
    .attr("stroke", "var(--white)")
    .style("stroke-dasharray", "2,2");

  // Add legend: labels
  svg
    .selectAll("legend")
    .data(valuesToShow)
    .enter()
    .append("text")
    .attr("x", xLabel)
    .attr("y", function (d) {
      return height - size(d);
    })
    .text(function (d) {
      return d;
    })
    .style("font-size", 10)
    .style("fill", "var(--white)")
    .attr("alignment-baseline", "middle");

  // --- Tooltip (single tooltip element) ---
  let tooltip = d3
    .select("#map-wrapper")
    .append("div")
    .attr("class", "map-tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "3px")
    .style("padding", "10px")
    .style("opacity", 0.9)
    .style("pointer-events", "none"); // avoid blocking mouse events

  // Show, move and hide the tooltip: attach to the circles selection we created
  mymap
    .selectAll(".show-circle")
    .on("mouseover", function (d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", size(+d.spotify) + 5);

      tooltip
        .html(
          "<h3><a href='" +
            d.link +
            "' target='_blank' rel='noopener noreferrer' style='color:black;'>" +
            d.band +
            "</a></h3>" +
            "<hr>" +
            "<strong>Date:</strong> " +
            d.date +
            "<br/>" +
            "<strong>Where:</strong> " +
            d.location +
            "<br/>" +
            "<strong>Origin:</strong> " +
            d.origin
        )
        .style("font-family", '"IBM Plex Mono", sans-serif')
        .style("font-size", "10px")
        .style("line-height", "1.5")
        .style("visibility", "visible");
    })
    .on("mousemove", function (d) {
      // get mouse coords relative to wrapper
      let wrapper = document.querySelector("#map-wrapper");
      let coords = d3.mouse(wrapper); // [x, y] relative to wrapper
      tooltip
        .style("left", coords[0] + 12 + "px")
        .style("top", coords[1] + 12 + "px");
    })
    .on("mouseout", function (d) {
      d3.select(this).transition().duration(200).attr("r", size(+d.spotify));
      tooltip.style("visibility", "hidden");
    });

  // --- ZOOM ---
  let zoom = d3
    .zoom()
    .scaleExtent([1, 8])
    .on("zoom", function () {
      mymap.attr("transform", d3.event.transform);
    });

  svg.call(zoom);

  // reset button handler
  document.getElementById("resetZoom").addEventListener("click", resetZoom);

  function resetZoom() {
    // animate the svg back to identity transform
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  }
}
// end of drawMap()
