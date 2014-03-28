// __Dependencies__
var url = require('url');
var deco = require('deco');
var express = require('express');
var mongoose = require('mongoose');
var semver = require('semver');
var es = require('event-stream');
var errors = require('./errors');
var Controller = require('./Controller');
var Release = require('./Release');

// __Private Module Members__

var formatters = {};

function getMatchingReleases (releases, range) {
  var matching = releases.filter(function (release) {
    return semver.satisfies(release, range);
  });

  return matching;
}

// Default formatter — emit a single JSON object or an array of them.
function singleOrArray (alwaysArray) {
  var first = false;
  var multiple = false;

  return es.through(
    function (doc) {
      // Start building the output.  If this is the first document,
      // store it for a moment.
      if (!first) {
        first = doc;
        return;
      }
      // If this is the second document, output array opening and the two documents
      // separated by a comma.
      if (!multiple) {
        multiple = true;
        this.emit('data', '[');
        this.emit('data', JSON.stringify(first));
        this.emit('data', ',\n')
        this.emit('data', JSON.stringify(doc));
        return;
      }
      // For all documents after the second, emit a comma preceding the document.
      this.emit('data', ',\n');
      this.emit('data', JSON.stringify(doc));
    },
    function () {
      // If no documents, simply end the stream.
      if (!first) return this.emit('end');
      // If only one document emit it unwrapped, unless always returning an array.
      if (!multiple && alwaysArray) this.emit('data', '[');
      if (!multiple) this.emit('data', JSON.stringify(first));
      // For greater than one document, emit the closing array.
      else this.emit('data', ']');
      if (!multiple && alwaysArray) this.emit('data', ']');
      // Done.  End the stream.
      this.emit('end');
    }
  );
};

// __Module Definition__
var Api = module.exports = deco(function (options) {
  var api = this;

  // __Private Instance Members__
  // Store controllers, keyed on API semver version range the controllers satisfy.
  var controllersFor = {};

  function checkReleaseConflict (releases, controller) {
    var range = controller.get('versions');

    var matchingReleases = getMatchingReleases(releases, range);
    if (matchingReleases.length === 0) throw errors.Configuration("The controller version range \"" + range + "\" doesn't satisfy any API release.");

    // Find overlapping ranges.  A range overlaps if it shares any API release
    // versions with another range.
    var overlapping = Object.keys(controllersFor).filter(function (range) {
      var otherMatching = getMatchingReleases(releases, range);
      return matchingReleases.some(function (release) {
        return otherMatching.indexOf(release) !== -1;
      });
    });
    // Check that the controller does not already exist in any matching ranges.
    var ok = overlapping.every(function (range) {
      return controllersFor[range].every(function (otherController) {
        if (controller === otherController) return true;
        if (controller.get('plural') === otherController.get('plural')) throw errors.Configuration('Controller "' + controller.get('plural') + '" exists more than once in a release.');
        return controller.get('plural') !== otherController.get('plural');
      });
    });

    return !ok;
  }

  // __Public Instance Methods__

  api.initialize = function () {
    // Sort from highest to lowest release.
    var releases = api.get('releases');
    var releaseControllers;
    var controllersForRelease = {};

    if (!releases.every(semver.valid.bind(semver))) throw errors.Configuration('Invalid semver API release version.');

    // Ensure all controllers satisfy some version range.
    Object.keys(controllersFor).forEach(function (range) {
      var controllers = controllersFor[range];
      controllers.forEach(checkReleaseConflict.bind(undefined, releases));
    });

    // Match controllers to release versions.
    releases.forEach(function (release) {
      controllersForRelease[release] = [];

      Object.keys(controllersFor).forEach(function (range) {
        if (!semver.satisfies(release, range)) return;
        controllersForRelease[release] = controllersForRelease[release].concat(controllersFor[range]);
      });
    });

    // Build the version controller for each release, and sort them high to low.
    releaseControllers = releases.sort(semver.rcompare).map(function (release) {
      return Release({
        release: release,
        controllers: controllersForRelease[release]
      });
    });

    // Add a middleware chain that checks the version requested and uses the
    // highest version middleware that matches the requested range.
    releaseControllers.forEach(function (releaseController) {
      api.use(function (request, response, next) {
        // Check if this controller satisfies the requested version range.
        var range = request.headers['api-version'] || '*';
        var release = releaseController.get('release');
        var satisfied = semver.satisfies(release, range);

        // Short-circuit this release if the version doesn't satisfy the version range.
        if (!satisfied) return next();
        // Otherwise, let the request fall through to this version's middleware.
        response.set('API-Version', release);
        response.set('Vary', 'API-Version')
        return releaseController(request, response, next);
      });
    });

    // Error checking
    api.use(function (error, request, response, next) {
      if (!error) return next();

      // Always set status when possible.
      if (error instanceof errors.BadRequest) response.status(400);
      else if (error instanceof errors.Deprecated) response.status(400);
      else if (error instanceof errors.Forbidden) response.status(403);
      else if (error instanceof errors.NotFound) response.status(404);
      else if (error instanceof errors.MethodNotAllowed) response.status(405);
      else if (error instanceof errors.LockConflict) response.status(409);
      else if (error instanceof mongoose.Error.VersionError) response.status(409);
      else if (error instanceof mongoose.Error.ValidationError) response.status(422);
      else return next(error);

      // Handle some errors.
      if (error instanceof mongoose.Error.ValidationError) return response.json(error.errors);

      // Pass the rest on.
      next(error);
    });
  };

  api.rest = function (options) {
    var controller = Controller(options);
    var range = controller.get('versions');
    if (!semver.validRange(range)) throw errors.Configuration('Controller version range was not a valid semver range.');
    controller.set('api', api);
    // Create an array for this range if it hasn't been registered yet.
    if (!controllersFor[range]) controllersFor[range] = [];
    // Add the controller to the controllers to be published.
    controllersFor[range].push(controller);
    return controller;
  };

  api.formatters = function (response, callback) {
    var handlers = {};
    Object.keys(formatters).map(function (mime) {
      handlers[mime] = formatters['json'](callback);
    });
    response.format(handlers);
  };

  // Adds a formatter for the given mime type.  Needs a function that returns a stream.
  api.setFormatter = function (mime, f) {
    formatters[mime] = function (callback) { return function () { callback(null, f) } };
  };

  api.setFormatter('json', singleOrArray);
});

Api.factory(express);
Api.defaults({ releases: [ '0.0.1' ] });
Api.decorators(deco.builtin.setOptions);
