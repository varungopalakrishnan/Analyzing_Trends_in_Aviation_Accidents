var width = 1560;
var height = 700;

//d3 select referred by [19]
div = d3.select("#container");
mapLayer = div
  .append("svg")
  .attr("id", "map")
  .attr("width", width)
  .attr("height", height);
canvasLayer = div
  .append("canvas")
  .attr("id", "heatmap")
  .attr("width", width)
  .attr("height", height);

//creating canvas referred by [20]
var canvas = canvasLayer.node(),
  context = canvas.getContext("2d");

//d3 projection for geoMercator referred by [21]
var projection = d3.geoMercator().translate([width / 2, height / 2]),
  path = d3.geoPath(projection);

//d3 queue referred by [22]
//fetch world-50m json file
d3.queue()
  .defer(d3.json, "world-50m.json")
  .await(main);

var i = 0;
var keys = [];
var global_world;
var allDests;

//function to call for heat map after loading datasets
function main(error, worldLocations) {
  //fetch to call backend referred by [23]
  fetch("http://localhost:5000/getHeatMapData", { method: "GET" }).then(
    response => {
      response.json().then(allDests => {
        global_world = worldLocations;
        global_allDests = allDests;
        keys = Object.keys(allDests);
        formGraph(allDests[keys[i]]);
        var interval = setInterval(changedataset, 2000); //interval of 2 seconds to change datasets of each year
      });
    }
  );
}

//function to form heat map referred by [27]
function formGraph(dests) {
  //JSON parse string referred by [25]
  dests = JSON.parse(dests);
  d3.select(textYear).text(keys[i]);
  dests.forEach(d => {
    d.coords = projection([d.Longitude, d.Latitude]);
  });

  //d3 topojson to create features referred by [26]
  var countries = topojson.feature(global_world, global_world.objects.countries)
    .features;

  mapLayer
    .append("g")
    .classed("countries", true)
    .selectAll(".country")
    .data(countries)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path);

  mapLayer
    .append("g")
    .classed("airports", true)
    .selectAll(".airport")
    .data(dests)
    .enter()
    .append("circle")
    .attr("r", 1)
    .attr("cx", function(d) {
      return d.coords[0];
    })
    .attr("cy", function(d) {
      return d.coords[1];
    });

  var heat = simpleheat(canvas);

  heat.data(dests.map(d => [d.coords[0], d.coords[1], +d.Value]));

  heat.radius(10, 10);

  // set maximum for domain
  heat.max(d3.max(dests, d => +d.Value));

  // draw into canvas, with minimum opacity threshold
  heat.draw(0.05);
}

//function to chnage dataset for timer count
function changedataset() {
  d3.selectAll(".countries").remove();
  d3.selectAll(".airports").remove();

  if (i < keys.length - 1) i = i + 1;
  else i = 0;
  formGraph(global_allDests[keys[i]]);
}

//methods to plot trend chart

var year = d3.select("#year");

//function to load selected year data
function changeYear() {
  var year = document.getElementById("year");

  selectedYear = year.options[year.selectedIndex].value;

  drawLine(JSON.parse(lineData[selectedYear]));
}

fetch("http://localhost:5000/getEventCountData", { method: "GET" }).then(
  response => {
    response.json().then(d => {
      var keys = Object.keys(d);

      lineData = d;

      keys.forEach(key => {
        if (JSON.parse(lineData[key]).length > 1)
          year
            .append("option")
            .attr("value", key)
            .text(key);
        else if (key == "2019") {
          var futureArray = [];
          futureArray.push(JSON.parse(lineData["2019"])[0]);
          futureArray.push(JSON.parse(lineData["2020"])[0]);
          futureArray.push(JSON.parse(lineData["2021"])[0]);
          lineData["Future"] = JSON.stringify(futureArray);

          year
            .append("option")
            .attr("value", "Future")
            .text("Future"); //appending Future for 2019,2020,2021
        } else delete lineData[key];
      });

      keys = Object.keys(lineData);

      drawLine(JSON.parse(lineData[keys[0]]));
    });
  }
);

//d3 line referred by [29]
//function to draw line
function drawLine(data) {
  d3.select("#lineChartDiv").html(""); //removing previous chart

  var margin = { top: 10, right: 10, bottom: 100, left: 40 },
    margin2 = { top: 430, right: 10, bottom: 20, left: 40 },
    width = 1520 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom;

  //d3 color referred by [28]
  var color = d3.scaleOrdinal(d3.schemeCategory10);

  var parseDate = d3.timeParse("%Y-%m-%d");

  var x = d3
      .scaleTime()
      .domain(
        d3.extent(data, function(d) {
          return d3.timeParse("%Y-%m-%d")(d["EventDate"]);
        })
      )
      .range([0, width - 10]),
    x2 = d3
      .scaleTime()
      .domain(
        d3.extent(data, function(d) {
          return d3.timeParse("%Y-%m-%d")(d["EventDate"]);
        })
      )
      .range([0, width - 10]),
    y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(data, function(d) {
          return +d.Injuries;
        }) + 5
      ])
      .range([height, 0]),
    y2 = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(data, function(d) {
          return +d.Injuries;
        }) + 5
      ])
      .range([height2, 0]);

  var xAxis = d3.axisBottom(x);
  var xAxis2 = d3.axisBottom(x2);
  var yAxis = d3.axisLeft(y);

  var brush = d3.brushX().on("brush", brush);

  var line = d3
    .line()
    .defined(function(d) {
      return !isNaN(d.temperature);
    })
    .x(function(d) {
      return x(d["EventDate"]);
    })
    .y(function(d) {
      return y(d.temperature);
    });

  var line2 = d3
    .line()
    .defined(function(d) {
      return !isNaN(d.temperature);
    })
    .x(function(d) {
      return x2(d["EventDate"]);
    })
    .y(function(d) {
      return y2(d.temperature);
    });

  var svg = d3
    .select("#lineChartDiv")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", "0 0 960 500")
    .attr("preserveAspectRatio", "xMinYMin");

  svg
    .append("defs")
    .append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

  color.domain(
    d3.keys(data[0]).filter(function(key) {
      return key !== "EventDate";
    })
  );

  data.forEach(function(d) {
    d["EventDate"] = parseDate(d["EventDate"]);
  });

  var sources = color.domain().map(function(name) {
    return {
      name: name,
      values: data.map(function(d) {
        return { EventDate: d["EventDate"], temperature: +d[name] };
      })
    };
  });

  // legends referred by [30]
  var legend = svg
    .selectAll("g")
    .data(sources)
    .enter()
    .append("g")
    .attr("class", "legend");

  legend
    .append("rect")
    .attr("x", width - 150)
    .attr("y", function(d, i) {
      return i * 20 + 20;
    })
    .attr("width", 10)
    .attr("height", 10)
    .style("fill", function(d) {
      return color(d.name);
    });

  legend
    .append("text")
    .attr("x", width - 130)
    .attr("y", function(d, i) {
      return i * 20 + 29;
    })
    .text(function(d) {
      return d.name;
    });

  var focus = svg
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var context = svg
    .append("g")
    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

  x.domain(
    d3.extent(data, function(d) {
      return d["EventDate"];
    })
  );
  y.domain([
    d3.min(sources, function(c) {
      return d3.min(c.values, function(v) {
        return v.temperature;
      });
    }),
    d3.max(sources, function(c) {
      return d3.max(c.values, function(v) {
        return v.temperature;
      });
    })
  ]);
  x2.domain(x.domain());
  y2.domain(y.domain());

  var focuslineGroups = focus
    .selectAll("g")
    .data(sources)
    .enter()
    .append("g");

  var focuslines = focuslineGroups
    .append("path")
    .attr("class", "line")
    .attr("d", function(d) {
      return line(d.values);
    })
    .style("stroke", function(d) {
      return color(d.name);
    })
    .attr("clip-path", "url(#clip)");

  focus
    .append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  focus
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  var contextlineGroups = context
    .selectAll("g")
    .data(sources)
    .enter()
    .append("g");

  var contextLines = contextlineGroups
    .append("path")
    .attr("class", "line")
    .attr("d", function(d) {
      return line2(d.values);
    })
    .style("stroke", function(d) {
      return color(d.name);
    })
    .attr("clip-path", "url(#clip)");

  context
    .append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height2 + ")")
    .call(xAxis2);

  context
    .append("g")
    .attr("class", "x brush")
    .call(brush)
    .selectAll("rect")
    .attr("y", -6)
    .attr("height", height2 + 7);

  //tooltip referred by [31]
  var mouseG = svg.append("g").attr("class", "mouse-over-effects");

  mouseG
    .append("path") // this is the black vertical line to follow mouse
    .attr("class", "mouse-line")
    .style("stroke", "black")
    .style("stroke-width", "1px")
    .style("opacity", "0");

  var lines = document.getElementsByClassName("line");

  var mousePerLine = mouseG
    .selectAll(".mouse-per-line")
    .data(sources)
    .enter()
    .append("g")
    .attr("class", "mouse-per-line");

  mousePerLine
    .append("circle")
    .attr("r", 7)
    .style("stroke", function(d) {
      return color(d.name);
    })
    .style("fill", "none")
    .style("stroke-width", "1px")
    .style("opacity", "0");

  mousePerLine.append("text").attr("transform", "translate(10,3)");

  mouseG
    .append("svg:rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("mouseout", function() {
      d3.select(".mouse-line").style("opacity", "0");
      d3.selectAll(".mouse-per-line circle").style("opacity", "0");
      d3.selectAll(".mouse-per-line text").style("opacity", "0");
    })
    .on("mouseover", function() {
      d3.select(".mouse-line").style("opacity", "1");
      d3.selectAll(".mouse-per-line circle").style("opacity", "1");
      d3.selectAll(".mouse-per-line text").style("opacity", "1");
    })
    .on("mousemove", function() {
      var mouse = d3.mouse(this);
      d3.select(".mouse-line").attr("d", function() {
        var d = "M" + (mouse[0] + 40) + "," + height;
        d += " " + (mouse[0] + 40) + "," + 0;
        return d;
      });

      d3.selectAll(".mouse-per-line").attr("transform", function(d, i) {
        var xDate = x.invert(mouse[0]);

        var bisect = d3.bisector(function(d) {
          return d["EventDate"];
        }).right;

        var idx = bisect(d.values, xDate);

        var beginning = 0,
          end = lines[i].getTotalLength(),
          target = null;

        while (true) {
          target = Math.floor((beginning + end) / 2);
          pos = lines[i].getPointAtLength(target);
          if ((target === end || target === beginning) && pos.x !== mouse[0]) {
            break;
          }
          if (pos.x > mouse[0]) end = target;
          else if (pos.x < mouse[0]) beginning = target;
          else break; //position found
        }

        d3.select(this)
          .select("text")
          .text(y.invert(pos.y).toFixed(2))
          .attr("style", "font-weight:700;color:black");

        return "translate(" + (mouse[0] + 40) + "," + (pos.y + 10) + ")";
      });
    });

  function brush() {
    //d3 selection referred by [32]
    var selection = d3.event.selection;
    x.domain(selection.map(x2.invert, x2));

    focus.selectAll("path.line").attr("d", function(d) {
      return line(d.values);
    });
    focus.select(".x.axis").call(xAxis);
    focus.select(".y.axis").call(yAxis);
  }
}

//Bubble Chart referred by [30]

// set the dimensions and margins of the graph
var margin = { top: 70, right: 150, bottom: 60, left: 150 },
  width_bubble = 1600 - margin.left - margin.right,
  height_bubble = 520 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg_bubble = d3
  .select("#bubblechart")
  .append("svg")
  .attr("width", width_bubble + margin.left + margin.right)
  .attr("height", height_bubble + margin.top + margin.bottom)
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//Read the data

fetch("http://localhost:5000/getClusterData", { method: "GET" }).then(
  response => {
    response.json().then(data => {
      var labels = ["c0", "c1", "c2", "c2", "c4", "c5", "c6", "c7", "c8", "c9"];

      // x axis - Injuries, y axis - TotalUninjured, z axis - TotalFatalInjuries

      var x = d3
        .scaleLog()
        .domain([1, 40000])
        .range([0, width_bubble - 200]);

      var x0 = d3
        .scaleOrdinal()
        .domain([0])
        .range([-10]);

      var xAxis = d3.axisBottom(x).ticks(20, d3.format(",.1s"));

      var x0Axis = d3.axisBottom(x0);

      svg_bubble
        .append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height_bubble + ")")
        .call(xAxis);

      svg_bubble
        .append("g")
        .attr("class", "x-zero axis")
        .attr("transform", "translate(0," + height_bubble + ")")
        .call(x0Axis);

      // Add X axis label:
      svg_bubble
        .append("text")
        .attr("text-anchor", "end")
        .attr("x", width_bubble / 2)
        .attr("y", height_bubble + 50)
        .text("Injuries(Major+Minor)");

      // Add Y axis
      var y = d3
        .scaleLog()
        .domain([1, 350000])
        .range([height_bubble, 0]);

      var y0 = d3
        .scaleOrdinal()
        .domain([9000])
        .range([-10]);

      var yAxis = d3.axisLeft(y).ticks(20, d3.format(",.1s"));

      var y0Axis = d3.axisLeft(y0);

      svg_bubble
        .append("g")
        .attr("class", "y axis")
        .call(yAxis);

      svg_bubble
        .append("g")
        .attr("class", "y-zero axis")
        .call(y0Axis);

      // Add Y axis label:
      svg_bubble
        .append("text")
        .attr("text-anchor", "end")
        .attr("x", -20)
        .attr("y", -20)
        .text("Total Uninjured")
        .attr("text-anchor", "start");

      // Add a scale for bubble size
      var z = d3
        .scaleSqrt()
        .domain([0, 30000])
        .range([2, 70]);

      // Add a scale for bubble color
      var myColor = d3
        .scaleOrdinal()
        .domain(labels)
        .range(d3.schemeSet1);

      // Create a tooltip div that is hidden by default referred by [33]
      var tooltip_bubble = d3
        .select("#bubblechart")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "black")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("color", "white")
        .style("position", "absolute");

      // Create 3 functions to show / update (when mouse move but stay on same circle) / hide the tooltip
      var showTooltip = function(d) {
        tooltip_bubble.transition().duration(200);
        tooltip_bubble
          .style("opacity", 1)
          .html("Country: " + d.Country)
          .style("left", d3.mouse(this)[0] + 30 + "px")
          .style("top", d3.mouse(this)[1] + 110 + "px")
          .style("background-color", myColor("c" + d.labels));
      };
      var moveTooltip = function(d) {
        tooltip_bubble
          .style("left", d3.mouse(this)[0] + 30 + "px")
          .style("top", d3.mouse(this)[1] + 110 + "px");
      };
      var hideTooltip = function(d) {
        tooltip_bubble
          .transition()
          .duration(200)
          .style("opacity", 0);
      };

      var highlight = function(d) {
        d3.selectAll(".bubbles").style("opacity", 0.05); // reduce opacity of all groups

        d3.selectAll("." + d).style("opacity", 1); // expect the one that is hovered
      };

      // Removing hightlight when it is not hovered
      var noHighlight = function(d) {
        d3.selectAll(".bubbles").style("opacity", 1);
      };

      // Add datapoints
      svg_bubble
        .append("g")
        .selectAll("dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", function(d) {
          return "bubbles c" + d.labels;
        })
        .attr("cx", function(d) {
          return x(d.Injuries);
        })
        .attr("cy", function(d) {
          return y(d.TotalUninjured);
        })
        .attr("r", function(d) {
          return z(d.TotalFatalInjuries);
        })
        .style("fill", function(d) {
          return myColor("c" + d.labels);
        })
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseleave", hideTooltip);

      //Legends
      var legend_x = 1250;
      var legend_y = 50;
      var size = 20;

      var allgroups = labels;
      svg_bubble
        .selectAll("myrect")
        .data(allgroups)
        .enter()
        .append("circle")
        .attr("cx", legend_x)
        .attr("cy", function(d, i) {
          return legend_y + i * (size + 5);
        })
        .attr("r", 7)
        .style("fill", function(d) {
          return myColor(d);
        })
        .on("mouseover", highlight)
        .on("mouseleave", noHighlight);

      // Add labels beside legend dots
      svg_bubble
        .selectAll("mylabels")
        .data(allgroups)
        .enter()
        .append("text")
        .attr("x", legend_x + size * 0.8)
        .attr("y", function(d, i) {
          return legend_y - 10 + i * (size + 5) + size / 2;
        })
        .style("fill", function(d) {
          return myColor(d);
        })
        .text(function(d) {
          return d;
        })
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
        .on("mouseover", highlight)
        .on("mouseleave", noHighlight);
    });
  }
);
