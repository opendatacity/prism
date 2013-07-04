var fs = require('fs');
var path = require('path');
//var traceroute = require('traceroute');
var traceroute = require(path.resolve(__dirname, 'traceroute'));
//var geoip = require('geoip-lite');
var request = require('request');

function TraceGeoIP(datapath) {
	this.datapath = datapath;
	this.geoips = {};
	this.geoips_file = datapath + '/geoip.json';
	if (fs.existsSync(this.geoips_file))
		this.geoips = JSON.parse(fs.readFileSync(this.geoips_file, 'utf8'));
}

TraceGeoIP.prototype = {

	save_geoips: function () {
		fs.writeFile(this.geoips_file, JSON.stringify(this.geoips, null, '\t'), 'utf8', function (err) {
			if (err) {
				console.log('Cache Write Error:' + err);
			}
		});
	},

	geoip_proto: function (hop, result, cb) {
		if (this.geoips[hop.ip]) {
			cb(this.geoips[hop.ip]);
			return;
		}
		console.log('lookup geoip ' + hop.ip);
		var caller = this;
		request('http://geoip.prototypeapp.com/api/locate?ip=' + hop.ip, function (error, response, body) {
			var geoip = null;
			if (!error && response.statusCode == 200) {
				geoip = JSON.parse(body);
				caller.geoips[hop.ip] = geoip;
			}
			cb(geoip);
		});
	},

	/*
	 geo_geoip: function (hop, result, cb) {
	 var geoip = geoip.lookup(hop.ip);
	 if (geoip) {
	 hop.geoip = geoip;
	 result.hops.push(hop);
	 result.waypoints.push([hop.geoip.ll[0], hop.geoip.ll[1]]);
	 }
	 cb();
	 },
	 */

	geoIt: function (index, hops, result, cb) {
		var caller = this;
		if (index >= hops.length) {
			cb();
		} else {
			var hop = hops[index];
			caller.geoip_proto(hop, result, function (geoip) {
				if (geoip && (geoip.location.coords.longitude != "0")) {
					hop.geoip = geoip;
					result.hops.push(hop);
				}
				caller.geoIt(index + 1, hops, result, cb);
			});
		}
	},

	trace: function (url, cb) {
		console.log('tracing ' + url);
		var storefile = path.resolve(this.datapath, 'cache', url+'.json');
		var caller = this;
		fs.exists(storefile, function(ex){
			if (ex) {
				fs.readFile(storefile, function(err, data){
					if (!err) {
						cb(JSON.parse(data.toString()));
					} else {
						cb(null);
					}
				});
			} else {
				traceroute.trace(url, function (err, hops) {
					if (!err) {
						var result = {url: url, hops: [], time: new Date()};
						var h = [];
						var last = "";
						hops.forEach(function (hop) {
							for (key in hop) {
								if ((last != key) && (key.match(/\./g))) {
									hop.ip = key;
									h.push(hop);
								}
								last = key;
							}
						});
						caller.geoIt(0, h, result, function () {
							if (cb) cb(result);
							fs.writeFile(storefile, JSON.stringify(result));
							caller.save_geoips();
						});
					} else {
						cb(null);
					}
				});
			}
		});
	},

	storeResult: function (url, result, cb) {
		var filename = this.datapath + '/' + url + '.json';

		function saveList(list) {
			list.push(result);
			fs.writeFile(filename, JSON.stringify(list, null, "\t"), 'utf8', function (err) {
				if (cb)
					cb();
			});
		}

		fs.exists(filename, function (exists) {
			if (exists) {
				fs.readFile(filename, 'utf8', function (err, data) {
					var list = JSON.parse(data);
					saveList(list);
				});
			} else {
				saveList([]);
			}
		});
	}

};

exports.TraceGeoIP = TraceGeoIP;