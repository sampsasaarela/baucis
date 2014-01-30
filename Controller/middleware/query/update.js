// __Dependencies__
var express = require('express');
var errors = require('../../../errors');

// __Private Module Members__
var validOperators = [ '$set', '$push', '$pull' ];

// __Module Definition__
var decorator = module.exports = function () {
  this.query('instance', 'put', express.json());

  this.query('instance', 'put', function (request, response, next) {
    var bodyId = request.body[request.baucis.controller.get('findBy')];
    if (bodyId && request.params.id !== bodyId) return next(errors.BadRequest('ID mismatch'));
    next();
  });

  // Locking pre-check
  this.query('instance', 'put', function (request, response, next) {
    if (!request.baucis.controller.get('locking')) return next();

    var versionKey = request.baucis.controller.get('schema').get('versionKey');
    var updateVersion = request.body[versionKey] !== undefined ? Number(request.body[versionKey]) : null;

    if (!Number.isFinite(updateVersion)) return next(errors.BadRequest('Must supply update version when locking is enabled.'));
    next();
  });

  // PUT with non-default operator
  this.query('instance', 'put', function (request, response, next) {
    var operator = request.headers['x-baucis-update-operator'];
    if (!operator) return next();

    if (validOperators.indexOf(operator) === -1) return next(errors.BadRequest('Unsupported update operator: ' + operator));
    // Ensure that some paths have been enabled for the operator.
    if (!request.baucis.controller.get('allow ' + operator)) return next(errors.Forbidden('Update operator not enabled for this controller: ' + operator));
    // Make sure paths have been whitelisted for this operator.
    if (request.baucis.controller.checkBadUpdateOperatorPaths(operator, Object.keys(request.body))) {
      return next(errors.Forbidden("Can't use update operator with non-whitelisted paths."));
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
        if (!doc.isSelected(versionKey)) return next(errors.BadRequest('Version key "'+ versionKey + '" was not selected.'));
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

    // TODO could validation be run by reloading the doc after update and running `validate`?
    // TODO could even set back to the old data possibly if validate failed... maybe

    // Update the doc using the supplied operator and bypassing validation.
    Model.update(request.baucis.conditions, wrapper, next);
  });
};
