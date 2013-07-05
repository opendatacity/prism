function build() {
	var
		mustache = require('mustache'),
		path = require('path'),
		fs = require('fs');
	var
		datapath = path.resolve(__dirname, '../data'),
		destpath = path.resolve(__dirname, '../dist');
	var
		sites = require(path.resolve(__dirname, '../base/sites.json')),
		agencies = require(path.resolve(__dirname, '../base/agencies.json')),
		texts = require(path.resolve(__dirname, '../base/texts.json'));

	var tmpl = {
		analytics: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/analytics.mustache")).toString(),
		index_de: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/index.de.mustache")).toString(),
		index_en: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/index.en.mustache")).toString(),
		frame_de: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/frame.de.mustache")).toString(),
		frame_en: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/frame.en.mustache")).toString(),
		trace_de: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/trace.de.mustache")).toString(),
		partial_prism: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/partial_prism.mustache")).toString(),
		partial_head: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/partial_head.mustache")).toString()
	};

	var routes_data = {},
		geo_data = {};

	var all_routes = require(path.resolve(__dirname, '../data/routes.json'));
	sites.forEach(function (route) {
		var site_routes = all_routes.filter(function (r) {
			return r.url = route.url;
		});
		var routes = [];
		if (site_routes.length == 0) {
			console.log('ALERT: ROUTE WITHOUT DATA. I\'M SHOUTING! CAN YOU HEAR ME?');
		} else {
			site_routes.forEach(function (trace) {
				var route = [];
				var min_lat = 180,
					max_lat = 0,
					min_lng = 180,
					max_lng = 0;
				trace.hops.forEach(function (hop) {
					min_lat = Math.min(min_lat, hop.geoip.location.coords.latitude);
					max_lat = Math.max(max_lat, hop.geoip.location.coords.latitude);
					min_lng = Math.min(min_lng, hop.geoip.location.coords.longitude);
					max_lng = Math.max(max_lng, hop.geoip.location.coords.longitude);
					if (!geo_data[hop.ip])
						geo_data[hop.ip] = {
							lat: hop.geoip.location.coords.latitude,
							lng: hop.geoip.location.coords.longitude,
							city: hop.geoip.location.address.city,
							country: hop.geoip.location.address.country,
							country_code: hop.geoip.location.address.country_code
						};
					route.push(hop.ip);
				});
				routes.push({trace: route, north: max_lat, west: min_lng, south: min_lat, east: max_lng });
			});
		}
		routes_data[route.id] = {name: route.name, url: route.url, routes: routes};
	});

	function storeHTML(filename, data) {
		fs.writeFile(destpath + '/' + filename, data);
		console.log('Write ' + destpath + '/' + filename);
	}

	var trace_de = mustache.render(
		tmpl.trace_de,
		{ },
		{ }
	);
	storeHTML('trace.de.html', trace_de);

	function buildParams(lang_texts, full_url, isFrame) {
		return    {
			routes: sites,
			routedata: JSON.stringify(routes_data),
			geoinfo: JSON.stringify(geo_data),
			jstexts: JSON.stringify(lang_texts),
			agencies: JSON.stringify(agencies),
			isFrame: isFrame,
			texts: lang_texts,
			full_url: full_url,
			screenshot: "http://opendatacity.de/traceprism.jpg"
		};
	}

	var partials = {
		partial_prism: tmpl.partial_prism, analytics: tmpl.analytics, partial_head: tmpl.partial_head
	};

	var site_de = mustache.render(
		tmpl.index_de,
		buildParams(texts["de"], "http://apps.opendatacity.de/prism/de", false),
		partials
	);
	storeHTML('index.de.html', site_de);

	var site_en = mustache.render(
		tmpl.index_en,
		buildParams(texts["en"], "http://apps.opendatacity.de/prism/en", false),
		partials
	);
	storeHTML('index.en.html', site_en);

	var frame_de = mustache.render(
		tmpl.frame_de,
		buildParams(texts["de"], "http://apps.opendatacity.de/prism/frame.de.html", true),
		partials
	);
	storeHTML('frame.de.html', frame_de);

	var frame_en = mustache.render(
		tmpl.frame_en,
		buildParams(texts["en"], "http://apps.opendatacity.de/prism/frame.en.html", true),
		partials
	);
	storeHTML('frame.en.html', frame_en);
}

exports.build = build;

