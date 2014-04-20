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
var parsers = {};
var formatters = {};

function getMatchingReleases (releases, range) {
  return releases.filter(function (release) {
    return semver.satisfies(release, range);
  });
}

// __Module Definition__
var Api = module.exports = deco(function (options) {
  var api = this;

  // __Private Instance Members__
  // Store controllers, keyed on API semver version range the controllers satisfy.
  var controllersFor = {};

  function checkReleaseConflict (releases, controller) {
    var range = controller.get('versions');

    var matchingReleases = getMatchingReleases(releases, range);
    if (matchingReleases.length === 0) {
      throw errors.Configuration('The controller version range "%s" doesn\'t satisfy any API release', range);
    }

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
        if (controller.get('plural') === otherController.get('plural')) {
          throw errors.Configuration('Controller "%s" exists more than once in a release', controller.get('plural'));
        }
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

    releases.forEach(function (release) {
      if (semver.valid(release)) return;
      throw errors.Configuration('Release version "%s" is not a valid semver version', release);
    });

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

    // Check the requested API version is valid.
    api.use(function (request, response, next) {
      var range = request.headers['api-version'] || '*';
      if (semver.validRange(range)) return next();
      next(errors.BadRequest('The requested API version range "%s" was not a valid semver range', range));
    });

    // Check for API version unsatisfied and give a 400 if no versions match.
    api.use(function (request, response, next) {
      var range = request.headers['api-version'] || '*';
      var apiVersionMatch = releaseControllers.some(function (releaseController) {
        var release = releaseController.get('release');
        return semver.satisfies(release, range);
      });

      if (apiVersionMatch) return next();
      next(errors.BadRequest('The requested API version range "%s" could not be satisfied', range));
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

    // __Error Handling__

    api.use(function (error, request, response, next) {
      if (!error) return next();
      // Always set status when possible.
      if (error instanceof errors.BaucisError) response.status(error.status);
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
    if (!semver.validRange(range)) {
      throw errors.Configuration('Controller version range "%s" was not a valid semver range', range);
    }
    controller.set('api', api);
    // Create an array for this range if it hasn't been registered yet.
    if (!controllersFor[range]) controllersFor[range] = [];
    // Add the controller to the controllers to be published.
    controllersFor[range].push(controller);
    return controller;
  };

  api.formatters = function (response, callback) {
    var handlers = {
      default: function () {
        callback(errors.NotAcceptable());
      }
    };
    Object.keys(formatters).map(function (mime) {
      handlers[mime] = formatters[mime](callback);
    });
    response.format(handlers);
  };

  // Adds a formatter for the given mime type.  Needs a function that returns a stream.
  api.setFormatter = function (mime, f) {
    formatters[mime] = function (callback) { return function () { callback(null, f) } };
  };

  api.parser = function (mime) {
    // Default to JSON when no MIME type is provided.
    mime = mime || 'application/json';
    // Not interested in any additional parameters at this point.
    mime = mime.split(';')[0].trim();
    var handler = parsers[mime];
    return handler ? handler() : undefined;
  };

  // Adds a parser for the given mime type.  Needs a function that returns a stream.
  api.setParser = function (mime, f) {
    parsers[mime] = f;
  };
});

Api.factory(express);
Api.defaults({ releases: [ '0.0.1' ] });
Api.decorators(deco.builtin.setOptions);
