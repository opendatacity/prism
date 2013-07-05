#!/usr/bin/env node

var
	express = require('express'),
	path = require('path'),
	url = require('url'),
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

if (!fs.existsSync(path.resolve(__dirname, "dist/index.de.html"))) {
	//call the builder if static html does not exists
	require(path.resolve(__dirname, './bin/builder')).build();
}

var sites = {
	index_de: fs.readFileSync(path.resolve(__dirname, "dist/index.de.html")).toString(),
	index_en: fs.readFileSync(path.resolve(__dirname, "dist/index.en.html")).toString(),
	frame_de: fs.readFileSync(path.resolve(__dirname, "dist/frame.de.html")).toString(),
	frame_en: fs.readFileSync(path.resolve(__dirname, "dist/frame.en.html")).toString(),
	trace_de: fs.readFileSync(path.resolve(__dirname, "dist/trace.de.html")).toString()
};

app.get(config.prefix, function (req, res) {
	res.send(sites.index_de);
});

app.get(config.prefix + '/', function (req, res) {
	res.send(sites.index_de);
});

app.get(config.prefix + '/frame.de.html', function (req, res) {
	res.send(sites.frame_de);
});

app.get(config.prefix + '/frame.en.html', function (req, res) {
	res.send(sites.frame_en);
});

app.get(config.prefix + '/de', function (req, res) {
	res.send(sites.index_de);
});

app.get(config.prefix + '/en', function (req, res) {
	res.send(sites.index_en);
});

if (config.allowtrace) {
	var tracegeoip = require(path.resolve(__dirname, './lib/tracegeoip'));
	var cachepath = path.resolve(__dirname, './data/cache')
	var trace_cache = [];

	app.get(config.prefix + '/trace', function (req, res) {
		res.send(sites.trace_de);
	});

	app.get(config.prefix + '/trace/cache', function (req, res) {
		res.json(trace_cache);
	});

	app.get(config.prefix + '/trace/it/:cmd', function (req, res) {
		var u = url.parse(req.params.cmd);
		var scan;
		if (u.host) {
			scan = u.host;
		} else if (u.path) {
			scan = u.path.split('/')[0];
		}
		if (scan && scan.match(/^[a-z0-9\-\.]+$/i)) {
			var trace = new tracegeoip.TraceGeoIP(cachepath);
			trace.trace(scan, function (result) {
				res.json(result);
				trace.storeResult(scan, result);
			});
		} else {
			res.send(412);
		}
	});

}

app.listen(app.get('port'), app.get('hostname'));
console.log('Server listening on port ' + app.get('port'));
