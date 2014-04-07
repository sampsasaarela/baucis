// __Dependencies__
var es = require('event-stream');
var util = require('util');
var errors = require('../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  var controller = this;

  controller.query('post', function (request, response, next) {
    var Model = request.baucis.controller.get('model');
    var findBy = request.baucis.controller.get('findBy');
    var url = request.originalUrl || request.url;
    var contentType;
    var parser;
    var incoming;
    var pipes;
    // Add trailing slash to URL if needed.
    if (url.lastIndexOf('/') === (url.length - 1)) url = url.slice(0, url.length - 1);
    // Set the status to 201 (Created).
    response.status(201);
    // Check if the body was parsed by some external middleware e.g. `express.json`.
    // If so, create a stream from the POST'd document or documents.
    if (request.body) {
      incoming = es.readArray([].concat(request.body));
    }
    // Otherwise, stream and parse the request.
    else {
      parser = request.baucis.api.parser(request.get('content-type'));
      if (!parser) return next(errors.UnsupportedMediaType());
      incoming = es.pipeline(request, parser);
    }
    // Process the incoming document or documents.
    pipes = es.pipeline(
      incoming,
      request.baucis.incoming(),
      // Map function to create a document from incoming JSON.
      es.map(function (incoming, callback) {
        var doc;
        if (incoming.__t && Model.discriminators) {
          if (!Model.discriminators[incoming.__t]) {
            return callback(errors.BadRequest("A document's type did not match any known discriminators for this resource"));
          }
          doc = new Model.discriminators[incoming.__t];
        }
        else {
          doc = new Model();
        }
        doc.set(incoming);
        callback(null, doc);
      }),
      // Map function to save a document.
      es.map(function (doc, callback) { doc.save(callback) }),
      // Get the unique ID of each created document.
      es.map(function (doc, callback) { callback(null, doc.get(findBy)) }),
      // Write the IDs to an array for later use.
      es.writeArray(function (error, ids) {
        if (error) return next(error);
        // URL location of newly created document or documents.
        var location;
        // Set the conditions used to build `request.baucis.query`.
        var conditions = request.baucis.conditions[findBy] = { $in: ids };
        // Check for at least one document.
        if (ids.length === 0) return next(errors.BadRequest('The request body must contain at least one document'));
        // Set the `Location` header if at least one document was sent.
        if (ids.length === 1) location = url + '/' + ids[0];
        else location = util.format('%s?conditions={ "%s": %s }', url, findBy, JSON.stringify(conditions));
        response.set('Location', location);
        next();
      })
    );

    pipes.on('error', next);
  });
};
