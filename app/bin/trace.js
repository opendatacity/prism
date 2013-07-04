#!/usr/bin/env node

var path = require('path');
var tracegeoip = require(path.resolve(__dirname, '../lib/tracegeoip'));
var destpath = path.resolve(__dirname, '../data');

var url = process.argv[2];
var urls = [];
if (url) {
	urls = [url];
} else {
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
	urls = routes_infos.map(function (route) {
		return route.id;
	});
}
var count = parseInt(process.argv[3]);
if (!count)
	count = 10;
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


