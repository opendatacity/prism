var DEFAULT_POINT = new L.LatLng(52.50085, 13.42232);

var cachedata = [];
var layers = [];
var currenttrace;
var capath_layer;

function loadData(url, cb) {
	$.ajax({
		url: url,
		dataType: 'json',
		success: function (data) {
			cb(data);
		},
		error: function (xhr, ts, err) {
			alert(xhr.status + ': ' + err);
		}
	});
}

function CaPath(map) {
	this.map = map;
	this.route = null;
	this.canvasLayer = new L.TileLayer.Canvas();
	this.map.addLayer(this.canvasLayer);
	var caller = this;
	this.canvasLayer.drawTile = function (canvas, tile, zoom) {
		var context = canvas.getContext('2d');
		var tileSize = this.options.tileSize;

		// Store the current transformation matrix
		context.save();

		// Use the identity matrix while clearing the canvas
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, canvas.width, canvas.height);

		// Restore the transform
		context.restore();

		var offset = tile.multiplyBy(tileSize);

		if (caller.route) {
			caller.drawRoute(context, offset);
		}
	};

}

CaPath.prototype = {


	drawCanvasLine: function (context, src_hop, dest_hop, offset) {
		var src = new L.LatLng(
			src_hop.geo.lat,
			src_hop.geo.lng
		);
		var dest = new L.LatLng(
			dest_hop.geo.lat,
			dest_hop.geo.lng
		);
		var p_src = this.map.project(src);
		var p_dest = this.map.project(dest);
		var x_src = Math.round(p_src.x - offset.x);
		var y_src = Math.round(p_src.y - offset.y);
		var x_dst = Math.round(p_dest.x - offset.x);
		var y_dst = Math.round(p_dest.y - offset.y);

		var amount = 1;
		var x_ani = x_src + (x_dst - x_src) * amount;
		var y_ani = y_src + (y_dst - y_src) * amount;

		context.shadowBlur = 0;
		context.shadowOffsetX = 0;
		context.shadowOffsetY = 0;
		context.lineWidth = 1;
		context.strokeStyle = "black";
		context.beginPath();
		context.moveTo(x_src, y_src);
		context.lineTo(x_ani, y_ani);
		context.stroke();
	},

	drawCanvasPoint: function (context, hop, start) {
		var point = new L.LatLng(
			hop.geo.lat,
			hop.geo.lng
		);
		// circle radius
		var radius = 2;

		// actual coordinates to tile pixel
		var p = this.map.project(point);

		// point to draw
		var x = Math.round(p.x - start.x);
		var y = Math.round(p.y - start.y);

		// Circle
		context.beginPath();
		context.arc(x, y, radius, 0, 2 * Math.PI, false);

		// Fill (Gradient)
		var grd = context.createRadialGradient(x, y, 5, x, y, radius);
		grd.addColorStop(0, "#8ED6FF");
		grd.addColorStop(1, "#004CB3");
		context.fillStyle = grd;

		// Shadow
		context.shadowColor = "#666666";
		context.shadowBlur = 5;
		context.shadowOffsetX = 7;
		context.shadowOffsetY = 7;
		context.fill();

		context.lineWidth = 2;
		context.strokeStyle = "black";
		context.stroke();
	},

	drawRoute: function (context, offset) {
		this.drawCanvasPoint(context, this.route.hops[0], offset);
		for (var j = 1; j < this.route.hops.length; j++) {
			var hop = this.route.hops[j];
			this.drawCanvasPoint(context, hop, offset);
			this.drawCanvasLine(context, this.route.hops[j - 1], this.route.hops[j], offset);
		}
	},

	displayRoute: function (routenr) {
		this.route = cachedata[routenr];
		$('#ips').html(
			this.route.hops.map(function (h) {
				return getHopsText(h);
			})
		);
		$('#json').text(JSON.stringify(this.route));
		this.canvasLayer.redraw();
	}

};

function showCacheRoute(route) {
	capath_layer.displayRoute(route);
}

function addPathPart(src, dest, cb) {
	var b = new R.BezierAnim([src, dest], {}, function () {
		if (cb)
			cb();
	});
	layers.push(b);
	map.addLayer(b);
}

function addPulse(latlng) {
	var p = new R.Pulse(
		latlng,
		3,
		{'stroke': '#2478ad', 'fill': '#30a3ec'},
		{'stroke': '#30a3ec', 'stroke-width': 2});
	layers.push(p);
	map.addLayer(p);
	return p;
}

function getHopsText(hop) {
	return '<small>' + hop.ip + ' ' +
		hop.geo.city + ', ' +
		hop.geo.country +
		'</small>' + '<br/>';
}

function startPath(pathdata) {
	$('#ips').empty();
	currenttrace = pathdata;
	layers.forEach(function (l) {
		map.removeLayer(l);
	});
	layers = [];
	var path = [];
	pathdata.hops.forEach(function (hop) {
		var p =
			new L.LatLng(
				hop.geo.lat,
				hop.geo.lng
			);
		path.push(p);
	});
	$('#ips').append(getHopsText(currenttrace.hops[0]));
	map.panTo(path[0]);
	addPulse(path[0]);
	setTimeout(function () {
		stepPath(path, 1);
	}, 500);
}

function stepPath(path, index) {
	if (index >= path.length) {
		return;
	}
	addPathPart(path[index - 1], path[index], function () {
		$('#ips').append(getHopsText(currenttrace.hops[index]));
		addPulse(path[index]);
		map.panTo(path[index]);
		setTimeout(function () {
			stepPath(path, index + 1);
		}, 500);
	});
}

function init() {

	loadData('/prism/trace/cache', function (data) {
		cachedata = data;
		$('#cache').empty();
		for (var i = 0; i < cachedata.length; i++) {
			$('#cache').append('<a href="javascript:;" onclick="showCacheRoute(' + "'" + i + "'" + ');">' + cachedata[i].url + '</a> ');
		}
	});

	$('#adress').submit(function () {
		$('#btn').attr("disabled", "disabled");
		$('#input').attr("disabled", "disabled");
		$('#spinner').removeAttr("hidden");
		$.ajax({
			url: '/prism/trace/it/' + encodeURIComponent($('#input').val()),
			dataType: 'json',
			timeout: 9999999999,
			success: function (data) {
				if (data)
					startPath(data);
				$('#spinner').attr("hidden", "hidden");
				$('#btn').removeAttr("disabled");
				$('#input').removeAttr("disabled");
			},
			error: function (xhr, ts, err) {
				$('#spinner').attr("hidden", "hidden");
				$('#btn').removeAttr("disabled");
				$('#input').removeAttr("disabled");
				alert(xhr.status + ': ' + err);
			}
		});
		return false;
	});

	var map = new L.Map("map", {
		center: DEFAULT_POINT,
		zoom: 4

	}).addLayer(
			new L.TileLayer("http://{s}.tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/998/256/{z}/{x}/{y}.png",
				{attribution: '© 2012 CloudMade, OpenStreetMap contributors, CC-BY-SA'}
			));

	capath_layer = new CaPath(map);

}

$(document).ready(function () {
	init();
});
