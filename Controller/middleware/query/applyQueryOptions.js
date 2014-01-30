// __Dependencies__
var errors = require('../../../errors');

// __Module Definition__
var decorator = module.exports = function () {

  // Apply various options based on controller parameters
  this.query(function (request, response, next) {
    var select = request.baucis.controller.get('select');
    if (!select) return next();
    request.baucis.query.select(select);
    next();
  });

  this.query(function (request, response, next) {
    if (request.query.sort) request.baucis.query.sort(request.query.sort);
    next();
  });

  this.query(function (request, response, next) {
    if (request.query.skip) request.baucis.query.skip(request.query.skip);
    next();
  });

  this.query(function (request, response, next) {
    if (request.query.limit) request.baucis.query.limit(request.query.limit);
    next();
  });

  this.query(function (request, response, next) {
    if (request.query.count === 'true') request.baucis.count = true;
    next();
  });

  this.query(function (request, response, next) {
    if (request.query.comment) {
      if (request.baucis.controller.get('allow comments') === true) {
        request.baucis.query.comment(request.query.comment);
      }
      else {
        console.warn('Query comment was ignored.');
      }
    }
    next();
  });

  this.query(function (request, response, next) {
    var hint = request.query.hint;

    if (hint) {
      if (request.baucis.controller.get('allow hints') === true) {
        if (typeof hint === 'string') hint = JSON.parse(hint);
        Object.keys(hint).forEach(function (path) {
          hint[path] = Number(hint[path]);
        });
        request.baucis.query.hint(hint);
      }
      else {
        return next(errors.Forbidden('Hints are not enabled for this resource.'));
      }
    }

    next();
  });

  this.query(function (request, response, next) {
    var select = request.query.select;

    if (select) {
      if (select.indexOf('+') !== -1) {
        return next(errors.Forbidden('Including excluded fields is not permitted.'));
      }
      if (request.baucis.controller.checkBadSelection(select)) {
        return next(errors.Forbidden('Including excluded fields is not permitted.'));
      }
      request.baucis.query.select(select);
    }

    next();
  });

  this.query(function (request, response, next) {
    var populate = request.query.populate;
    var error = null;

    if (populate) {
      if (typeof populate === 'string') {
        if (populate.indexOf('{') !== -1) populate = JSON.parse(populate);
        else if (populate.indexOf('[') !== -1) populate = JSON.parse(populate);
      }

      if (!Array.isArray(populate)) populate = [ populate ];

      populate.forEach(function (field) {
        if (error) return;
        if (request.baucis.controller.checkBadSelection(field.path || field)) {
          return error = errors.Forbidden('Including excluded fields is not permitted.');
        }
        // Don't allow selecting fields from client when populating
        if (field.select) {
          return error = errors.Forbidden('May not set selected fields of populated document.');
        }

        request.baucis.query.populate(field);
      });
    }

    next(error);
  });
};
