// __Dependencies__
var _ = require('highland');
var errors = require('../../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  function addUserStream () {
    var streams = [];
    return function (stream) {
      if (stream) return streams.push(stream);
      var through = _();
      streams.forEach(function (s) {
        through = through.pipe(s);
      });
      return through;
    }
  }

  controller.request(function (request, response, next) {
    request.baucis.incoming = addUserStream();
    request.baucis.outgoing = addUserStream();
    next();
  });
};
