// __Dependencies__
var es = require('event-stream');

// __Private Module Members__
function addUserStream () {
  var streams = [];
  return function (stream) {
    if (stream) return streams.push(stream);
    if (streams.length > 0) return es.pipeline.apply(es, streams);
    return es.through();
  }
}

// __Module Definition__
var decorator = module.exports = function () {
  this.request(function (request, response, next) {
    request.baucis.incoming = addUserStream();
    request.baucis.outgoing = addUserStream();
    next();
  });
};
