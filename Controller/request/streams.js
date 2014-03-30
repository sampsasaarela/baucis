// __Dependencies__
var stream = require('stream');
var es = require('event-stream');

// __Private Module Members__
function addUserStream () {
  var streams = [];
  return function (transmute) {
    // If it's a stream, add it to the reserve pipeline.
    if (transmute && transmute.writable) return streams.push(transmute);
    // If it's a function, creat a map stream with it.
    if (transmute) return streams.push(es.map(transmute));
    // If called without arguments, return a pipeline linking all streams.
    if (streams.length > 0) return es.pipeline.apply(es, streams);
    // But, if no streams were added, just pass back a through stream.
    return es.through();
  };
}

// __Module Definition__
var decorator = module.exports = function () {
  this.request(function (request, response, next) {
    request.baucis.incoming = addUserStream();
    request.baucis.outgoing = addUserStream();
    next();
  });
};
