// __Dependencies__
var _ = require('highland');

// __Private Module Members__
// Genereate a function that will add pipes to an array.  Then, when called
// with no arguments,
function pipeInterface (source, finalize) {
  var pipes = [];
  return function (destination) {
    if (destination !== undefined) return pipes.push(destination);
    pipes.unshift(source());
    pipes.push(finalize);
    var stream = es.pipeline.apply(es, pipes);
    stream.on('error', next);
  };
}

// __Module Definition__
var decorator = module.exports = function () {
  // Middleware to create functions for adding pipes for query and response streams.
  this.request(function (request, response, next) {
    request.baucis.outgoing = pipeInterface(request.baucis.query.stream.bind(request.baucis.query), response);
    request.baucis.incoming = pipeInterface(request, response);
    next();
  });
};
