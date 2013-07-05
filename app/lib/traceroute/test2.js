var traceroute = require('./traceroute');

function trace() {
  traceroute.trace('4.2.2.2', function (err,hops) {
      console.log(hops);
    });
}

setInterval(trace,1000);

