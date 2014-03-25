// __Dependencies__
var _ = require('highland');
var errors = require('../../../errors');

// __Private Module Members__
function addUserStream () {
  var streams = [];
  return function (stream) {
    if (stream) return streams.push(stream);
    var chain = _();
    streams.forEach(function (s) {
      chain = chain.pipe(s);
    });
    return chain;
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
