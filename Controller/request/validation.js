// __Dependencies__
var BaucisError = require('../../BaucisError');

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  // Validate URL's ID parameter, if any.
  controller.request(function (request, response, next) {
    var id = request.params.id;
    var check = ['ObjectID', 'Number'];
    var instance = controller.schema().path(controller.findBy()).instance;

    if (!id) return next();
    if (check.indexOf(instance) === -1) return next();
    if (instance === 'ObjectID' && id.match(/^[a-f0-9]{24}$/i)) return next();
    if (instance === 'Number' && !isNaN(Number(id))) return next();

    next(BaucisError.BadRequest('The requested document ID "%s" is not a valid document ID', id));
  });

  // Check that the HTTP method has not been disabled for this controller.
  controller.request(function (request, response, next) {
    var method = request.method === 'DELETE' ? 'del' : request.method.toLowerCase();
    if (controller.methods(method) !== false) return next();
    next(BaucisError.MethodNotAllowed('The requested method has been disabled for this resource'));
  });

  // Treat the addressed document as a collection, and push the addressed object
  // to it.  (Not implemented.)
  controller.request('instance', 'post', function (request, response, next) {
    return next(BaucisError.NotImplemented('Cannot POST to an instance'));
  });

  // Update all given docs.  (Not implemented.)
  controller.request('collection', 'put', function (request, response, next) {
    return next(BaucisError.NotImplemented('Cannot PUT to the collection'));
  });
};
