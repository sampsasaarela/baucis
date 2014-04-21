// __Dependencies__
var express = require('express');
var util = require('util');
var es = require('event-stream');
var errors = require('../../errors');

// __Private Module Members__
var validOperators = [ '$set', '$push', '$pull' ];

// __Module Definition__
var decorator = module.exports = function (options, protect) {
  var controller = this;
  // If there's a body, send it through any user-added streams.
  controller.query('instance', 'put', function (request, response, next) {
    var parser;
    var count = 0;
    var operator = request.headers['x-baucis-update-operator'];
    var pipeline = protect.pipeline();
    // Check if the body was parsed by some external middleware e.g. `express.json`.
    // If so, create a one-document stream from the parsed body.
    if (request.body) {
      pipeline(es.readArray([ request.body ]));
    }
    // Otherwise, stream and parse the request.
    else {
      parser = request.baucis.api.parser(request.get('content-type'));
      if (!parser) return next(errors.UnsupportedMediaType());
      pipeline(request);
      pipeline(parser);
    }
    // Pipe through user streams, if any.
    pipeline(request.baucis.incoming());
    // If the document ID is present, ensure it matches the ID in the URL.
    pipeline(function (body, callback) {
      var findBy = request.baucis.controller.get('findBy');
      var bodyId = body[findBy];
      if (bodyId === undefined) return callback(null, body);
      if (bodyId === request.params.id) return callback(null, body);
      callback(errors.BadRequest("The ID of the update document did not match the URL's document ID"));
    });
    // Ensure the request includes a finite object version if locking is enabled.
    pipeline(function (body, callback) {
      if (!controller.get('locking')) return callback(null, body);

      var versionKey = request.baucis.controller.get('schema').get('versionKey');
      var updateVersion = body[versionKey];

      if (updateVersion === undefined || !Number.isFinite(Number(updateVersion))) {
        return callback(errors.BadRequest('Locking is enabled, so the target version must be provided in the request body using path "%s"', versionKey));
      }
      callback(null, body);
    });
    // Ensure there is exactly one update document.
    pipeline(es.through(
      function (body) {
        count += 1;
        console.log('CONT: %s', count)
        if (count === 2) {
          next(errors.BadRequest('The request body contained more than one update document'));
          return;
        }
        if (count > 1) return;

        this.emit('data', body);
      },
      function () {
        if (count === 0) {
          next(errors.BadRequest('The request body did not contain an update document'));
        }
      }
    ));
    // Default update operator.
    if (!operator) {
      pipeline(function (body, callback) {
        var Model = request.baucis.controller.get('model');

        Model.findOne(request.baucis.conditions, function (error, doc) {
          if (error) return next(error);
          if (!doc) return next(errors.NotFound());

          // TODO here

          var lock = request.baucis.controller.get('locking') === true;
          var versionKey = request.baucis.controller.get('schema').get('versionKey');
          var updateVersion = body[versionKey] !== undefined ? Number(body[versionKey]) : null;

          if (lock) {
            // Make sure the version key was selected.
            if (!doc.isSelected(versionKey)) {
              // TODO autofix for the user?
              return next(errors.BadRequest('The version key "%s" must be selected', versionKey));
            }
            // Update and current version have been found.  Check if they're equal.
            if (updateVersion !== doc[versionKey]) return next(errors.LockConflict());
            // One is not allowed to set __v and increment in the same update.
            delete body[versionKey];
            doc.increment();
          }

          doc.set(body);
          doc.save(next);
        });
      });
    }
    // Non-default update operator (bypasses validation).
    else {
      pipeline(function (body, callback) {
        var lock = request.baucis.controller.get('locking') === true;
        var versionKey = request.baucis.controller.get('schema').get('versionKey');
        var updateVersion = body[versionKey] !== undefined ? Number(body[versionKey]) : null;
        var Model = request.baucis.controller.get('model');
        var wrapper = {};

        if (validOperators.indexOf(operator) === -1) {
          return next(errors.BadRequest('The requested update operator "%s" is not supported', operator));
        }
        // Ensure that some paths have been enabled for the operator.
        if (!request.baucis.controller.get('allow ' + operator)) {
          return next(errors.Forbidden('The requested update operator "%s" is not enabled for this resource', operator));
        }
        // Make sure paths have been whitelisted for this operator.
        if (request.baucis.controller.checkBadUpdateOperatorPaths(operator, Object.keys(body))) {
          return next(errors.Forbidden('This update path is forbidden for the requested update operator "%s"', operator));
        }

        wrapper[operator] = body;
        if (lock) request.baucis.conditions[versionKey] = updateVersion;

        // Update the doc using the supplied operator and bypassing validation.
        Model.update(request.baucis.conditions, wrapper, next);
      });
    }

    var s = pipeline();
    s.on('end', next);
    s.on('error', next);
    s.resume();
  });
};
