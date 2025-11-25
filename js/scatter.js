let dataCsv = "./csv/Shows2025.csv";

let svgScatter = d3.select("#scatter"),
  margin = { top: 20, right: 20, bottom: 30, left: 50 },
  width = +svgScatter.attr("width"),
  height = +svgScatter.attr("height"),
  domainwidth = width - margin.left - margin.right,
  domainheight = height - margin.top - margin.bottom;

let x = d3
  .scaleLinear()
  .domain(padExtent([1, 5]))
  .range(padExtent([0, domainwidth]));

let y = d3
  .scaleLinear()
  .domain(padExtent([1, 5]))
  .range(padExtent([domainheight, 0]));

let g = svgScatter
  .append("g")
  .attr("transform", "translate(" + margin.top + "," + margin.top + ")");

g.append("rect")
  .attr("width", width - margin.left - margin.right)
  .attr("height", height - margin.top - margin.bottom)
  .attr("fill", "#F6F6F6");

d3.csv(dataCsv, function (error, data) {
  // console.log(data);
  if (error) throw error;

  data.forEach(function (d) {
    console.log(d);
    d.consequence = +d.consequence;
    d.value = +d.value;
  });

  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("r", 7)
    .attr("cx", function (d) {
      return x(d.consequence);
    })
    .attr("cy", function (d) {
      return y(d.value);
    })
    .style("fill", function (d) {
      if (d.value >= 3 && d.consequence <= 3) {
        return "#60B19C";
      } // Top Left
      else if (d.value >= 3 && d.consequence >= 3) {
        return "#8EC9DC";
      } // Top Right
      else if (d.value <= 3 && d.consequence >= 3) {
        return "#D06B47";
      } // Bottom Left
      else {
        return "#A72D73";
      } //Bottom Right
    });

  g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + y.range()[0] / 2 + ")")
    .call(d3.axisBottom(x).ticks(5));

  g.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x.range()[1] / 2 + ", 0)")
    .call(d3.axisLeft(y).ticks(5));
});

function padExtent(e, p) {
  if (p === undefined) p = 1;
  return [e[0] - p, e[1] + p];
}
