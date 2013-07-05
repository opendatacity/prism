traceroute = require('./traceroute');

setInterval(function () {
  traceroute.trace('google.com', function (err,hops) {
    if (!err) {
      console.log("Hops: " + hops.length);
      console.log(hops);
    }
  });
}, 10000);
