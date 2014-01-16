// __Dependencies__
var async = require('async');
var deco = require('deco');
var errors = require('../../../errors');

// __Private Module Members__
var validOperators = [ '$set', '$push', '$pull' ];

// __Module Definition__
var decorator = module.exports = function () {
  // Get the count for HEAD requests.
  this.documents(false, 'head', function (request, response, next) {
    request.baucis.count = true;
    request.baucis.query.exec(function (error, documents) {
      if (error) return next(error);
      request.baucis.documents = documents;
      next();
    });
  });

  // Execute the find query for GET.
  this.documents(false, 'get', function (request, response, next) {
    request.baucis.query.exec(function (error, documents) {
      if (error) return next(error);
      request.baucis.documents = documents;
      next();
    });
  });

  // Execute the remove query for DELETE.
  this.documents(false, 'del', function (request, response, next) {
    request.baucis.query.exec(function (error, documents) {
      if (error) return next(error);
      if (!documents) return next(errors.NotFound('Could not find the document to be deleted.'));

      // Make it an array if it wasn't already
      var tasks = [].concat(documents).map(function (doc) {
        return doc.remove.bind(doc);
      });

      async.parallel(tasks, function (error, removed) {
        if (error) return next(error);
        request.baucis.documents = removed.length;
        next();
      });

    });
  });

  // Create the documents for a POST request.
  this.documents(false, 'collection', 'post', function (request, response, next) {
    var saved = [];
    var documents = request.body;
    var Model = request.baucis.controller.get('model');

    // Must be an object or array
    if (!documents || typeof documents !== 'object') {
      return next(errors.Forbidden('Must supply a document or array to POST.'));
    }

    // Make it an array if it wasn't already
    documents = [].concat(documents);

    // No empty arrays
    if (documents.length === 0) return next(errors.Forbidden('Array was empty.'));

    response.status(201);

    async.map(
      documents,
      function (doc, callback) {
        var created = new Model();
        created.set(doc);
        created.save(callback);
      },
      function (error, saved) {
        if (error) return next(error);

        var ids = [].concat(saved).map(function (doc) { return doc._id });
        var query = Model.find({ _id: { $in: ids } });
        var selected = { // TODO move to request.baucis i.e. set elsewhere
          controller: request.baucis.controller.get('select'),
          query: request.query.select
        };

        if (selected.controller) query.select(selected.controller);
        if (selected.query) query.select(selected.query);

        // Reload models and apply select options
        query.exec(function (error, reloaded) {
          if (error) return next(error);
          request.baucis.documents = reloaded.length === 1 ? reloaded[0] : reloaded;
          next();
        });
      }
    );
  });

  // Update the documents specified for a PUT request.
  this.documents(false, 'instance', 'put', function (request, response, next) {
    var operator = request.headers['x-baucis-update-operator'];
    var conditions;
    var updateWrapper = {};
    var update = deco.merge(request.body);
    var versionKey = request.baucis.controller.get('schema').get('versionKey');
    var lock = request.baucis.controller.get('locking') === true;
    var updateVersion = update[versionKey] !== undefined ? Number(update[versionKey]) : null;
    var done = function (error, saved) {
      if (error) return next(error);
      if (!saved) return next(errors.NotFound('Could not find the document to update.'));
      request.baucis.documents = saved;
      next();
    };

    if (lock && !Number.isFinite(updateVersion)) return next(errors.BadRequest('Must supply update version when locking is enabled.'));

    // Save with non-default operator
    if (operator) {
      if (validOperators.indexOf(operator) === -1) return next(errors.BadRequest('Unsupported update operator: ' + operator));
      // Ensure that some paths have been enabled for the operator.
      if (!request.baucis.controller.get('allow ' + operator)) return next(errors.Forbidden('Update operator not enabled for this controller: ' + operator));
      // Make sure paths have been whitelisted for this operator.
      if (request.baucis.controller.checkBadUpdateOperatorPaths(operator, Object.keys(update))) {
        return next(errors.Forbidden("Can't use update operator with non-whitelisted paths."));
      }

      conditions = request.baucis.controller.getFindByConditions(request);
      if (lock) conditions[versionKey] = updateVersion;
      updateWrapper[operator] = update;
      request.baucis.controller.get('model').findOneAndUpdate(conditions, updateWrapper, done);
      return;
    }

    // Default update operator with `doc.save`.
    request.baucis.query.exec(function (error, doc) {
      if (error) return next(error);
      if (!doc) return next(errors.NotFound('Could not find the document to update.'));

      var currentVersion = doc[versionKey];

      if (lock) {
        // Make sure the version key was selected.
        if (!doc.isSelected(versionKey)) return next(errors.BadRequest('Version key "'+ versionKey + '" was not selected.'));
        // Update and current version have been found.
        // Check if they're equal.
        if (updateVersion !== currentVersion) return next(errors.LockConflict('The version of the document to update did not match.'));
        // One is not allowed to set __v and increment in the same update.
        delete update[versionKey];
        doc.increment();
      }

      doc.set(update);
      doc.save(done);
    });
  });
};
