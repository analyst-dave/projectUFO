///////////////////////////////////////////////////
//
const width = 1000;//975;
const height = 600;//610;
const formatPercent = d3.format(",.0f");
const r = d3.scale.linear().range([0, 20]).domain([0, 450]).clamp(true);
const x = d3.scale.linear().range([0, width+143]);
const y = d3.scale.ordinal().rangeRoundBands([height, 0], .3, .3);
const color = d3.scale.quantize().range(["#CFD8DC", "#B0BEC5", "#90A4AE", "#607D8B"]);
const dataset = ["us168ufoData.csv", "us1680ufoData.csv", "us16800ufoDataRandomSamples.csv", "us60800ufoData.csv"];
// this is d3.geo.mercator() or d3.geo.albers() equavilent
//var projection = d3.geoAlbersUsa().scale(1300).translate([500, 300]); // for D3 v4
const projection = d3.geo.albersUsa().scale(1200).translate([480, 280]); // for D3 v3 left-right, up-down 
const path = d3.geo.path().projection(projection); // for D3 v3
//var path = d3.geoPath().projection(projection); // for D3 v4
//
///////////////////////////////////////////////////

var ufoData;
var firstClick = true;
var option = 1;
var currentDataset = dataset[option];  // default is option 1 -> 1680 ufo records
// read param from request and update options, button labels, and dataset used
option = getParameterByName('options') ? getParameterByName('options') : option;
currentDataset = getParameterByName('currentDataset') ? getParameterByName('currentDataset') : currentDataset;
updateOptionButtons(option);

var startYear = 1940;//1920;
var endYear = 2015;//2015;
var currentYear = startYear;
if (option > 1)
  currentYear = startYear = 1930;
else if (option == 0)
  currentYear = startYear = 1960;

var svg = d3.select("body").append("svg").attr("width", width).attr("height", height);

d3.queue()
    //.defer(d3.json,"states-albers-10m.json")
    .defer(d3.json,"states-10m.json")
    .defer(d3.csv, currentDataset)
    .await(drawMap);

// -------------------------------------------------------------

function pupulateChoropleth(us) {
  var stateCountMap = {};
  var maxCount = 1;
  ufoData.forEach((data) => {
    var key = stateMap[data.state.toUpperCase()];
    if ( stateCountMap[key] ) {
      if ( stateCountMap[key] > maxCount )
        maxCount = stateCountMap[key];
        stateCountMap[key] = stateCountMap[key] + 1;
    } else {
      stateCountMap[key] = 1;
    }
  });
  // choropleth color quantize range of possible values
  color.domain([0, maxCount]);

  //Merge the ag. data and GeoJSON
  for (var key in stateCountMap) {
    var dataState = key;
    //Grab data value, and convert from string to float
    var dataValue = parseInt(stateCountMap[key]);
    //Find the corresponding state inside the GeoJSON
    for (var j = 0; j < us.features.length; j++) {
      var jsonState = us.features[j].properties.name;
      //console.log("jsonState = ", jsonState);
      if (dataState == jsonState) {
          //Copy the data value into the JSON
          us.features[j].properties.value = +dataValue;
          break;
      }
    }
  }
  return us;
}

// -------------------------------------------------------------

function drawMap(error, topojsonData, cvsData) {
  if (error) throw error;

  // change topojsonData.objects.states to topojsonData.objects.districts if using us-congress-113.json instead of us.json
  var us = topojson.feature(topojsonData, topojsonData.objects.states);
  //console.log(stateMap);
  ufoData = cvsData;

  us = pupulateChoropleth(us);

  // prepare the tooltip to be used during draw map
  var stateTip = d3.tip()
                    .attr('class', 'd3-tip')
                    .offset([0, 0])
                    .html(function(d) {
                    var dataRow = d.properties.name;
                    if (d.properties.name && d.properties.value)
                      return dataRow + ": " + d.properties.value + " ufo sighting(s)";
                    else
                      return d.properties.name + ": no record";});
  svg.call(stateTip);

  // begin to draw map
  svg
    .selectAll(".region")
    .data(us.features)
    .enter()
    .append("path")
    .attr("d", path) // the actual projection path
    .attr("class", "region")
    .style("opacity", ".8")
    .on('mouseover', stateTip.show)
    .on('mouseout', stateTip.hide)
    .style("fill", (d) => {
      var value = d.properties.value;
      return (value) ? color(value) : "#efefef";
    }) 
    .style("stroke", "white")
    .style("stroke-width", "0.5px");
    /*
    .on("mouseover", function (d, i) {
      d3.select(this).transition().duration(500).style("fill", "#808080");
    })
    .on("mouseout", function (d, i) {
      //d3.select(this).interrupt();
      d3.select(this).transition().duration(2000).style("fill", "slategrey");
    });
    */

  // this is the map composition borders for Alaska(02) & Hawaii(15)
  svg
    .append("path")
    .style("fill", "none")
    .style("stroke", "#efefef")
    .attr("d", projection.getCompositionBorders());

  // this is the legend for choropleth of state's total sightings 
  var legendLinear = d3.legend.color()
    .labelFormat(d3.format(".2s"))
    .shapeWidth(20)
    .orient('vertical')
    .scale(color);
  svg.append("g").attr("class", "legend").attr("transform", "translate(680,20)");
  svg.selectAll(".legend").call(legendLinear);

  showData();
}

// -------------------------------------------------------------

function showData() {
  //var parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S"); // for D3 v4
  //var parseDate = d3.time.format("%Y-%m-%d %H:%M:%S").parse; // for D3 v3
  ufoData.forEach((data) => {
    data.lng = +data.lng;
    data.lat = +data.lat;
    data.duration = +data.duration;
    //data.date = parseDate(data.date);
    data.date = data.date;
    data.year = +data.year;
    data.month = +data.month;
    data.day = +data.day;
  });
  //ufoData.sort((a, b) => a.year - b.year);
  x.domain([0, ufoData.length]);

  createSlider();

  createBar(ufoData);
}

// -------------------------------------------------------------

function createSlider() {
  //console.log('inside createSlider()...');
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
          var toolTip = createTooltip();
          // either play or skip
          if (firstClick) {
            console.log("1st click", newYear);
            svg.selectAll("circle").remove();
            createCircles(ufoData.filter(d => d.year < newYear), toolTip);
            firstClick = false;
          // takes care of year skipping/rewind/loop or due to speed of slider
          } else if (newYear > currentYear+1) {
            console.log("forward/lagging... playback backdated! (performance enhancement)");
            // since slider is playing we don't need to remove and re-create
            // we just need to simply backdate the new year 
            newYear = currentYear + 1; 
          } else if (newYear < currentYear) {
            console.log(">> rewinding ");
            svg.selectAll("circle").remove();
            createCircles(ufoData.filter(d => d.year < newYear), toolTip);
          } 
          currentYear = newYear;
          //console.log(currentYear);

          var currentYearData = ufoData.filter(d => d.year == currentYear);
          createCircles(currentYearData, toolTip);
          //createCirclesByYear(ufoData, toolTip, currentYear);
          //createBar(currentYearData);
          svg.call(toolTip);
        }
      })
      .playButton(true)
      .playbackRate((option>1) ? 0.2 : 0.8)
      .loop(false)
      .play()
  );
}

// -------------------------------------------------------------

function createTooltip() {
  //console.log('inside createTooltip()...');
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
  var bar = svg.selectAll("bar")
                .data([ufoData.length])
                .enter();

  bar.append("rect")
      .attr("x", 225)
      .attr("y", 0)
      .attr("height", 15)
      .attr("width", 0)
      .style("fill","purple")
      .style("fill-opacity", 0.5)
      .transition()
      .ease((option<2) ? "cubic-in" : "exp-in")
      .duration((option<2) ? 6800 : 28000)
      .delay(0)
      //.attr("width", x(totalUFO)-840);
      .attr("width", function(d) { return x(d)-841; });

  bar.append("text")
      .attr("x", 225)
      .attr("y", 14)
      .text(0)
      //.text(function(d) { return d; });
      .transition()
      .ease((option<2) ? "cubic-in" : "exp-in")
      .duration((option<2) ? 6800 : 28000)
      .delay(0)
      .attr("x", function(d) { return x(d)-615; })
      .tween("text", function(d) {
        var i = d3.interpolate(0, d);
        return function(t) {
          d3.select(this).text(formatPercent(i(t)) + " total UFOs");
      };});
}

// -------------------------------------------------------------

function createCircles(ufoData, toolTip) {
  // all scalars are at the top of this file... below are 
  // special cases to handle different datasets
  var opacityScalar = (option<2) ? 0.4 : 0.2;
  var circleScalar = (option>2) ? 0.1 : 1; 
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
          //return d3.interpolateNumber(1, (d.duration<1) ? 1 : r(d.duration/60 * circleScalar)+1);
          return d3.interpolateNumber(1, (d.duration<1) ? 1 : r(d.duration/60 * circleScalar)+1);
        })
        .style("fill", "purple")
        .style("fill-opacity", opacityScalar)
        .style("stroke", "purple")
        .style("stroke-opacity", opacityScalar);
}

// -------------------------------------------------------------

function dataToggle() {
  var val = getRadioVal(document.getElementById('form'), 'options');
  //console.log(val);
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
  
  if (option == 3) {
    document.getElementById("option1").classList.remove("active");
    document.getElementById("option2").classList.remove("active");
    document.getElementById("option3").classList.remove("active");
    document.getElementById("option4").classList.add("active");
    document.getElementById("label1").classList.remove("active");
    document.getElementById("label2").classList.remove("active");
    document.getElementById("label3").classList.remove("active");
    document.getElementById("label4").classList.add("active");
    document.getElementById("option1").checked = false;
    document.getElementById("option2").checked = false;
    document.getElementById("option3").checked = false;
    document.getElementById("option4").checked = true;
  } else if ( option == 2 ) { 
    document.getElementById("option1").classList.remove("active");
    document.getElementById("option2").classList.remove("active");
    document.getElementById("option3").classList.add("active");
    document.getElementById("option4").classList.remove("active");
    document.getElementById("label1").classList.remove("active");
    document.getElementById("label2").classList.remove("active");
    document.getElementById("label3").classList.add("active");
    document.getElementById("label4").classList.remove("active");
    document.getElementById("option1").checked = false;
    document.getElementById("option2").checked = false;
    document.getElementById("option3").checked = true;
    document.getElementById("option4").checked = false;
  } else if ( option == 1 ) { 
    document.getElementById("option1").classList.remove("active");
    document.getElementById("option2").classList.add("active");
    document.getElementById("option3").classList.remove("active");
    document.getElementById("option4").classList.remove("active");
    document.getElementById("label1").classList.remove("active");
    document.getElementById("label2").classList.add("active");
    document.getElementById("label3").classList.remove("active");
    document.getElementById("label4").classList.remove("active");
    document.getElementById("option1").checked = false;
    document.getElementById("option2").checked = true;
    document.getElementById("option3").checked = false;
    document.getElementById("option4").checked = false;
  } else if (option == 0) {
    document.getElementById("option1").classList.add("active");
    document.getElementById("option2").classList.remove("active");
    document.getElementById("option3").classList.remove("active");
    document.getElementById("option4").classList.remove("active");
    document.getElementById("label1").classList.add("active");
    document.getElementById("label2").classList.remove("active");
    document.getElementById("label3").classList.remove("active");
    document.getElementById("label4").classList.remove("active"); 
    document.getElementById("option1").checked = true;
    document.getElementById("option2").checked = false;
    document.getElementById("option3").checked = false;
    document.getElementById("option4").checked = false;
  } else {
    document.getElementById("option1").classList.remove("active");
    document.getElementById("option2").classList.add("active");
    document.getElementById("option3").classList.remove("active");
    document.getElementById("option4").classList.remove("active");
    document.getElementById("label1").classList.remove("active");
    document.getElementById("label2").classList.add("active");
    document.getElementById("label3").classList.remove("active");
    document.getElementById("label4").classList.remove("active");
    document.getElementById("option1").checked = false;
    document.getElementById("option2").checked = true;
    document.getElementById("option3").checked = false;
    document.getElementById("option4").checked = false;
    //console.log("### Default option used!!! ###");
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
  //console.log('inside createCirclesByYear('+year+')...', currentYearData);

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
  //console.log(circles)
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
          //console.log("##-----------------------------##");
          //console.log("duration: " + d.duration + " seconds");
          //console.log("r = " + d.duration / 60 * 0.2 + " seconds");
          return (d.duration>21600) ? 21600 : (d.duration / 60 * 0.2)+1;
        })
        .attr("fill", "purple")
        .attr("fill-opacity", 0.2)
        .attr("stroke", "purple")
        .attr("stroke-opacity", 0.2);
      //.text(d => d.duration*0.0001);
  //console.log(circles)
  return circles;
}
*/