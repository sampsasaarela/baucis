// __Dependencies__
var errors = require('../../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  // Build the "Allow" response header
  this.request(true, function (request, response, next) {
    // Controller Options
    if (request.baucis.controller.get('restrict')) return next(errors.Deprecated('The "restrict" controller option is deprecated.  Use query middleware instead.'));
    // Headers
    if (request.headers['x-baucis-push']) return next(errors.Deprecated('The "X-Baucis-Push header" is deprecated.  Use "X-Baucis-Update-Operator: $push" instead.'));
    // No deprecated features found.
    next();
  });
};
