
var map = null;
var layers = [];
var alldata = null;

$(document).ready(function(){

	/* urls */
	
	$('a','#urls').click(function(evt){
		evt.preventDefault();
		$('#input').val($(this).attr('href').replace(/^.*\/\/([a-z\.]+)\/.*$/,'$1'));
		$('#adress').submit();
		return false;
	})

	/* share */
	$('.share-pop').click(function(evt){
		evt.preventDefault();
		window.open($(this).attr('href'), "share", "width=500,height=300,status=no,scrollbars=no,resizable=no,menubar=no,toolbar=no");
		return false;
	});
		
	/* submit button */
	$('#adress').submit(function () {
		
		$('html, body').animate({
			scrollTop: ($("#search").offset().top - 20)
		}, 500);
		
		$('#btn').attr("disabled", "disabled");
		$('#input').attr("disabled", "disabled");
		$('#spinner').removeAttr("hidden");
		$.ajax({
			url: '/prism/api/tracegeoip/' + encodeURIComponent($('#input').val()),
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
// FIXME: no alerts!
//				alert(xhr.status + ': ' + err);
			}
		});
		return false;
	});
	
	/* load map */
	map = new L.Map("map", {
		center: new L.LatLng(52.50085, 13.42232),
		zoom: 4
	}).addLayer(new L.TileLayer(
		"http://{s}.tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/998/256/{z}/{x}/{y}.png",
		{attribution: '© 2012 CloudMade, OpenStreetMap contributors, CC-BY-SA'}
	));
	
});

function load(url) {
	loadData("static/json/" + url + ".json");
}

function loadData(url) {
	$.ajax({
		url: url,
		dataType: 'json',
		success: function (data) {
			startPath(data);
		},
		error: function (xhr, ts, err) {
//	FIXME: no alerts.
//			alert(xhr.status + ': ' + err);
		}
	});
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
	if (("city" in hop.geoip.location.address) && (hop.geoip.location.address.city !== "")) {
		return '<div class="hop" title="IP: '+hop.ip+'"><span class="city">'+hop.geoip.location.address.city+'</span>, <span class="country">'+hop.geoip.location.address.country+'</span></div>';
	} else {
		return '<div class="hop" title="IP: '+hop.ip+'"><span class="country">'+hop.geoip.location.address.country+'</span></div>';
	}
}

function startPath(pathdata) {
	$('#ips').empty();
	alldata = pathdata;
	layers.forEach(function (l) {
		map.removeLayer(l);
	});
	layers = [];
	var path = [];
	pathdata.hops.forEach(function (hop) {
		var p =
			new L.LatLng(
				hop.geoip.location.coords.latitude,
				hop.geoip.location.coords.longitude
			);
		path.push(p);
	});
	$('#ips').append(getHopsText(alldata.hops[0]));
	map.panTo(path[0]);
	addPulse(path[0]);
	setTimeout(function () {
		stepPath(path, 1);
	}, 500);
}

function stepPath(path, index) {
	if (index >= path.length) {
		console.log('over');
		return;
	}
	addPathPart(path[index - 1], path[index], function () {
		$('#ips').append(getHopsText(alldata.hops[index]));
		addPulse(path[index]);
		map.panTo(path[index]);
		setTimeout(function () {
			stepPath(path, index + 1);
		}, 500);
	});
}