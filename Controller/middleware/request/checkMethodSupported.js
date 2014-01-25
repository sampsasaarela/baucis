// __Dependencies__
var errors = require('../../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  this.request(function (request, response, next) {
    var method = request.method === 'DELETE' ? 'del' : request.method.toLowerCase();
    if (request.baucis.controller.get(method) !== false) return next();
    next(errors.MethodNotAllowed('The requested method has been disabled for this resource.'));
  });

  // Treat the addressed document as a collection, and push
  // the addressed object to it.
  this.request('instance', 'post', function (request, response, next) {
    return next(errors.MethodNotAllowed('Cannot POST to an instance.'));
  });

  // Update or replace all given docs ...
  this.request('collection', 'put', function (request, response, next) {
    return next(errors.MethodNotAllowed('Cannot PUT to the collection.'));
  });
};
