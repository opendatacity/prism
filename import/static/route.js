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
		$('.leaflet-control-zoom').hide();
//		$('#' + id).addClass('active');
		this.clear();
		this.geotrace = geotrace;
		this.layers = [];
		info.appendText(geotrace.name);
		map.panTo(this.geotrace.hops[0].p);
		this.processStep(0);
	},
	processStep: function (index) {
		var hop = this.geotrace.hops[index];
		info.appendText(this.getHopsText(hop));
		this.addPulse(hop);
		map.panTo(hop.p);
		var caller = this;
		window.setTimeout(function () {
			caller.stepPath(index + 1);
		}, 200);
	},
	displayEnd: function () {
		$('.leaflet-control-zoom').show();
		var result =  [];
		for (key in this.geotrace.agencies) {
			result.push(this.geotrace.agencies[key].name);
		}

		info.setHTML(
			'You have been abgeschnorchelt by:' + '<br/>' + result.join(', ')
		);
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

function init() {

	map = new L.Map("map", { center: DEFAULT_POINT, zoom: 3});

	map.addLayer(
		new L.TileLayer("http://sloppy.odcm.opendatacloud.de/trace/{z}/{x}/{y}.png ",
			{attribution: 'OpenDataCity, CC-BY'}
		)
	);

	rapath = new RaPath();

	info = L.control({position: 'bottomleft'});
	info.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'hops');
		this._div = $(div); // create a div with a class "info"
		this._div.attr('id', 'hops');
		this._div.empty();
		return div;
	};
	info.setText = function (txt) {
		this._div.text(txt);
	};
	info.setHTML = function (h) {
		this._div.html(h);
	};
	info.appendText = function (txt) {
		if (this._div.children().length > 3)
			this._div.children().first().remove();
		this._div.append('<p>' + txt + '</p>');
	};
	info.clear = function () {
		this._div.empty();
	};
	info.addTo(map);

	var lines = [$('#tagline').text(), $('#subline').text()];
	new Typing().beginTyping(lines, $('#hops'));
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