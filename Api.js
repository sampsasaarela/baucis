// __Dependencies__
var url = require('url');
var deco = require('deco');
var express = require('express');
var mongoose = require('mongoose');
var semver = require('semver');
var errors = require('./errors');
var Controller = require('./Controller');
var Release = require('./Release');

// __Private Module Members__

function getMatchingReleases (releases, range) {
  var matching = releases.filter(function (release) {
    return semver.satisfies(release, range);
  });

  return matching;
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

      // // TODO provide more info when possible
      // TODO // if (api.get('handle errors') === false) return next(error);

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
    // Create an array for this range if it hasn't been registered yet.
    if (!controllersFor[range]) controllersFor[range] = [];
    // Add the controller to the controllers to be published.
    controllersFor[range].push(controller);
    return controller;
  };
});

Api.factory(express);
Api.defaults({ releases: [ '0.0.1' ] });
Api.decorators(deco.builtin.setOptions);
