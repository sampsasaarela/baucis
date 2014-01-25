// __Dependencies__
var es = require('event-stream');
var JSONStream = require('JSONStream');

// __Module Definition__
var decorator = module.exports = function () {
  this.documents(function (request, response, next) {
    var pipes = [];
    request.baucis.pipe = function (destination) {
      if (destination !== undefined) return pipes.push(destination);
      pipes.unshift(request.baucis.query.stream());
      pipes.push(response);
      var stream = es.pipeline.apply(es, pipes);
      stream.on('error', next);
    };
    next();
  });
};
