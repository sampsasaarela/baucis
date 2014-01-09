// __Dependencies__
var url = require('url');
var util = require('util');
var express = require('express');
var connect = require('connect');
var semver = require('semver');
var Controller = require('../Controller');
var Release = require('../Release');

// __Private Module Members__

// Figure out the basePath for Swagger API definition
function getBase (request, extra) {
  var parts = request.originalUrl.split('/');
  // Remove extra path parts.
  parts.splice(-extra, extra);
  return request.protocol + '://' + request.headers.host + parts.join('/');
}

function getMatchingReleases (releases, dependency) {
  var matching = releases.filter(function (release) {
    return semver.satisfies(release, dependency);
  });

  return matching;
}

// __Module Definition__
var Api = module.exports = function Api (options) {
  options = connect.utils.merge({
    releases: [ '0.0.1' ]
  }, options);

  if (!options.releases.every(function (release) { return semver.valid(release) })) throw new Error('Invalid semver API release version.');

  var api = express();

  // __Private Instance Members__
  // Store controllers, keyed on API semver dependency the controllers satisfy.
  var controllersFor = {};

  function register (controller) {
    // The controller's semver range
    var range = controller.get('versions');
    if (!semver.validRange(range)) throw new Error('Controller dependency was not a valid semver range.');
    // Create an array for this range if it hasn't been registered yet.
    if (!controllersFor[range]) controllersFor[range] = [];
    // Add the controller to the controllers to be published.
    controllersFor[range].push(controller);
    return controller;
  }

  function checkReleaseConflict (releases, controller) {
    var range = controller.get('versions');

    var matchingReleases = getMatchingReleases(releases, range);
    if (matchingReleases.length === 0) throw new Error("The controller version range \"" + range + "\" doesn't satisfy any API release.");

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
        if (controller.get('plural') === otherController.get('plural')) throw new Error('Controller "' + controller.get('plural') + '" exists more than once in a release.');
        return controller.get('plural') !== otherController.get('plural');
      });
    });

    return !ok;
  }

  // Set options on the api.
  Object.keys(options).forEach(function (key) {
    api.set(key, options[key]);
  });

  // __Public Instance Methods__

  api.initialize = function () {
    // Sort from highest to lowest release.
    var releases = api.get('releases');
    var releaseControllers;
    var controllersForRelease = {};

    // Ensure all controllers satisfy some dependency.
    Object.keys(controllersFor).forEach(function (dependency) {
      var controllers = controllersFor[dependency];
      controllers.forEach(checkReleaseConflict.bind(undefined, releases));
    });

    // Match controllers to release versions.
    releases.forEach(function (release) {
      controllersForRelease[release] = [];

      Object.keys(controllersFor).forEach(function (dependency) {
        if (!semver.satisfies(release, dependency)) return;
        controllersForRelease[release] = controllersForRelease[release].concat(controllersFor[dependency]);
      });
    });

    // Build the version controller for each release, and sort them high to low.
    releaseControllers = releases.sort(semver.rcompare).map(function (release) {
      return Release({ release: release, controllers: controllersForRelease[release] });
    });

    // Add a middleware chain that checks the version requested and uses the
    // highest version middleware that matches the requested range.
    releaseControllers.forEach(function (releaseController) {
      api.use(function (request, response, next) {
        // Check if this controller satisfies the requested dependency.
        var range = request.headers['api-version'] || '*';
        var release = releaseController.get('release');
        var satisfied = semver.satisfies(release, range);
        console.log('Checking release %s against %s.', release, range);

        // Short-circuit this release if the version doesn't satisfy the dependency.
        if (!satisfied) return next();
        console.log('Found release.')
        // Otherwise, let the request fall through to this version's middleware.
        response.set('API-Version', release);
        response.set('Vary', 'API-Version')
        return releaseController(request, response, next);
      });
    });
  };

  api.rest = function (options) {
    var controller = Controller(options);
    // Don't publish it automatically if it's private.
    if (options.publish === false) return controller;
    return register(controller);
  };

  return api;
};

util.inherits(Api, express);
