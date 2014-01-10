// __Dependencies__
var url = require('url');
var util = require('util');
var deco = require('deco');
var express = require('express');
var connect = require('connect');

// __Module Definition__
var Release = module.exports = function Release (options) {
  var release = express();

  options = connect.utils.merge({}, options);

  if (!options.controllers) throw new Error('There are no controllers in release "' + options.release + '".');
  if (options.controllers.length === 0) throw new Error('There are no controllers in release "' + options.release + '".');

  release.set('release', options.release);

  // Mount all published controllers for this version.
  options.controllers.forEach(function (controller) {
    var route = url.resolve('/', controller.get('plural'));
    release.use(route, controller);
  });

  return deco.call(release, Release.decorators, options);
};

util.inherits(Release, express);
Release.decorators = [];
