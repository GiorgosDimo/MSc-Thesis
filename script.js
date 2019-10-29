document.getElementById("RdBubtn").onclick = (e) => {
  changeColor("RdBu");
}

document.getElementById("spectralbtn").onclick = (e) => {
  changeColor("Spectral");
}


var changeColor = function(cmn){
  let colormap = d3['interpolate' + cmn]
  colormap = d3.scaleSequential(colormap).domain([200, 50])
  rgbs = d3.range(256).map((i) => {
      let rgb = d3.rgb(colormap(i))
    return rgb
    })
  return rgbs
}

changeColor("Spectral");
var color = document.getElementById('colorpicker');

function run (event) {

    // timing object
    //var to = new TIMINGSRC.TimingObject({range:[0,20]})
    var to = new TIMINGSRC.TimingObject();
    
    var map = new L.Map('map', { center: new L.LatLng(0, 0), zoom: 2, maxZoom: 3});
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
			maxZoom: 3,
			attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
				'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
				'Imagery © <a href="http://mapbox.com">Mapbox</a>',
			id: 'mapbox.satellite'
		}).addTo(map);

    var VideoTileLayer = L.GridLayer.extend({

        initialize(options) {
          let defaultOptions = {
            tileSize: 512,
            noWrap: false,
            interactive: true,
            keepBuffer: 0
          }
          let mergedOptions = Object.assign(defaultOptions, options)
          L.Util.setOptions(this, mergedOptions);
          this.src = options.src

        },
        onAdd (map) {
           // give the container an interactive class
           // make sure you call  the onAdd method from the GridLayer first (so we have a _container)
           // we're extending this method, not overwriting it
           L.GridLayer.prototype.onAdd.call(this, map)
           // now add the class
           L.DomUtil.addClass(this._container, 'leaflet-interactive')
        },
        createTile(coords) {
            // create a tile object that can contain a video, a canvas and a sync
            var div = L.DomUtil.create('div', 'leaflet-tile');
            let video = document.createElement('video');
            video.src = `${this.src}/${coords.z}/${coords.x}/${coords.y}.mp4`;

            //console.log('video.src', video.src)

            video.autoplay = false;
            video.muted = true;
            video.preload = true;
            video.controls = false;
            div.appendChild(video)
      	    let canvas1 = L.DomUtil.create('canvas');

            let canvas2 = L.DomUtil.create('canvas');
            div.appendChild(canvas1)
            div.appendChild(canvas2)
      	    let size = this.getTileSize();
            canvas1.setAttribute("name", "canvas1");
            canvas2.classList.add('color')
            div.setAttribute("id", 'tile-' + coords.z + '-' + coords.x + '-' +  coords.y)
            canvas1.width = size.x;
      	    canvas1.height = size.y;
            canvas2.width = size.x;
            canvas2.height = size.y;

            L.DomUtil.addClass(canvas2, 'leaflet-interactive');
            this.addInteractiveTarget(canvas2)
            return div;

        }
    });
    var makeTileLayer = function() {
      // just a normal extended GridLayer
      let tileLayer = monthLayer
      // now we can listen to custom events
      tileLayer.on('click', (evt) => {
        // get the element
        let canvas = evt.originalEvent.target
        // get the context
        let ctx = canvas.getContext('2d')
        // get the coordinate of the click (inside the current canvas)
        let x = evt.originalEvent.offsetX
        let y = evt.originalEvent.offsetY
        // get the color
        var data = ctx.getImageData(x, y, 1, 1).data
        // lookup rgb
        var rgb = [ data[0], data[1], data[2] ]
        var perc = ((data[0] + data[1] + data[2])/3)/255
        var heightRound = Math.round((perc*2 + (-1)) * 100) / 100
        // show rgb  value
        console.log('click', rgb)
        color.textContent = heightRound + 'm';
        color.style.fontSize = "xx-large";

      })
      return tileLayer
    }
    // rename to tileLayer

    var monthLayer = new VideoTileLayer({src: 'videoTilesPerMonth_mp4_512new'})
    var yearLayer = new VideoTileLayer({src: 'videoTilesPerYear_mp4_512new'})
    var layerControl = L.control.layers({
    			'month': monthLayer,
    			'year': yearLayer
    		})
    monthLayer.addTo(map)
    console.log("month layer", monthLayer)
    layerControl.addTo(map)
    let tileLayer = makeTileLayer()
    tileLayer.addTo(map)

    let syncs = {}
    let draws = {}

    document.getElementById('reset').onclick = (e) => {
        to.update({velocity: 0.0})
        to.update({position: 0.0})
    }
    document.getElementById('pause').onclick = (e) => {
        to.update({velocity: 0.0})
    }

    document.getElementById('play').onclick = (e) => {
        to.update({velocity: 1.0})
    }
    let layers = [monthLayer, yearLayer]

    layers.forEach(tileLayer => {
      tileLayer.on('tileunload', (e) => {
          let sync = syncs[e.coords]
          //let rafid = draws[e.coords]
          /*for (d in draws){
            //console.log(draws[e.coords])
            window.cancelAnimationFrame(draws[e.coords])
          }*/

          let tile = e.tile;

          //console.log('draws ', draws)
      })


      var lastT = 0;
      tileLayer.on('tileload', (e) => {
          let tile = e.tile;
          let coords = e.coords;
          //console.log('coords', e.coords)
          let video = tile.childNodes[0]
          let canvas1 = tile.childNodes[1]
          let canvas2 = tile.childNodes[2]
          let ctx1 = canvas1.getContext('2d');
          let ctx2 = canvas2.getContext('2d');
          var callDraw = function(step){
            return draw(step, video, canvas1, canvas2, ctx1, ctx2, coords, lastT)
          }

          video.onloadeddata = () => {

              let sync = MCorp.mediaSync(video, to, {loop: true});
              syncs[e.coords] = sync;
              video.onplay = () => {
                callDraw();
        	video.style.display = 'none';
        	canvas1.style.display = 'none';
                console.log('play')
                //console.log("tiles play", e.coords)
              };
              let rif = requestAnimationFrame(callDraw);
              //console.log("rif",rif)
              //draws[e.coords] = rif;

          }

           
            var draw = function(step, video, canvas1, canvas2, ctx1, ctx2, coords, lastT){
                  //console.log('canvas1',canvas1)
                  var v = to.query();
                  //time = t;
                  if (v.velocity === 0.0){
                    console.log("paused")
                    //console.log("tiles paused", coords)
                    return;
                  }

                  rafid = requestAnimationFrame(callDraw)
                  draws[coords] = rafid;
                  //console.log(draws)
                  var diffT = step-lastT
                  if (diffT<100){
                    return;
                  }else{
                    lastT = step
                  }

                  canvasWidth = canvas1.width;
                  canvasHeight = canvas1.height;

                  //console.log('.')
                  ctx1.drawImage(video, 0, 0);

                  var imageData = ctx1.getImageData(0, 0, canvasWidth, canvasHeight);

                  let data = imageData.data;
                  for (let i = 0; i < data.length; i += 4) {
                    let color = rgbs[data[i]]
                    if (data[i] < 30){
                     data[i + 3] = 0;
                    }
                    data[i] = color.r
                    data[i+1] = color.g
                    data[i+2] = color.b

                  }

                  ctx2.putImageData(imageData, 0, 0);

                }

      })
    })
    /*to.on("timeupdate", function () {
      document.getElementById("position").innerHTML = to.query().position.toFixed(3);
      var v = to.query();
      if (v.position === 20.0){
        to.update({position: 0.0})
        to.update({velocity: 1.0})
      }
    });*/
    var keepinsync = function() {
      var v = to.query();
      if (v.velocity === 1.0){
        to.update({velocity: 0.0})
        to.update({velocity: 1.0})
      }else if (v.velocity === 0.0){
        to.update({velocity: 0.0})
      }

    }
    var myVar = setInterval(function(){keepinsync()},1000);
    //var myVar = setInterval(function(){console.log(document.getElementsByTagName("canvas"))},2000);
};

// wait for content to be loaded (IE9+)
document.addEventListener('DOMContentLoaded', run, false);
