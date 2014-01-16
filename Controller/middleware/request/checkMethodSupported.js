// __Dependencies__
var errors = require('../../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  this.request(true, function (request, response, next) {
    var method = request.method === 'DELETE' ? 'del' : request.method.toLowerCase();
    if (request.baucis.controller.get(method) !== false) return next();
    next(errors.MethodNotAllowed('The requested method has been disabled for this resource.'));
  });
};
