var startYear = 1910;//1910;
var endYear = 2014;//2015;
var currentYear = startYear;
var width = 1400;//975;
var height = 800;//610;

///////////////////////////////////////////////////
// this is d3.geo.mercator() or d3.geo.albers() equavilent
//var projection = d3.geoAlbersUsa().scale(1300).translate([500, 300]); // for D3 v4
var projection = d3.geo.albersUsa().scale(1400).translate([500, 320]); // for D3 v3
// projection path for "d" element to be passed to D3
var path = d3.geo.path().projection(projection); // for D3 v3
//var path = d3.geoPath().projection(projection); // for D3 v4
///////////////////////////////////////////////////

var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);
var ufoData;
var circles;
//var toolTip;
var firstClick = true;

d3.queue()
    .defer(d3.json,"us.json")
    .defer(d3.csv, "us16800ufoDataRandomSamples.csv")
    //.defer(d3.csv, "https://raw.githubusercontent.com/remy177/ufoProject/master/us16800ufoData.csv")
    .await(drawMap);

function drawMap(error, topojsonData, cvsData) {
  if (error) throw error;

  // change topojsonData.objects.states to topojsonData.objects.districts if using us-congress-113.json instead of us.json
  var us = topojson.feature(topojsonData, topojsonData.objects.states);
  console.log(us);
  //console.log(us.features);

  ufoData = cvsData;
  console.log(ufoData);

  // begin to draw map
  svg
    .selectAll(".region")
    .data(us.features)
    .enter()
    .append("path")
    // the actual projection path
    .attr("d", path)
    .attr("class", "region")
    .style("opacity", ".8")
    .style("fill", "slategrey")
    .style("stroke", "white")
    .style("stroke-width", "0.5px")
    .on("mouseover", function (d, i) {
      d3.select(this).transition().duration(500).style("fill", "#808080");
    })
    .on("mouseout", function (d, i) {
      //d3.select(this).interrupt();
      d3.select(this).transition().duration(2000).style("fill", "slategrey");
    });

  // this is the map composition borders for Alaska(02) & Hawaii(15)
  svg
    .append("path")
    .style("fill", "none")
    .style("stroke", "black")
    .attr("d", projection.getCompositionBorders());

  showData();

  createSlider();
}

function showData() {
  
  //var parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S"); // for D3 v4
  var parseDate = d3.time.format("%Y-%m-%d %H:%M:%S").parse; // for D3 v3

  ufoData.forEach((data) => {
    data.lng = +data.lng;
    data.lat = +data.lat;
    data.duration = +data.duration;
    data.date = parseDate(data.date);
    data.year = +data.year;
    data.month = +data.month;
    data.day = +data.day;
  });

  //ufoData.sort((a, b) => a.year - b.year);
  console.log('inside showData()...', ufoData);

  var toolTip = createTooltip();

  createCircles(ufoData, toolTip);
  //createCirclesByYear(ufoData, toolTip, 2005);

  svg.call(toolTip);
}

function createSlider() {
  console.log('inside createSlider()...');
  d3.select("#slider").call(
    chroniton() // this call the chroniton JS library for the slider player component
      .domain([new Date(startYear, 1, 1), new Date(endYear, 1, 1)])
      .labelFormat( (date) => {
        return Math.ceil(date.getFullYear() / 1) * 1;
      })
      .width(600)
      .on("change",  (date) => {
        var newYear = Math.ceil(date.getFullYear() / 1) * 1;
        if (newYear != currentYear) {
          currentYear = newYear;
          if (firstClick) {
            //svg.selectAll("circle").attr("fill-opacity", 0).attr("stroke-opacity", 0);
            svg.selectAll("circle").remove();
            firstClick = false;
          }
          console.log(currentYear);
          var toolTip = createTooltip();
          //var circles = createCirclesByYear(ufoData, toolTip, currentYear);
          createCirclesByYear(ufoData, toolTip, currentYear);
          //svg.call(circles);
          svg.call(toolTip);
          //var toolTip = createTooltip();
          //createCircles(ufoData.filter(d => d.year == currentYear), toolTip);
          //svg.call(toolTip);
        }
      })
      .playButton(true)
      .playbackRate(0.1)
      .loop(false)
  );
}

function createTooltip() {
  console.log('inside createTooltip()...');
  // Step 7: Initialize tool tip
  // ==============================
  var toolTip = d3
    .tip()
    .attr("class", "tooltip")
    .attr("opacity", 0.8)
    .offset([0, 0])
    .html((d) => {
      return `<u><b>(${d.country.toUpperCase()}) ${
        d.city
      }, ${d.state.toUpperCase()} [${d.lng}, ${d.lat}]</b></u><br/>Date: ${
        d.date
      }<br/>Shape: ${d.shape}, Duration: ${d.duration / 60} minutes <br/> ${
        d.comments
      }`;
    });
  
  return toolTip;
}

function createCircles(ufoData, toolTip) {
  console.log('inside createCircles()...', toolTip);
  var circles = svg 
        .selectAll("circle")
        .data(ufoData);  // import data for ALL year

        circles.enter()
        .append("circle")
        .on("mouseover", (data) => {
          toolTip.show(data, this);
        })
        .on("mouseout", (data) => {
          toolTip.hide(data);
        })
        .attr("cx", function (d) {
          if (projection([d.lng, d.lat])) return projection([d.lng, d.lat])[0];
        })
        .attr("cy", function (d) {
          if (projection([d.lng, d.lat])) return projection([d.lng, d.lat])[1];
        })
        //.attr("r", 1)
        //.attr("fill", "purple")
        //.attr("fill-opacity", 0.4)
        //.attr("stroke", "purple")
        //.attr("stroke-opacity", 0.4)
        .transition()
        .ease("linear")
        .duration(3000)
        .attrTween("r", (d) => {
          return d3.interpolateNumber(1, (d.duration<1) ? 1 : (d.duration/60 *0.05)+1);
        })
        .attr("fill", "purple")
        .attr("fill-opacity", 0.2)
        .attr("stroke", "purple")
        .attr("stroke-opacity", 0.2)

  console.log(circles);
}

function createCirclesByYear(ufoData, toolTip, year) {
  var currentYearData = ufoData.filter(d => +d.year === year);
  console.log('inside createCirclesByYear('+year+')...', currentYearData);
  //svg.append("g")
  //circleGroup.call(toolTip);
  var circleGroup = svg.append("g") 
        .selectAll("circle")
        //.data(ufoData.filter(d => d.year == year ))
        .data(currentYearData)
        .enter()
        .append("circle")
        .on("mouseover", (data) => {
          toolTip.show(data, this);
        })
        .on("mouseout", (data) => {
          toolTip.hide(data);
        });

        circleGroup 
        //.selectAll("circle")
        .attr("cx",  (d) => {
          console.log("--cx: " + d.state);
          console.log(d.lng);
          //console.log(d.lat);
          //console.log(projection([d.lng, d.lat])[0]);
          //console.log(projection([d.lng, d.lat])[1]);
          //if (projection([d.lng, d.lat])) 
          return (projection([d.lng, d.lat])) && projection([d.lng, d.lat])[0];})
        .attr("cy", (d) => {
          console.log("--cy:" + d.state);
          //console.log(d.lng);
          console.log(d.lat);
          //console.log(projection([d.lng, d.lat])[0]);
          //console.log(projection([d.lng, d.lat])[1]);
          //if (projection([d.lng, d.lat])) 
          return (projection([d.lng, d.lat])) && projection([d.lng, d.lat])[1];})
        .transition()
        //.ease("linear")
        //.duration(500)
        .attrTween("r", (d) => {
          return d3.interpolateNumber(1, (d.duration<1) ? 1 : (d.duration/60 *0.05)+1);
        })
        .attr("fill", "purple")
        .attr("fill-opacity", 0.2)
        .attr("stroke", "purple")
        .attr("stroke-opacity", 0.2);

        //circleGroup.call(toolTip);

  console.log(circleGroup);
}
/*
function createCirclesByYear2(ufoData, toolTip, year) {
  var circles = svg 
        .selectAll("circle")
        .data(ufoData.filter(function(d) { return d.year == year; })
          .sort((a, b) => a.duration - b.duration)
        );  // import data for ALL year
        
        circles.enter()
        .append("circle")
        .on("mouseover", (data) => {
          toolTip.show(data, this);
        })
        .on("mouseout", (data) => {
          toolTip.hide(data);
        })
        .attr("cx", function (d) {
          if (projection([d.lng, d.lat])) return projection([d.lng, d.lat])[0];
        })
        .attr("cy", function (d) {
          if (projection([d.lng, d.lat])) return projection([d.lng, d.lat])[1];
        })
        //.attr("r", 0.1)
        .attr("r", (d) => {
          var myInterpolator = d3.interpolateNumber(0.1, d.duration * 0.001);
          return myInterpolator(0.2);
        })
        .attr("fill", "purple")
        .attr("fill-opacity", 0.6)
        .attr("stroke", "purple")
        .attr("stroke-opacity", 0.6)
        .transition()
        .ease("linear")
        .duration(2000)
        .attr("r", (d) => {
          var myInterpolator = d3.interpolateNumber(0.1, d.duration * 0.001);
          return myInterpolator(0.4);
        })
        .attr("fill", "purple")
        .attr("fill-opacity", 0.5)
        .attr("stroke", "purple")
        .attr("stroke-opacity", 0.5)
        .transition()
        .ease("linear")
        .duration(1000)
        .attr("r", (d) => {
          var myInterpolator = d3.interpolateNumber(0.1, d.duration * 0.001);
          return myInterpolator(0.6);
        })
        .attr("fill", "purple")
        .attr("fill-opacity", 0.4)
        .attr("stroke", "purple")
        .attr("stroke-opacity", 0.4)
        .transition()
        .ease("linear")
        .duration(1000)
        .attr("r", (d) => {
          var myInterpolator = d3.interpolateNumber(
            0.1,
            d.duration < 1 ? 1 : d.duration * 0.001
          );
          return myInterpolator(0.8);
        })
        //.attr("r", function(d) {return (d.duration<1) ? 1 : (d.duration*0.001);})
        .attr("fill", "purple")
        .attr("fill-opacity", 0.3)
        .attr("stroke", "purple")
        .attr("stroke-opacity", 0.3)
        .transition()
        .ease("linear")
        .duration(2000)
        .attr("r", function (d) {
          return d.duration < 1 ? 1 * 0.001 : d.duration * 0.001;
        })
        .attr("fill", "purple")
        .attr("fill-opacity", 0.2)
        .attr("stroke", "purple")
        .attr("stroke-opacity", 0.2);
      //.text(d => d.duration*0.0001);
  console.log(circles)
  return circles;
}

function createCirclesByYear3(ufoData, toolTip, year) {
  var circles = svg
        .selectAll("circle")
        .data(ufoData.filter(function(d) { return d.year == year; }));

        circles.enter()
        .append("circle")
        .on("mouseover", (data) => {
          toolTip.show(data, this);
        })
        .on("mouseout", (data) => {
          toolTip.hide(data);
        })
        .attr("cx", function (d) {
          if (projection([d.lng, d.lat])) return projection([d.lng, d.lat])[0];
        })
        .attr("cy", function (d) {
          if (projection([d.lng, d.lat])) return projection([d.lng, d.lat])[1];
        })
        //return (d.duration<1) ? 1 : (d.duration*0.001)
        .attr("r", 1)
        .attr("fill", "purple")
        .attr("fill-opacity", 0.8)
        .attr("stroke", "purple")
        .attr("stroke-opacity", 0.8)
        .transition()
        .ease("linear")
        .duration(1000)
        .attr("r", (d) => {
          console.log("##-----------------------------##");
          console.log("duration: " + d.duration + " seconds");
          console.log("r = " + d.duration / 60 * 0.2 + " seconds");
          return (d.duration>21600) ? 21600 : (d.duration / 60 * 0.2)+1;
        })
        .attr("fill", "purple")
        .attr("fill-opacity", 0.2)
        .attr("stroke", "purple")
        .attr("stroke-opacity", 0.2);
      //.text(d => d.duration*0.0001);
  console.log(circles)
  return circles;
}
*/