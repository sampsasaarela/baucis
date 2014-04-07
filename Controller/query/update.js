// __Dependencies__
var express = require('express');
var util = require('util');
var es = require('event-stream');
var errors = require('../../errors');

// __Private Module Members__
var validOperators = [ '$set', '$push', '$pull' ];

// __Module Definition__
var decorator = module.exports = function () {
  // If there's a body, send it through any user-added streams.
  this.query('instance', 'put', function (request, response, next) {
    var parser;
    var incoming;

    // Check if the body was parsed by some external middleware e.g. `express.json`.
    // If so, create a one-document stream from the parsed body.
    if (request.body) {
      incoming = es.readArray([ request.body ]);
    }
    // Otherwise, stream and parse the request.
    else {
      parser = request.baucis.api.parser(request.get('content-type'));
      if (!parser) return next(errors.UnsupportedMediaType());
      incoming = es.pipeline(request, parser);
    }

    var pipes = es.pipeline(
      // Read in the request body as a JSON stream.
      incoming,
      // Pipe through user streams, if any.
      request.baucis.incoming(),
      // Update the request body with updated documents and continue.
      es.writeArray(function (error, documents) {
        if (error) return next(error);
        if (documents.length !== 1) {
          return next(errors.BadRequest('The request body must contain exactly one update document'));
        }
        request.body = documents[0];
        next();
      })
    );

    pipes.on('error', next);
  });

  this.query('instance', 'put', function (request, response, next) {
    var bodyId = request.body[request.baucis.controller.get('findBy')];
    if (bodyId && request.params.id !== bodyId) {
      return next(errors.BadRequest("The ID of the update document did not match the URL's document ID"));
    }
    next();
  });

  // Locking pre-check
  this.query('instance', 'put', function (request, response, next) {
    if (!request.baucis.controller.get('locking')) return next();

    var versionKey = request.baucis.controller.get('schema').get('versionKey');
    var updateVersion = request.body[versionKey] !== undefined ? Number(request.body[versionKey]) : null;

    if (!Number.isFinite(updateVersion)) {
      return next(errors.BadRequest('Locking is enabled, so the target version must be provided in the request body using path "%s"', versionKey));
    }
    next();
  });

  // PUT with non-default operator
  this.query('instance', 'put', function (request, response, next) {
    var operator = request.headers['x-baucis-update-operator'];
    if (!operator) return next();

    if (validOperators.indexOf(operator) === -1) {
      return next(errors.BadRequest('The requested update operator "%s" is not supported', operator));
    }
    // Ensure that some paths have been enabled for the operator.
    if (!request.baucis.controller.get('allow ' + operator)) {
      return next(errors.Forbidden('The requested update operator "%s" is not enabled for this resource', operator));
    }
    // Make sure paths have been whitelisted for this operator.
    if (request.baucis.controller.checkBadUpdateOperatorPaths(operator, Object.keys(request.body))) {
      return next(errors.Forbidden('This update path is forbidden for the requested update operator "%s"', operator));
    }
    next();
  });

  // Default operator
  this.query('instance', 'put', function (request, response, next) {
    var operator = request.headers['x-baucis-update-operator'];
    if (operator) return next();

    var Model = request.baucis.controller.get('model');

    Model.findOne(request.baucis.conditions, function (error, doc) {
      if (error) return next(error);
      if (!doc) return next(errors.NotFound());

      var update = request.body;
      var lock = request.baucis.controller.get('locking') === true;
      var versionKey = request.baucis.controller.get('schema').get('versionKey');
      var updateVersion = request.body[versionKey] !== undefined ? Number(request.body[versionKey]) : null;

      if (lock) {
        // Make sure the version key was selected.
        if (!doc.isSelected(versionKey)) {
          // TODO autofix for the user?
          return next(errors.BadRequest('The version key "%s" must be selected', versionKey));
        }
        // Update and current version have been found.  Check if they're equal.
        if (updateVersion !== doc[versionKey]) return next(errors.LockConflict());
        // One is not allowed to set __v and increment in the same update.
        delete update[versionKey];
        doc.increment();
      }

      doc.set(update);
      doc.save(next);
    });
  });

  // Non-default operator
  this.query('instance', 'put', function (request, response, next) {
    var operator = request.headers['x-baucis-update-operator'];
    if (!operator) return next();

    var lock = request.baucis.controller.get('locking') === true;
    var versionKey = request.baucis.controller.get('schema').get('versionKey');
    var updateVersion = request.body[versionKey] !== undefined ? Number(request.body[versionKey]) : null;
    var Model = request.baucis.controller.get('model');
    var wrapper = {};

    wrapper[operator] = request.body;
    if (lock) request.baucis.conditions[versionKey] = updateVersion;

    // Update the doc using the supplied operator and bypassing validation.
    Model.update(request.baucis.conditions, wrapper, next);
  });
};
