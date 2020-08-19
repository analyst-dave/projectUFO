# Issues/challenges while creating the Map
Mapping coordinates to the projection w/out Leaflet and Mapbox tile layers
- we use d3-composite-projections library to get the projection of US map by calling 
<code>d3.geoAlbersUsa()</code> and use the path from <code>d3.geo.path().projection(projection)</code> to construct the map

- the same projection was use for map transform/translate as well as to project the actual coordinates location on our map
<code>
  
  circles
    
    .attr("cx", function (d) {

      return (projection([d.lng, d.lat])) && projection([d.lng, d.lat])[0]; })
    
    .attr("cy", function (d) {
    
      return (projection([d.lng, d.lat])) && projection([d.lng, d.lat])[1]; })

</code>

Two concurrency issues we faced
- 1st one is when loading different dataset the order of d3 async calls (csv()/json()) were not gurantee which leads to unpredictable behavior such as all circles rendered underneath the map layer because the async calls to csv(data) finished before json(us.json)... We use d3 queue to synchronized all its async calls
<code> 

  d3.queue().defer(d3.json,"us.json").defer(d3.csv, currentDataset).await(your_first_function_here)

</code>

- 2nd concurrency issue is when integrating the slider if slider speed faster than your circle transaction duration, d3 will skips some circles rendering

Getting the slider to work (Chronition.js)
- we decided to use a JS library called Chronition(by Jason Lawrence) for our slider:
<code>https://github.com/chroniton</code>
- getting the slider to work properly was a bit challenging since we have to populate the circles year by year in a chronological order.  So we have to modify our <code>createCicles()</code> code to createCircles by year.  Also after bunch of refactoring, grouping the circles with <g> tags and 


Final tweak -- d3 tween transition
- we utilize the d3.interpolate() to achieve the ease transition in d3 (it's call Tween)
- we use tweening in circles, bars and the total UFO number

<code>

    .transition()
      .ease("linear")
      .duration(1000)
      .attrTween("r", (d) => {
        return d3.interpolateNumber(1, (d.duration<1) ? 1 : (d.duration/60 *0.08)+1);})
</code>

<code>

    bar.selectAll("text").transition().ease("linear").duration(2000).delay(0)
      .attr("x", function(d) { return x(totalUFO)-600; })
      .tween("text", function(d) {
        var i = d3.interpolate(0, totalUFO);
        return function(t) {
          d3.select(this).text(formatPercent(i(t)));
        };
      });
</code>

Future enhancement/upgrade
- chart zooming
- chart the entire world or at least add CA, AU, FR