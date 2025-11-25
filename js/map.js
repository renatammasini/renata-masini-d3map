let dataCsv = "./csv/Shows2025.csv";
let geoJsonData =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

let svg = d3.select("#my_dataviz");
let width = svg.node().parentNode.getBoundingClientRect().width;
let height = svg.node().parentNode.getBoundingClientRect().height;

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
  // console.log(data);

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

  // add rectangle to helpo with the zoom
  let zoomRect = svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "transparent")
    .style("pointer-events", "all");

  // Draw the map
  let mymap = svg.append("g");

  mymap
    .selectAll("path")
    .data(dataGeo.features)
    .enter()
    .append("path")
    .attr("fill", "var(--darkgray)")
    .attr("d", d3.geoPath().projection(projection))
    .style("stroke", "none");
  // .style("opacity", 0.3);

  // Add circles:
  mymap
    .selectAll("myCircles")
    .data(
      data
        .sort(function (a, b) {
          return +b.spotify - +a.spotify;
        })
        .filter(function (d, i) {
          return i < 1000;
        })
    )
    .enter()
    .append("circle")
    .attr("cx", function (d) {
      return projection([+d.lon, +d.lat])[0];
    })
    .attr("cy", function (d) {
      return projection([+d.lon, +d.lat])[1];
    })
    .attr("r", function (d) {
      return size(+d.spotify);
    })
    .style("fill", function (d) {
      return color(d.hapiness);
    })
    .attr("stroke", function (d) {
      if (d.n > 2000) {
        return "black";
      } else {
        return "none";
      }
    })
    .attr("stroke-width", 1)
    .attr("fill-opacity", 0.4)
    .style("cursor", "pointer");

  // Add title and explanation
  let legendText = svg
    .append("text")
    .attr("x", 10)
    .attr("y", height - 50)
    .style("fill", "var(--white)")
    .style("font-size", 10);

  legendText.append("tspan").style("font-weight", "bold").text("Bubble: ");

  legendText.append("tspan").text("Number of monthly listeners on Spotify");

  // Add legend: circles
  let valuesToShow = [10, 100000, 35000000];
  let xCircle = 40;
  let xLabel = 90;
  svg
    .selectAll("legend")
    .data(valuesToShow)
    .enter()
    .append("circle")
    .attr("cx", xCircle)
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
      return xCircle + size(d);
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

  // add TOOLTIPS

  let tooltip = d3
    .select("#map-wrapper")
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "3px")
    .style("padding", "10px")
    .style("opacity", 0.7);

  // Show, move and hide the tooltip
  mymap
    .selectAll("circle")
    .on("mouseover", function (d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", size(+d.spotify) + 5);

      tooltip
        .html(
          "<h3>" +
            d.band +
            "</h3>" +
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
      // Use d3.mouse to get mouse coordinates relative to the wrapper
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

  // ZOOM

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
// end of ready() function - - - - - - -
