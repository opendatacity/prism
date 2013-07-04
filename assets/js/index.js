var DEFAULT_POINT = new L.LatLng(52.50085, 13.42232);
var map;
var rapath;
var info;

function RaPath() {
	this.layers = [];
}

RaPath.prototype = {
	addPathPart: function (hop_src, hop_dest, cb) {
		var b = new R.BezierAnim([hop_src.p, hop_dest.p], {}, function () {
			if (cb)
				cb();
		});
		this.layers.push(b);
		map.addLayer(b);
	},
	addPulse: function (hop) {
		var pulse = new R.Pulse(
			hop.p,
			3,
			{'stroke': '#2478ad', 'fill': '#30a3ec'},
			{'stroke': '#30a3ec', 'stroke-width': 2});
		pulse.tooltip = this.getHopsText(hop);
//		var caller = this;
		pulse.click = function (e) {
			//alert(caller.getHopsText(hop));
//			var popup = L.popup()
//				.setLatLng(hop.p)
//				.setContent(caller.getHopsText(hop))
//				.openOn(map);
		};
		this.layers.push(pulse);
		map.addLayer(pulse);
		return pulse;
	},
	getHopsText: function (hop) {
		return hop.ip + ' - ' + (hop.geo.city ? hop.geo.city + ', ' : '') + hop.geo.country;
	},
	clear: function () {
		if (this.layers.length > 0)
			this.layers.forEach(function (l) {
				map.removeLayer(l);
			});
		info.clear();
	},
	start: function (geotrace) {
		$('.leaflet-top').fadeIn();
//		$('#' + id).addClass('active');
		this.clear();
		this.geotrace = geotrace;
		this.layers = [];
		info.append(texts.requestline + ' ' + geotrace.name);
		this.processStep(0);
	},
	processStep: function (index) {
		var hop = this.geotrace.hops[index];
		info.append(this.getHopsText(hop));
		this.addPulse(hop);
		map.panTo(hop.p);
		var caller = this;
		window.setTimeout(function () {
			caller.stepPath(index + 1);
		}, 200);
	},
	displayEnd: function () {
		//$('.leaflet-control-zoom').show();
		var result = [];
		for (key in this.geotrace.agencies) {
			result.push(this.geotrace.agencies[key].name + ' (' + this.geotrace.agencies[key].cc + ')');
		}
		info.append('<div id="agencies">' + texts.resultline + '</div>');
		info.append('<div id="agencies">' + result.join(' - ') + '</div>');
		map.fitBounds(this.geotrace.bounds);
	},
	stepPath: function (index) {
		var caller = this;
		if (index >= this.geotrace.hops.length) {
			window.setTimeout(function () {
				caller.displayEnd();
			}, 2000);
			return;
		}
		this.addPathPart(this.geotrace.hops[index - 1], this.geotrace.hops[index], function () {
			caller.processStep(index);
		});
	}
};

function Typing() {
//slightly modified from https://github.com/rachstock/typing-animation
}

Typing.prototype = {
	lines: '',
	container: null,
	insertPoint: null,
	para: null,

	beginTyping: function (lines, parent) {
		this.lines = lines;

		// Create the typer div
		this.container = $(parent);//$(document.createElement('div'));
//		this.container.attr('id', 'typer');
//		parent.append(this.container);

		this.container.empty();
		// Create the 'insertion point'
		this.insertPoint = $(document.createElement('span'));
		this.insertPoint.attr('id', 'insert-point');

		// Create our paragraph tags
		for (var i = 0, l = lines.length; i < l; i++) {
			var p = $(document.createElement('p'));
			p.attr('class', 'typer');
			p.html('<span class="typing"></span>');
			this.container.append(p);
		}

//		this.insertPoint.css('height', fontSize);

		// Select first paragraph, add the insertion point, start typing
		var p = this.container.find('p:first');
		p.append(this.insertPoint);
		var caller = this;
		setTimeout(function () {
			caller.typeLine(p, 0);
		}, 2000);
	},

	typeLine: function (p, index) {
		var span = p.find('span.typing');
		var line = this.lines[index];
		// Begin typing line
		this.typeLetter(p, index, 0, span, line);
	},

	typeLetter: function (p, lineIndex, letterIndex, span, line) {
		// add the letter
		span.append(line[letterIndex]);
		var caller = this;
		if (letterIndex + 1 < line.length) {
			// Add another letter (after a delay)
			setTimeout(function () {
					caller.typeLetter(p, lineIndex, letterIndex + 1, span, line);
				}, Math.floor((Math.random() * 100) + 50)
			);
		} else {
			// We've reached the end of the line, callback after a short delay
			setTimeout(function () {
				caller.finishLine(p, lineIndex)
			}, 500);
		}
	},

	finishLine: function (p, index) {
		// When we've finished a line of type, start a new one
		if (index + 1 < this.lines.length) {
			p = p.next();
			this.insertPoint.remove().appendTo(p);
			this.typeLine(p, index + 1);
		} else {
			this.insertPoint.remove();
		}
	}
};

function init() {

	map = new L.Map("map", { center: DEFAULT_POINT, zoom: 3});

	map.addLayer(
		new L.TileLayer("http://map.opendatacloud.de/trace/{z}/{x}/{y}.png ",
			{attribution: 'OpenDataCity, CC-BY',
				minZoom: 2,
				maxZoom: 5}
		)
	);

	rapath = new RaPath();

	var legend = L.control({position: 'bottomleft'});
	legend.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'legend');
		$(div).html('<div class="legend border"><span id="cable">&nbsp</span> ' + texts.cable + '</div>');
		return div;
	};
	legend.addTo(map);

	info = L.control({position: 'topleft'});
	info.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'hops');
		this._div = $(div);
		this._div.attr('id', 'hops');
		this._div.empty();
		if (isFrame) {
			this.append('<span class="upper">'+texts.tagline+'</span>');
			this.append(texts.subline);
			this.append(texts.helpline);
		}
		return div;
	};
	info.setText = function (txt) {
		this._div.text(txt);
	};
	info.setHTML = function (h) {
		this._div.html(h);
	};
	info.append = function (txt) {
		if (this._div.children().length > 3)
			this._div.children().first().remove();
		this._div.append('<p>' + txt + '</p>');
	};
	info.clear = function () {
		this._div.empty();
	};
	info.addTo(map);


	//var lines = [texts.helpline];
	//new Typing().beginTyping(lines, $('#hops'));
}

function showRoute(id) {
	if (routedata[id]) {
		var route_agencies = {};
		var routes = routedata[id].routes;
		if (routes && routes.length) {
			var route = routes[(parseInt((Math.random() * 1000), 10) % routes.length)];
			var geotrace = {};
			geotrace.hops = [];
			for (var i = 0; i < route.trace.length; i++) {
				var ip = route.trace[i];
				var geo = geoinfo[ip];
				var hop = {
					p: new L.LatLng(geo.lat, geo.lng),
					ip: ip,
					geo: geo
				};
				var agency = agencies[geo.country_code];
				if (agency)
					route_agencies[agency.name] = agency;
				geotrace.hops.push(hop);
			}
			var southWest = new L.LatLng(route.south, route.west),
				northEast = new L.LatLng(route.north, route.east);
			geotrace.bounds = new L.LatLngBounds(southWest, northEast);
			geotrace.agencies = route_agencies;
			geotrace.id = id;
			geotrace.name = routedata[id].name;
			rapath.start(geotrace);
		}
	}
}

$(document).ready(function () {
	init();
});