// __Dependencies__
var url = require('url');
var deco = require('deco');
var express = require('express');
var errors = require('./errors');

// __Module Definition__
var Release = module.exports = deco(function (options) {
  var release = this;

  if (!options.controllers) throw errors.Configuration('There are no controllers in release "' + options.release + '".');
  if (options.controllers.length === 0) throw errors.Configuration('There are no controllers in release "' + options.release + '".');

  // Mount all published controllers for this version.
  options.controllers.forEach(function (controller) {
    var route = url.resolve('/', controller.get('plural'));
    release.use(route, controller);
  });
});

Release.factory(express);
Release.decorators(deco.builtin.setOptions);
