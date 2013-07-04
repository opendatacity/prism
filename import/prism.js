var
	express = require('express'),
	path = require('path'),
	mustache = require('mustache'),
	fs = require('fs');

var app = express();

app.set('port', process.env.PORT || 20016);
app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.methodOverride());
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
	app.use(express.logger('dev'));
} else {
	app.use(express.logger());
}
app.use('/static', express.static(__dirname + '/static'));

var tmpl = {
	frame: fs.readFileSync(path.resolve(__dirname, "tmpl/frame.mustache")).toString(),
	index: fs.readFileSync(path.resolve(__dirname, "tmpl/index.mustache")).toString(),
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
						country: hop.geoip.location.address.country
					};
				route.push(hop.ip);
			});
			routes.push({trace: route, north: max_lat, west: min_lng, south: min_lat, east: max_lng });
		});
	}
	routes_data[route.id] = {name: route.name, routes: routes};
});

var routedata_str = JSON.stringify(routes_data);
var geoinfo_str = JSON.stringify(geo_info);

var texts = {
	title: 'OpenDataCity - Prism',
	tagline: 'Meine Daten: Wer liest mit?',
	subline: 'Beispielhafte Anfragen an diese Dienste aus Deutschland',
	headline: '5 Eyes: So funktionieren Prism & Tempora',
	route_btn_hint: 'Anzeige der Route zu',
	explain: 'Blafasel Blafasel Blafasel Blafasel Blafasel Blafasel Blafasel Blafasel Blafasel Blafasel Blafasel Blafasel'
};

var site = mustache.render(
	tmpl.index,
	{ title: 'Prism', routes: routes_infos, routedata: routedata_str, geoinfo: geoinfo_str, texts: texts },
	{ partial_prism: tmpl.partial_prism }
);
var frame = mustache.render(
	tmpl.frame,
	{ title: 'Prism', routes: routes_infos, routedata: routedata_str, geoinfo: geoinfo_str, texts: texts },
	{ partial_prism: tmpl.partial_prism }
);

app.get('/', function (req, res) {
	res.send(site);
});

app.get('/frame', function (req, res) {
	res.send(frame);
});

app.listen(app.get('port'), '127.0.0.1');
console.log('Server listening on port ' + app.get('port'));