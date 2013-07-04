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
	"DE": {name: "BND", long: "Bundesnachrichtendienst", image: "todo"},
	"FR": {name: "DGSE", long: "Direction Générale de la Sécurité Extérieure", image: "todo"},
	"NL": {name: "AIVD", long: "Algemene Inlichtingen- en Veiligheidsdienst", image: "todo"},
	"CH": {name: "NDB", long: "Nachrichtendienst des Bundes", image: "todo"},
	"US": {name: "GCHQ", long: "Government Communications Headquaters", image: "todo"},
	"UK": {name: "NSA", long: "National Security Agency", image: "todo"},
	"ES": {name: "CNI", long: "Centro Nacional de Inteligencia", image: "todo"},
	"LU": {name: "SRE", long: "Service de Renseignement de l’État", image: "todo"}
};

var jstexts_de = {
	tagline: 'Meine Daten: Wer liest mit?',
	subline: 'Beispielhafte Anfragen an diese Dienste aus Deutschland',
	helpline: 'Bitte klicken Sie unten auf ein Bild um eine Beispielanfrage zu starten',
	route_btn_hint: 'Anzeige der Route zu',
	resultline: 'You have been abgeschnorchelt by:'
};
var jstexts_en = {
	tagline: 'Meine Daten: Wer liest mit?',
	subline: 'Beispielhafte Anfragen an diese Dienste aus Deutschland',
	helpline: 'Bitte klicken Sie unten auf ein Bild um eine Beispielanfrage zu starten',
	route_btn_hint: 'Anzeige der Route zu',
	resultline: 'You have been abgeschnorchelt by:'
};

var agencies_str = JSON.stringify(agencies);
var routedata_str = JSON.stringify(routes_data);
var geoinfo_str = JSON.stringify(geo_info);
var jstexts_de_str = JSON.stringify(jstexts_de);
var jstexts_en_str = JSON.stringify(jstexts_en);

var site_de = mustache.render(
	tmpl.index_de,
	{ title: 'Prism', routes: routes_infos, routedata: routedata_str, geoinfo: geoinfo_str, jstexts: jstexts_de_str, agencies: agencies_str },
	{ partial_prism: tmpl.partial_prism }
);

var site_en = mustache.render(
	tmpl.index_en,
	{ title: 'Prism', routes: routes_infos, routedata: routedata_str, geoinfo: geoinfo_str, jstexts: jstexts_en_str, agencies: agencies_str },
	{ partial_prism: tmpl.partial_prism }
);

app.get(config.prefix, function (req, res) {
	res.send(site_de);
});

app.get(config.prefix + '/', function (req, res) {
	res.send(site_de);
});

app.get(config.prefix + '/de', function (req, res) {
	res.send(site_de);
});

app.get(config.prefix + '/en', function (req, res) {
	res.send(site_en);
});

app.listen(app.get('port'), app.get('hostname'));
console.log('Server listening on port ' + app.get('port'));
