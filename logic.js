var startYear = 1910;//1910;
var endYear = 2015;//2015;
var currentYear = startYear;
var width = 1400;//975;
var height = 800;//610;

///////////////////////////////////////////////////
// this is d3.geo.mercator() or d3.geo.albers() equavilent
//var projection = d3.geoAlbersUsa().scale(1300).translate([500, 300]); // for D3 v4
var projection = d3.geo.albersUsa().scale(1400).translate([580, 320]); // for D3 v3 left-right, up-down 
// projection path for "d" element to be passed to D3
var path = d3.geo.path().projection(projection); // for D3 v3
//var path = d3.geoPath().projection(projection); // for D3 v4
///////////////////////////////////////////////////

var ufoData;
var totalUFO = 0;
var threshold = 5000;  // default threshold for circle size scaling
var firstClick = true;

const dataset = ["us168ufoData.csv", "us1680ufoData.csv", "us16800ufoDataRandomSamples.csv", "us60800ufoData.csv"];
var option = 1;
var currentDataset = dataset[option];  // default is option 1 -> 1680 ufo records

// read param from request and update options, button labels, and dataset used
option = getParameterByName('options') ? getParameterByName('options') : currentDataset;
currentDataset = getParameterByName('currentDataset') ? getParameterByName('currentDataset') : currentDataset;
updateOptionButtons(option);

var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);
var formatPercent = d3.format(",.0f");
var x = d3.scale.linear().range([0, width]);
var y = d3.scale.ordinal().rangeRoundBands([height, 0], .3, .3);

d3.queue()
    .defer(d3.json,"us.json")
    .defer(d3.csv, currentDataset)
    .await(drawMap);

// -------------------------------------------------------------

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

// -------------------------------------------------------------

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
    totalUFO++;
  });

  x.domain([0, totalUFO]);

  //ufoData.sort((a, b) => a.year - b.year);
  console.log('inside showData()...', ufoData);

  var toolTip = createTooltip();

  createCircles(ufoData, toolTip);
  //createCirclesByYear(ufoData, toolTip, 2005);

  createBar(ufoData);

  svg.call(toolTip);
}

// -------------------------------------------------------------

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
          if (newYear>currentYear+1)
            newYear = currentYear+1;
          currentYear = newYear;
          if (firstClick) {
            //svg.selectAll("circle").attr("fill-opacity", 0).attr("stroke-opacity", 0);
            svg.selectAll("circle").remove();
            firstClick = false;
          }
          console.log(currentYear);
          //var toolTip = createTooltip();
          //createCirclesByYear(ufoData, toolTip, currentYear);
          //svg.call(toolTip);
          var toolTip = createTooltip();
          createCircles(ufoData.filter(d => d.year == currentYear), toolTip);
          svg.call(toolTip);
        }
      })
      .playButton(true)
      .playbackRate(0.2)
      .loop(false)
  );
}

// -------------------------------------------------------------

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

// -------------------------------------------------------------

function createBar(ufoData) {
  var bar = svg.selectAll("#bar")
      .data(ufoData)
    .enter().append("g")
      .attr("class", "bar");

  bar.append("rect")
      .attr("x", 225)
      .attr("y", 2)
      //.attr("y", function(d) { return y(d.letter); })
      .attr("height", 10)
      .attr("width", 10) //
      .style("fill","purple")
      .style("fill-opacity", 0.1);

  bar.append("text")
      .attr("x", 225)
      .attr("y", 11)
      //.style("font-size", 20)
      .text(0); //

  bar.selectAll("rect")
  .transition()
  .ease("linear")
  .duration(2000)
  .delay(0)
  .attr("width", x(totalUFO)-840);

  bar.selectAll("text").transition().ease("linear").duration(2000).delay(0)
    .attr("x", function(d) { return x(totalUFO)-600; })
    .tween("text", function(d) {
      var i = d3.interpolate(0, totalUFO);
      return function(t) {
        d3.select(this).text(formatPercent(i(t)));
      };
      //return i;
    });
}

// -------------------------------------------------------------

function createCircles(ufoData, toolTip) {
  // need to scale down circle size if more than threshold
  var circleScalar = (totalUFO > threshold) ? 0.04 : 0.1;
  var opacityScalar = (totalUFO > threshold) ? 0.2 : 0.4;
  console.log('inside createCircles()...', circleScalar, opacityScalar);
  var circles = svg.append("g") 
        .selectAll("circle")
        .data(ufoData)  // import data for ALL year
        .enter()
        .append("circle")
        .on("mouseover", (data) => {
          toolTip.show(data, this);
        })
        .on("mouseout", (data) => {
          toolTip.hide(data);
        });

        circles
        .attr("cx", function (d) {
          if (projection([d.lng, d.lat])) return projection([d.lng, d.lat])[0];
        })
        .attr("cy", function (d) {
          if (projection([d.lng, d.lat])) return projection([d.lng, d.lat])[1];
        })
        .transition()
        .ease("linear")
        .duration(1000)
        .attrTween("r", (d) => {
          
          return d3.interpolateNumber(1, (d.duration<1) ? 1 : (d.duration/60 * circleScalar)+1);
        })
        .style("fill", "purple")
        .style("fill-opacity", opacityScalar)
        .style("stroke", "purple")
        .style("stroke-opacity", opacityScalar);

  console.log(circles);
}

// -------------------------------------------------------------

function dataToggle() {
  var val = getRadioVal(document.getElementById('form'), 'options');
  console.log(val);
  currentDataset = dataset[val];

  const hiddenField = document.createElement('input');
  hiddenField.type = 'hidden';
  hiddenField.name = 'currentDataset';
  hiddenField.value = currentDataset;

  const form = document.form;
  form.appendChild(hiddenField);
  document.form.submit();
}

// -------------------------------------------------------------

function updateOptionButtons(option) {
  if (option == 0) { 
    $('#option1').addClass('active');
    $('#option2').removeClass('active');
    $('#option3').removeClass('active');
    $('#label1').addClass('active');
    $('#label2').removeClass('active');
    $('#label3').removeClass('active');
    document.getElementById("option1").checked = true;
    document.getElementById("option2").checked = false;
    document.getElementById("option3").checked = false;
  } else if ( option == 1 ) { 
    $('#option1').removeClass('active');
    $('#option2').addClass('active');
    $('#option3').removeClass('active');
    $('#label1').removeClass('active');
    $('#label2').addClass('active');
    $('#label3').removeClass('active');
    document.getElementById("option1").checked = false;
    document.getElementById("option2").checked = true;
    document.getElementById("option3").checked = false;
  } else if ( option == 2 ) { 
    $('#option1').removeClass('active');
    $('#option2').removeClass('active');
    $('#option3').addClass('active');
    $('#label1').removeClass('active');
    $('#label2').removeClass('active');
    $('#label3').addClass('active');
    document.getElementById("option1").checked = false;
    document.getElementById("option2").checked = false;
    document.getElementById("option3").checked = true;
  } else {
    $('#option1').removeClass('active');
    $('#option2').addClass('active');
    $('#option3').removeClass('active');
    $('#label1').removeClass('active');
    $('#label2').addClass('active');
    $('#label3').removeClass('active');
    document.getElementById("option1").checked = false;
    document.getElementById("option2").checked = true;
    document.getElementById("option3").checked = false;
    console.log("### Default option used!!! ###");
  } 
}

// -------------------------------------------------------------

function getRadioVal(form, name) {
  var val;
  // get list of radio buttons with specified name
  var radios = form.elements[name];
  
  // loop through list of radio buttons
  for (var i=0, len=radios.length; i<len; i++) {
      if ( radios[i].checked ) { // radio checked?
          val = radios[i].value; // if so, hold its value in val
          break; // and break out of for loop
      }
  }
  return val; // return value of checked radio or undefined if none checked
}

function check(name) {
  document.getElementById(name).checked = true;
}

function uncheck(name) {
  document.getElementById(name).checked = false;
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// -------------------------------------------------------------

/*
function createCirclesByYear(ufoData, toolTip, year) {
  var currentYearData = ufoData.filter(d => +d.year === year);
  console.log('inside createCirclesByYear('+year+')...', currentYearData);

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
          //console.log("--cx: " + d.state);
          //console.log(d.lng);
          //console.log(d.lat);
          //console.log(projection([d.lng, d.lat])[0]);
          //console.log(projection([d.lng, d.lat])[1]);
          //if (projection([d.lng, d.lat])) 
          return (projection([d.lng, d.lat])) && projection([d.lng, d.lat])[0];})
        .attr("cy", (d) => {
          //console.log("--cy:" + d.state);
          //console.log(d.lng);
          //console.log(d.lat);
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
        .style("fill", "purple")
        .style("fill-opacity", 0.2)
        .style("stroke", "purple")
        .style("stroke-opacity", 0.2);

        //circleGroup.call(toolTip);

  console.log(circleGroup);
}
*/
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