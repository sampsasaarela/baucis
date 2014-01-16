// __Dependencies__
var errors = require('../../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  // Retrieve header for the addressed document
  this.query(false, 'instance', 'head', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    request.baucis.noBody = true;
    request.baucis.query = Model.findOne(request.baucis.controller.getFindByConditions(request));
    next();
  });

  // Retrieve the addressed document
  this.query(false, 'instance', 'get', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    request.baucis.query = Model.findOne(request.baucis.controller.getFindByConditions(request));
    next();
  });

  // Treat the addressed document as a collection, and push
  // the addressed object to it.
  this.query(true, 'instance', 'post', function (request, response, next) {
    return next(errors.MethodNotAllowed('Cannot POST to an instance.'));
  });

  // Update the addressed document
  this.query(false, 'instance', 'put', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    var bodyId = request.body[request.baucis.controller.get('findBy')];

    if (bodyId && request.params.id !== bodyId) return next(errors.BadRequest('ID mismatch'));

    request.baucis.updateWithBody = true;
    request.baucis.query = Model.findOne(request.baucis.controller.getFindByConditions(request));
    next();
  });

  // Delete the addressed object
  this.query(false, 'instance', 'del', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    request.baucis.query = Model.findOne(request.baucis.controller.getFindByConditions(request));
    next();
  });

  // Retrieve documents matching conditions
  this.query(false, 'collection', 'head', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    request.baucis.noBody = true;
    request.baucis.query = Model.find(request.baucis.conditions);
    next();
  });

  // Retrieve documents matching conditions
  this.query(false, 'collection', 'get', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    request.baucis.query = Model.find(request.baucis.conditions);
    next();
  });

  // Update all given docs ...
  this.query(true, 'collection', 'put', function (request, response, next) {
    return next(errors.MethodNotAllowed('Cannot PUT to the collection.'));
  });

  // Delete all documents matching conditions
  this.query(false, 'collection', 'del', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    request.baucis.query = Model.find(request.baucis.conditions);
    next();
  });
};
