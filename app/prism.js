#!/usr/bin/env node

var
	express = require('express'),
	path = require('path'),
	mustache = require('mustache'),
	fs = require('fs');

var config = require(path.resolve(__dirname, './config.js'));

var app = express();

app.set('port', process.env.APP_PORT || config.port);
app.set('hostname', process.env.APP_HOSTNAME || config.hostname);

app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.methodOverride());
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
	app.use(express.logger('dev'));
} else {
	app.use(express.logger());
}
app.use(config.prefix + '/assets', express.static(__dirname + './../assets'));

var tmpl = {
	index_de: fs.readFileSync(path.resolve(__dirname, "tmpl/index.de.mustache")).toString(),
	index_en: fs.readFileSync(path.resolve(__dirname, "tmpl/index.en.mustache")).toString(),
	frame_de: fs.readFileSync(path.resolve(__dirname, "tmpl/frame.de.mustache")).toString(),
	frame_en: fs.readFileSync(path.resolve(__dirname, "tmpl/frame.en.mustache")).toString(),
	partial_prism: fs.readFileSync(path.resolve(__dirname, "tmpl/partial_prism.mustache")).toString()
};

var routes_data = {};

var routes_infos = [
	{id: 'amazon.de', name: 'Amazon', img: 'logo_amazon_de_tr.png'},
	{id: 'bild.de', name: 'Bild', img: 'logo_bild_tr.png'},
	{id: 'dropbox.com', name: 'Dropbox', img: 'logo_drop_tr.png'},
	{id: 'facebook.de', name: 'Facebook', img: 'logo_facebook_tr.png'},
	{id: 'gmail.com', name: 'Gmail', img: 'logo_gmail_tr.png'},
	{id: 'piratebay.sx', name: 'PirateBay', img: 'logo_pirate_tr.png'},
	{id: 'google.de', name: 'Google', img: 'logo_google_tr.png'},
	{id: 'skype.com', name: 'Skype', img: 'logo_skype_tr.png'},
	{id: 'whatsapp.com', name: 'Whatsapp', img: 'logo_whatsapp_tr.png'},
	{id: 'twitter.com', name: 'Twitter', img: 'logo_twitter_tr.png'},
	{id: 'youporn.com', name: 'YouPorn', img: 'logo_youp_tr.png'},
	{id: 'youtube.com', name: 'Youtube', img: 'logo_youtube_tr.png'}
];

var geo_info = {};

routes_infos.forEach(function (route) {
	var filename = path.resolve(__dirname, './data') + '/' + route.id + '.json';
	console.log(filename);
	var routes = [];
	if (fs.existsSync(filename)) {
		var data = JSON.parse(fs.readFileSync(filename, 'utf8'));
		if (!data.push)
			data = [data];
		data.forEach(function (trace) {
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
				if (!geo_info[hop.ip])
					geo_info[hop.ip] = {
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
	routes_data[route.id] = {name: route.name, routes: routes};
});

var agencies = {
	"DE": {name: "BND", cc: "DE", long: "Bundesnachrichtendienst"},
	"FR": {name: "DGSE", cc: "FR", long: "Direction Générale de la Sécurité Extérieure"},
	"NL": {name: "AIVD", cc: "NL", long: "Algemene Inlichtingen- en Veiligheidsdienst"},
	"CH": {name: "NDB", cc: "CH", long: "Nachrichtendienst des Bundes"},
	"UK": {name: "GCHQ", cc: "UK", long: "Government Communications Headquaters"},
	"US": {name: "NSA", cc: "US", long: "National Security Agency"},
	"ES": {name: "CNI", cc: "ES", long: "Centro Nacional de Inteligencia"},
	"LU": {name: "SRE", cc: "LU", long: "Service de Renseignement de l’État"},
	"CA": {name: "CSEC", cc: "CA", long: "Communications Security Establishment Canada"}
};

var jstexts_de = {
	tagline: 'Wo führt das hin?',
	subline: 'Beispielhafte Anfragen aus Deutschland an Internetdienste',
	helpline: 'Bitte unten Dienst auswählen',
	route_btn_hint: 'Anzeige der Route zu',
	requestline: 'Anfrage an',
	resultline: 'Möglicher Zugriff dieser Geheimdienste:',
	cable: 'Seekabel',
	countries: {
		"DE": {name: "Deutschland"},
		"FR": {name: "Frankreich"},
		"NL": {name: "Niederlande"},
		"CH": {name: "Schweiz"},
		"UK": {name: "Großbritanien"},
		"US": {name: "Vereinigte Staaten"},
		"ES": {name: "Spanien"},
		"LU": {name: "Luxemburg"}
	}
};
var jstexts_en = {
	tagline: 'Where is this going?',
	subline: 'Examples for Internet requests from Germany',
	helpline: 'Please choose a service below',
	route_btn_hint: 'Display a route to',
	requestline: 'Request to',
	resultline: 'Probalby accessed by these security services:',
	cable: 'submarine cable',
	countries: {
		"DE": {name: "Germany"},
		"FR": {name: "France"},
		"NL": {name: "Netherlands"},
		"CH": {name: "Swiss"},
		"UK": {name: "United Kingdom"},
		"US": {name: "United States"},
		"ES": {name: "Spain"},
		"LU": {name: "Luxembourg"}
	}
};

var agencies_str = JSON.stringify(agencies);
var routedata_str = JSON.stringify(routes_data);
var geoinfo_str = JSON.stringify(geo_info);
var jstexts_de_str = JSON.stringify(jstexts_de);
var jstexts_en_str = JSON.stringify(jstexts_en);

var site_de = mustache.render(
	tmpl.index_de,
	{ title: 'Prism', routes: routes_infos, routedata: routedata_str, geoinfo: geoinfo_str, jstexts: jstexts_de_str, agencies: agencies_str, isFrame: false},
	{ partial_prism: tmpl.partial_prism }
);

var site_en = mustache.render(
	tmpl.index_en,
	{ title: 'Prism', routes: routes_infos, routedata: routedata_str, geoinfo: geoinfo_str, jstexts: jstexts_en_str, agencies: agencies_str, isFrame: false},
	{ partial_prism: tmpl.partial_prism }
);

var frame_de = mustache.render(
	tmpl.frame_de,
	{ title: 'Prism', routes: routes_infos, routedata: routedata_str, geoinfo: geoinfo_str, jstexts: jstexts_de_str, agencies: agencies_str, isFrame: true },
	{ partial_prism: tmpl.partial_prism }
);

var frame_en = mustache.render(
	tmpl.frame_en,
	{ title: 'Prism', routes: routes_infos, routedata: routedata_str, geoinfo: geoinfo_str, jstexts: jstexts_en_str, agencies: agencies_str, isFrame: true },
	{ partial_prism: tmpl.partial_prism }
);

app.get(config.prefix, function (req, res) {
	res.send(site_de);
});

app.get(config.prefix + '/', function (req, res) {
	res.send(site_de);
});

app.get(config.prefix + '/frame.de.html', function (req, res) {
	res.send(frame_de);
});

app.get(config.prefix + '/frame.en.html', function (req, res) {
	res.send(frame_en);
});

app.get(config.prefix + '/de', function (req, res) {
	res.send(site_de);
});

app.get(config.prefix + '/en', function (req, res) {
	res.send(site_en);
});

app.listen(app.get('port'), app.get('hostname'));
console.log('Server listening on port ' + app.get('port'));
