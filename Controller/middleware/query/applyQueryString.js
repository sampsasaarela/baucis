// __Dependencies__
var errors = require('../../../errors');

// __Module Definition__
var decorator = module.exports = function () {
  // Apply various options based on request query parameters.
  this.query(false, function (request, response, next) {
    var populate = request.query.populate;
    var hint = request.query.hint;
    var select = request.query.select;
    var count = request.query.count;
    var sort = request.query.sort;
    var skip = request.query.skip;
    var limit = request.query.limit;
    var comment = request.query.comment;
    var error = null;
    var query = request.baucis.query;

    if (sort) query.sort(sort);
    if (skip) query.skip(skip);
    if (limit) query.limit(limit);
    if (count === 'true') request.baucis.count = true;

    if (comment) {
      if (request.baucis.controller.get('allow comments') === true) {
        query.comment(comment);
      }
      else {
        console.warn('Query comment was ignored.');
      }
    }

    if (hint) {
      if (request.baucis.controller.get('allow hints') === true) {
        if (typeof hint === 'string') hint = JSON.parse(hint);
        Object.keys(hint).forEach(function (path) {
          hint[path] = Number(hint[path]);
        });
        query.hint(hint);
      }
      else {
        return next(errors.Forbidden('Hints are not enabled for this resource.'));
      }
    }

    if (select) {
      if (select.indexOf('+') !== -1) {
        return next(errors.Forbidden('Including excluded fields is not permitted.'));
      }
      if (request.baucis.controller.checkBadSelection(select)) {
        return next(errors.Forbidden('Including excluded fields is not permitted.'));
      }
      query.select(select);
    }

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

        query.populate(field);
      });
    }

    next(error);
  });
};
