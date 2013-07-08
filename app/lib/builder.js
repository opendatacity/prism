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
		index: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/index.mustache")).toString(),
		main: {
			"de": fs.readFileSync(path.resolve(__dirname, "../base/tmpl/partial_main.de.mustache")).toString(),
			"en": fs.readFileSync(path.resolve(__dirname, "../base/tmpl/partial_main.en.mustache")).toString(),
			"fr": fs.readFileSync(path.resolve(__dirname, "../base/tmpl/partial_main.fr.mustache")).toString()
		},
		frame: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/frame.mustache")).toString(),
		trace: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/trace.mustache")).toString(),
		partials: {
			partial_analytics: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/partial_analytics.mustache")).toString(),
			partial_prism: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/partial_prism.mustache")).toString(),
			partial_head: fs.readFileSync(path.resolve(__dirname, "../base/tmpl/partial_head.mustache")).toString()
		}
	};

	var routes_data = {},
		geo_data = {};

	var all_routes = require(datapath + '/routes.json');
	sites.forEach(function (route) {
		var site_routes = all_routes.filter(function (r) {
			return (r.url == route.url) && (r.src == route.src);
		});
		var routes = [];
		if (site_routes.length == 0) {
			console.log('ALERT: ROUTE '+route.url+' ('+route.src +') WITHOUT DATA. I\'M SHOUTING! CAN YOU HEAR ME?');
		} else {
			site_routes.forEach(function (trace) {
				var route = [];
				var min_lat = 180,
					max_lat = 0,
					min_lng = 180,
					max_lng = 0;
				trace.hops.forEach(function (hop) {
					min_lat = Math.min(min_lat, hop.geo.lat);
					max_lat = Math.max(max_lat, hop.geo.lat);
					min_lng = Math.min(min_lng, hop.geo.lng);
					max_lng = Math.max(max_lng, hop.geo.lng);
					if (!geo_data[hop.ip])
						geo_data[hop.ip] = hop.geo;
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

	var trace = mustache.render(
		tmpl.trace, { }, { }
	);
	storeHTML('trace.html', trace);

	function getLangLinks(lang_code) {
		var result = [];
		var obj = {name: 'deutsch'};
		if (lang_code != 'de')
			obj.lang_code = 'de';
		result.push(obj);
		var obj = {name: 'english'};
		if (lang_code != 'en')
			obj.lang_code = 'en';
		result.push(obj);

//		var obj = {name: 'française'};
//		if (lang_code != 'fr')
//			obj.lang_code = 'fr';
//		result.push(obj);
		return result;
	}

	function buildParams(lang_texts, isFrame) {
		return    {
			routes_de: sites.filter(function(route){return route.src=="DE"}),
			routes_ch: sites.filter(function(route){return route.src=="CH"}),
			isFrame: isFrame,
			texts: lang_texts,
			langlinks: getLangLinks(lang_texts.lang_code),
			routedata: JSON.stringify(routes_data),
			geoinfo: JSON.stringify(geo_data),
			agencies: JSON.stringify(agencies),
			jstexts: JSON.stringify(lang_texts.js),
			main_url: "http://apps.opendatacity.de/prism/" + (lang_texts.lang_code == 'de' ? '' : lang_texts.lang_code),
			screenshot: "http://opendatacity.de/traceprism.jpg"
		};
	}

	var langs = ['en', 'de'];
	langs.forEach(function (lang) {
		tmpl.partials.partial_main = tmpl.main[lang]; //language dependent partial
		var index = mustache.render(
			tmpl.index,
			buildParams(texts[lang], false),
			tmpl.partials
		);
		storeHTML('index.' + lang + '.html', index);
		var frame = mustache.render(
			tmpl.frame,
			buildParams(texts[lang], true),
			tmpl.partials
		);
		storeHTML('frame.' + lang + '.html', frame);
	});

}

exports.build = build;

