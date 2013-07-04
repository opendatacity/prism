#!/usr/bin/env node

var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var url = require('url');
var tracegeoip = require(path.resolve(__dirname, 'lib/tracegeoip'));

var app = express();

app.set('port', process.env.APP_PORT || 9910);
app.set('hostname', process.env.APP_HOSTNAME || "localhost");
app.use(express.favicon());
app.use(express.bodyParser());
app.use(express.methodOverride());

var datapath = path.resolve(__dirname, './data');

app.get('/prism/api/tracegeoip/:cmd', function (req, res) {
	var u = url.parse(req.params.cmd);
	var scan;
	if (u.host) {
		scan = u.host;
	} else if (u.path) {
		scan = u.path.split('/')[0];
	}
	if (scan && scan !== 'geoip.json' && scan.match(/^[a-z0-9\-\.]+$/i)) { // at least one tiny bit of security here, since this goes straigth to (s)hell. —@yetzt
		var trace = new tracegeoip.TraceGeoIP(datapath);
		trace.trace(scan, function (result) {
			res.json(result);
			trace.storeResult(scan, result);
		});
	} else {
		res.send(412);
	}
});

http.createServer(app).listen(app.get('port'), app.get('hostname'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});
