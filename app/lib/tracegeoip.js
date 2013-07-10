var geoiplite = require('geoip-lite');
var request = require('request');
var fs = require('fs');
var path = require('path');
var net = require('net');

var traceroute = require(path.resolve(__dirname, 'traceroute'));

function TraceGeoIP(datapath) {
	this.datapath = datapath;
	this.geoips = {};
	this.geoips_file = datapath + '/geoip.json';
	if (fs.existsSync(this.geoips_file))
		this.geoips = JSON.parse(fs.readFileSync(this.geoips_file, 'utf8'));

//	if (fs.existsSync(this.datapath + '/geoip1.json')) {
//		var geoips1 = JSON.parse(fs.readFileSync(this.datapath + '/geoip1.json', 'utf8'));
//		for (var key in geoips1) {
//			if (!this.geoips[key]) {
//				this.probe(key, geoips1[key]);
//			}
//		}
//	}

	this.importdebugMacTraceRoute();
}

TraceGeoIP.prototype = {

	importdebugMacTraceRoute: function () {
		function parseHopNix(line) {
			if (line[1] === '0')
				return false;

			var hop = {},
				lastip = line[1];

			hop[line[1]] = [+line[2]];

			for (var i = 3; i < line.length; i++) {
				if (net.isIP(line[i])) {
					lastip = line[i];
					if (!hop[lastip])
						hop[lastip] = [];
				}
				else hop[lastip].push(+line[i]);
			}

			return hop;
		}

		function parseHop(line) {
			line = line.replace(/\*/g, '0');
//		if (isWin) line = line.replace(/\</g,'');
			var s = line.split(' ');
			for (var i = s.length - 1; i > -1; i--) {
				if (s[i] === '') s.splice(i, 1);
				if (s[i] === 'ms') s.splice(i, 1);
			}

//		if (isWin) return parseHopWin(s);
//		else
			return parseHopNix(s);
		}

		console.log('ha?');
		if (fs.existsSync(this.datapath + '/trace-fr.txt')) {
			console.log('ho!');
			var list = fs.readFileSync(this.datapath + '/trace-fr.txt', 'utf8').toString().split("\n");
			console.log('me!');
			var routes = [];
			var hops = [];
			var name = "";
			for (var i = 0; i < list.length; i++) {
				var line = list[i];
				if (line.indexOf('traceroute to') >= 0) {
					if (hops.length > 0) {
						routes.push({url: name, src: "FR", hops: hops});
					}
					hops = [];
					name = line.split(" ")[2];
				} else {
					var check = parseHop(line);
					if (check) {
						for (var key in check) {
							if ((net.isIP(key) && (!isInPrivateRange(key))))
								hops.push({ip: key});
						}
					}
				}
//			console.log(line);
//			console.log(JSON.stringify(parseHop(line)));
			}
			if (hops.length > 0) {
				routes.push({url: name, src: "FR", hops: hops});
			}

			var caller = this;

			function meh(index, cb) {
				if (index >= routes.length)
					cb();
				else {
					caller.geoIt(0, routes[index].hops, function () {
						routes[index].hops = routes[index].hops.filter(function (hop) {
							return hop.geo;
						});
						meh(index + 1, cb);
					})
				}
			}

			meh(0, function () {

				routes.forEach(function(route){
					console.log(JSON.stringify(route)+',');
				})  ;

				console.log('done');
				caller.save_geocache();
			});

		}

	},


	probe: function (ip, proto) {
		if (!proto) {
			var geo2 = geoiplite.lookup(ip);
			if (geo2) {
				geo2 = unifyGeoLite(geo2);
				console.log(geo2);
				if (geo2.cc != 'EU') {
					//seen none of these, but well
					this.geoips[ip] = geo2;
				}
			}
			return;
		}
		var geo = unifyProto(proto);
		if ((geo.cc != 'RD') && (geo.cc != 'EU')) { //we take countries only
			if ((!geo.city)) {
				var geo2 = geoiplite.lookup(ip);
				if (geo2) {
					geo2 = unifyGeoLite(geo2);
					if (geo2.cc != 'EU') {
						if (geo2.city) {
							//seen only 4 of this
							this.geoips[ip] = geo2;
							return;
						}
						if (geo.cc != geo2.cc) {
							//differences seen: GB-United Kingdom vs IE-Irelandc
							//console.log(geo.cc + ' vs ' + geo2.cc);
						}
					}
				}
			}
			this.geoips[ip] = geo;
		}
	},

	geoIt: function (index, hops, cb) {
		var caller = this;
		if (index >= hops.length) {
			cb();
		} else {
			var hop = hops[index];
			hop.geo = this.geoips[hop.ip];
			if (hop.geo) {
				//from cache
				caller.geoIt(index + 1, hops, cb);
			} else {
				caller.geoip_proto(hop, function (geo) {
					//cache if cachable
					caller.probe(hop.ip, geo);
					//try again
					hop.geo = caller.geoips[hop.ip];
					//next
					caller.geoIt(index + 1, hops, cb);
				});
			}
		}
	},

	save_geocache: function () {
		fs.writeFile(this.geoips_file, JSON.stringify(this.geoips, null, '\t'), 'utf8', function (err) {
			if (err) {
				console.log('Cache Write Error:' + err);
			}
		});
	},

	geoip_proto: function (hop, cb) {
		console.log('lookup geoip ' + hop.ip);
		var caller = this;
		request('http://geoip.prototypeapp.com/api/locate?ip=' + hop.ip, function (error, response, body) {
			var geoip = null;
			if (!error && response.statusCode == 200) {
				geoip = JSON.parse(body);
			}
			cb(geoip);
		});
	},

	trace: function (url, cb) {
		console.log('tracing ' + url);
		var caller = this;
		traceroute.trace(url, function (err, hops) {
			if (!err) {
				var result = {url: url, hops: [], time: new Date()};
				var h = [];
				var ips = hops.map(function (hop) {
					for (var key in hop) {
						if (hop.hasOwnProperty(key)) {
							return key;
						}
					}
					return '';
				});
				var last = "";
				ips.forEach(function (ip) {
					if ((last != ip) && (ip.match(/\./g))) {
						//	console.log('key: ' + ip);
						if (!isInPrivateRange(ip)) {
							var hop = {ip: ip};
							h.push(hop);
						} else {
							//		console.log('private url ignored: ' + ip);
						}
						last = ip;
					}
				});
				caller.geoIt(0, h, function () {
					result.hops = h.filter(function (hop) {
						return hop.geo;
					});
					if (cb)
						cb(result);
					caller.save_geocache();
				});
			}
		});
	},

	snowflake: function (hops) {
		return hops.map(function (hop) {
			return hop.id;
		}).join(';');
	},

	storeResult: function (url, result, cb) { //if something new
		if (result.hops.length == 0) {
			console.log('empty :.(');
			if (cb) cb();
			return;
		}
		var filename = this.datapath + '/' + url + '.json';
		var caller = this;

		function saveList(list) {
			var flake = caller.snowflake(result.hops);
			var snow = list.filter(function (route) {
				return caller.snowflake(route.hops) == flake;
			});
			if (snow.length == 0) {
				list.push(result);
			}
			fs.writeFile(filename, JSON.stringify(list, null, "  "), 'utf8', function (err) {
				if (cb) cb();
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

/*
 var
 geoipliteformat = {
 range: [ 3577547520, 3577550983 ],
 country: 'DE',
 region: '',
 city: '',
 ll: [ 0, 0 ]
 };
 */

var custom_country_codes = {
	"AU": "Australia",
	"DE": "Germany",
	"FR": "France",
	"NL": "Netherlands",
	"CH": "Swiss",
	"CA": "Canada",
	"EU": "Europe",
	"DK": "Denmark",
	"GB": "United Kingdom",
	"UK": "United Kingdom",
	"US": "United States",
	"ES": "Spain",
	"IR": "Iran",
	"IT": "Italy",
	"KP": "Korea",
	"CN": "China",
	"BE": "Belgium",
	"EE": "Estonia",
	"IE": "Ireland",
	"LU": "Luxembourg",
	"PL": "Poland"
};

function unifyGeoLite(geoip) {
	var result = {};
	result.lat = geoip.ll[0];
	result.lng = geoip.ll[1];
	result.city = geoip.city;
	result.cc = geoip.country;
	var country = custom_country_codes[geoip.country];
	if (!country) {
		console.log('Missing Country Code: ' + geoip.country);
		result.country = '';
	}
	result.country = country;
	return result;
}

/*
 var protoformat = {
 "ip": "213.191.64.26",
 "timestamp": 1373052899535,
 "location": {
 "coords": {
 "latitude": "53.5833",
 "longitude": "9.7167"
 },
 "address": {
 "city": "Wedel",
 "country": "Germany",
 "country_code": "DE"
 },
 "gmtOffset": "1",
 "dstOffset": "2"
 }
 };
 */

//private ip test from node-geoip
function aton4(a) {
	a = a.split(/\./);
	return ((parseInt(a[0], 10) << 24) >>> 0) + ((parseInt(a[1], 10) << 16) >>> 0) + ((parseInt(a[2], 10) << 8) >>> 0) + (parseInt(a[3], 10) >>> 0);
}
var private_ranges = [
	[aton4("10.0.0.0"), aton4("10.255.255.255")],
	[aton4("172.16.0.0"), aton4("172.31.255.255")],
	[aton4("192.168.0.0"), aton4("192.168.255.255")]
];
function isInPrivateRange(ip) {
	ip = aton4(ip);
	for (i = 0; i < private_ranges.length; i++) {
		if (ip >= private_ranges[i][0] && ip <= private_ranges[i][1]) {
			return true;
		}
	}
	return false;
}


function unifyProto(geoip) {
	var result = {};
	result.lat = geoip.location.coords.latitude;
	result.lng = geoip.location.coords.longitude;
	result.city = geoip.location.address.city;
	result.cc = geoip.location.address.country_code;
	result.country = geoip.location.address.country;
	return result;
}

exports.TraceGeoIP = TraceGeoIP;