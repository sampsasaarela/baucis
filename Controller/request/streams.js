// __Dependencies__
var stream = require('stream');
var es = require('event-stream');

// __Module Definition__
var decorator = module.exports = function (options, protect) {
  // __Protected Module Members__
  // A utility method for ordering through streams.
  protect.pipeline = function () {
    var streams = [];
    return function (transmute) {
      // If it's a stream, add it to the reserve pipeline.
      if (transmute && (transmute.writable || transmute.readable)) {
        streams.push(transmute);
        return;
      }
      // If it's a function, create a map stream with it.
      if (transmute) return streams.push(es.map(transmute));
      // If called without arguments, return a pipeline linking all streams.
      if (streams.length > 0) return es.pipeline.apply(es, streams);
      // But, if no streams were added, just pass back a through stream.
      return es.through();
    };
  }
  // __Middleware__
  // Create the pipeline interface the user interacts with.
  this.request(function (request, response, next) {
    request.baucis.incoming = protect.pipeline();
    request.baucis.outgoing = protect.pipeline();
    next();
  });
};
