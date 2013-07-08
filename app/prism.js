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

if (config.debug) {
	app.use(express.errorHandler());
	app.use(express.logger('dev'));
}
app.use('/prism/assets', express.static(__dirname + './../assets'));

if (!config.debug) {
	app.use(express.logger());
}

if (!fs.existsSync(path.resolve(__dirname, "dist/index.de.html"))) {
	//call the builder if static html does not exists
	require(path.resolve(__dirname, './lib/builder')).build();
}


var sites = {
	index_de: fs.readFileSync(path.resolve(__dirname, "dist/index.de.html")).toString(),
	index_en: fs.readFileSync(path.resolve(__dirname, "dist/index.en.html")).toString(),
//	index_fr: fs.readFileSync(path.resolve(__dirname, "dist/index.fr.html")).toString(),
	frame_de: fs.readFileSync(path.resolve(__dirname, "dist/frame.de.html")).toString(),
	frame_en: fs.readFileSync(path.resolve(__dirname, "dist/frame.en.html")).toString(),
//	frame_fr: fs.readFileSync(path.resolve(__dirname, "dist/frame.fr.html")).toString(),
	trace: fs.readFileSync(path.resolve(__dirname, "dist/trace.html")).toString()
};

app.get('/prism', function (req, res) {
	res.send(sites.index_de);
});

app.get('/prism/', function (req, res) {
	res.send(sites.index_de);
});

app.get('/prism/frame.de.html', function (req, res) {
	res.send(sites.frame_de);
});

app.get('/prism/frame.en.html', function (req, res) {
	res.send(sites.frame_en);
});

app.get('/prism/de', function (req, res) {
	res.send(sites.index_de);
});

app.get('/prism/en', function (req, res) {
	res.send(sites.index_en);
});

//app.get('/prism/frame.fr.html', function (req, res) {
//	res.send(sites.frame_en);
//});
//
//app.get('/prism/fr', function (req, res) {
//	res.send(sites.index_en);
//});

if (config.allowtrace) {
	var tracegeoip = require(path.resolve(__dirname, './lib/tracegeoip'));
	var cachepath = path.resolve(__dirname, './data/cache')
	var trace_cache = [];

	var done = {};
	var files = fs.readdirSync(cachepath);
	files.forEach(function (filename) {
		if ((filename != 'geoip.json') && (path.extname(filename) == '.json')) {
			var data = JSON.parse(fs.readFileSync(cachepath + '/' + filename));
			if (data.url)
				data = [data];
			if (data.length)
				data.forEach(function (route) {
					var ids = route.id + route.hops.map(function (hop) {
						return hop.ip + ',';
					});
					if (data.waypoints) {
						delete data.waypoints;
					}
					if (!done[ids]) {
						done[ids] = true;
						trace_cache.push(route);
					}
				});
		}
	});

	if (config.debug) {
		require(path.resolve(__dirname, './lib/builder')).build(); //debug only!!
	}

	app.get('/prism/trace', function (req, res) {
		res.send(sites.trace);
	});

	app.get('/prism/trace/cache', function (req, res) {
		res.json(trace_cache);
	});

	app.get('/prism/trace/it/:cmd', function (req, res) {
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
