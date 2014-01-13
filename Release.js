// __Dependencies__
var url = require('url');
var deco = require('deco');
var express = require('express');

// __Module Definition__
var Release = module.exports = deco(function (options) {
  var release = this;

  if (!options.controllers) throw new Error('There are no controllers in release "' + options.release + '".');
  if (options.controllers.length === 0) throw new Error('There are no controllers in release "' + options.release + '".');

  // Mount all published controllers for this version.
  options.controllers.forEach(function (controller) {
    var route = url.resolve('/', controller.get('plural'));
    release.use(route, controller);
  });
});

Release.inherit(express);
Release.decorators(deco.builtin.setOptions);
