// __Dependencies__
var errors = require('../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  // Validate URL's ID parameter, if any.
  controller.request(function (request, response, next) {
    var findBy = request.baucis.controller.get('findBy');
    var id = request.params.id;
    var findByPath = request.baucis.controller.get('schema').path(findBy);
    var check = ['ObjectID', 'Number'];
    var instance = findByPath.instance;

    if (!id) return next();
    if (check.indexOf(instance) === -1) return next();
    if (instance === 'ObjectID' && id.match(/^[a-f0-9]{24}$/i)) return next();
    if (instance === 'Number' && !isNaN(Number(id))) return next();

    next(errors.BadRequest('The requested document ID "%s" is not a valid document ID', id));
  });

  // Check that the HTTP method has not been disabled for this controller.
  this.request(function (request, response, next) {
    var method = request.method === 'DELETE' ? 'del' : request.method.toLowerCase();
    if (request.baucis.controller.get(method) !== false) return next();
    next(errors.MethodNotAllowed('The requested method has been disabled for this resource'));
  });

  // Treat the addressed document as a collection, and push the addressed object
  // to it.  (Not implemented.)
  this.request('instance', 'post', function (request, response, next) {
    return next(errors.NotImplemented('Cannot POST to an instance'));
  });

  // Update all given docs.  (Not implemented.)
  this.request('collection', 'put', function (request, response, next) {
    return next(errors.NotImplemented('Cannot PUT to the collection'));
  });
};
