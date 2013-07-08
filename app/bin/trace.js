#!/usr/bin/env node
var path = require('path');
var destpath = path.resolve(__dirname, '../data/cache');
var tracegeoip = require(path.resolve(__dirname, '../lib/tracegeoip'));

var url = process.argv[2];
var urls = [];
if (url) {
	urls = [url];
} else {
	var sites = require(path.resolve(__dirname, '../base/sites.json'));
	urls = sites.map(function (route) {
		return route.url;
	});
}

var count = parseInt(process.argv[3]);
if (!count)
	count = 1;
var trace = new tracegeoip.TraceGeoIP(destpath);

function traceUrl(url, count, cb) {

	function traceIt(nr) {
		if (nr >= count) {
			cb();
			return;
		}
		trace.trace(url, function (result) {
			trace.storeResult(url, result);
			traceIt(nr + 1);
		});
	}

	traceIt(0);
}

function traceUrlNr(index) {
	var url = urls[index];
	traceUrl(url, count, function () {
		if (index + 1 >= urls.length) {
			console.log('all done <3');
		} else {
			traceUrlNr(index + 1);
		}
	});

}
traceUrlNr(0);


