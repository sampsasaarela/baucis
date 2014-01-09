// __Dependencies__
var url = require('url');
var util = require('util');
var express = require('express');
var connect = require('connect');

// __Private Module Members__

// Figure out the basePath for Swagger API definition
function getBase (request, extra) {
  var parts = request.originalUrl.split('/');
  // Remove extra path parts.
  parts.splice(-extra, extra);
  return request.protocol + '://' + request.headers.host + parts.join('/');
}

// A method for generating a Swagger resource listing
function generateResourceListing (options) {
  var plurals = options.controllers.map(function (controller) {
    return controller.get('plural');
  });
  var listing = {
    apiVersion: options.version,
    swaggerVersion: '1.1',
    basePath: options.basePath,
    apis: plurals.map(function (plural) {
      return { path: '/api-docs/' + plural, description: 'Operations about ' + plural + '.' };
    })
  };

  return listing;
}

// __Module Definition__

var Release = module.exports = function Release (options) {
  var release = express();

  options = connect.utils.merge({}, options);

  if (!options.controllers) throw new Error('There are no controllers in release "' + options.release + '".');
  if (options.controllers.length === 0) throw new Error('There are no controllers in release "' + options.release + '".');

  release.set('release', options.release);

  // Activate Swagger resource listing.
  release.get('/api-docs', function (request, response, next) {
    // TODO if (options.swagger !== true) return next();

    response.set('X-Powered-By', 'Baucis');
    response.json(generateResourceListing({
      version: options.release,
      controllers: options.controllers,
      basePath: getBase(request, 1)
    }));
  });

  // Mount all published controllers for this version.
  options.controllers.forEach(function (controller) {
    var route = url.resolve('/', controller.get('plural'));

    // Add a route for the controller's Swagger API definition.
    release.get('/api-docs' + route, function (request, response, next) {
      // TODO  if (app.get('swagger') !== true) return next();

      response.set('X-Powered-By', 'Baucis');
      response.json({
        apiVersion: options.release,
        swaggerVersion: '1.1',
        basePath: getBase(request, 2),
        resourcePath: route,
        apis: controller.swagger.apis,
        models: controller.swagger.models
      });
    });

    // Mount the controller to the version controller.
    release.use(route, controller);
  });

  return release;
};

util.inherits(Release, express);
