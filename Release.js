// __Dependencies__
var util = require('util');
var express = require('express');

// __Module Definition__

var Release = module.exports = function Release (options) {
  var release = express();

  if (options.controllers.length === 0) throw new Error('There are no controllers in release "' + release + '".');

  // Activate Swagger resource listing.
  release.get('/api-docs', function (request, response, next) {
    if (app.get('swagger') !== true) return next();

    response.set('X-Powered-By', 'Baucis');
    response.json(generateResourceListing({
      version: options.version,
      controllers: options.controllers,
      basePath: getBase(request, 1)
    }));
  });

  // Mount all published controllers for this version.
  options.controllers.forEach(function (controller) {
    var route = url.resolve('/', controller.get('plural'));

    // Add a route for the controller's Swagger API definition.
    release.get('/api-docs' + route, function (request, response, next) {
      if (app.get('swagger') !== true) return next();

      response.set('X-Powered-By', 'Baucis');
      response.json({
        apiVersion: options.version,
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
};

util.inherits(Release, express);
